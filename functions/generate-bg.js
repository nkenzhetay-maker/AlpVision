const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "{}" };

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const rawPrompt = body.prompt || body.dallePrompt || "";
  // dall-e-2 desteklenen boyutlar: 256x256, 512x512, 1024x1024
  const size = "1024x1024";

  if (!rawPrompt) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "No prompt received", bodyKeys: Object.keys(body) }) };
  }

  // Kiril karakterleri temizle — DALL-E stok görsele kaçar
  const cleanedPrompt = rawPrompt
    .replace(/[А-ЯЁа-яё]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // OpenAI rewrite engelleyici prefix
  const finalPrompt =
    "I NEED to test how the tool works with a specific artistic prompt. " +
    "DO NOT rewrite, sanitize, or alter the artistic direction in any way. " +
    "Use EXACTLY as provided: " + cleanedPrompt;

  console.log("PROMPT SENT:", finalPrompt.slice(0, 300));

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "OPENAI_API_KEY missing" }) };
  }

  // Model: dall-e-2 (hızlı, 3-8 sn, Netlify free tier uyumlu)
  // gpt-image-1 / dall-e-3 Netlify free tier'da 504 timeout veriyor
  const model = "dall-e-2";

  try {
    const reqBody = {
      model: model,
      prompt: finalPrompt,
      n: 1,
      size: size,
      response_format: "b64_json"  // dall-e-2: doğrudan base64 al (URL süresi dolar)
    };

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify(reqBody)
    });

    // 504/HTML response kontrolü
    const contentType = res.headers.get('content-type')||'';
    let data;
    if(contentType.includes('application/json')){
      data = await res.json();
    } else {
      const txt = await res.text();
      throw new Error("OpenAI "+res.status+": HTML response. dall-e-2 timeout? CT:"+contentType.slice(0,30));
    }
    if (!res.ok) {
      console.error("OpenAI error:", JSON.stringify(data));
      throw new Error(data.error?.message || "OpenAI API error " + res.status);
    }

    const item = data.data?.[0] || {};
    const revised = item.revised_prompt || "";
    let base64 = null;
    let imageUrl = null;

    if (item.b64_json) {
      // dall-e-2 response_format=b64_json → doğrudan base64
      base64 = "data:image/png;base64," + item.b64_json;
    } else if (item.url) {
      // Fallback: URL varsa çevir
      imageUrl = item.url;
      const imgRes = await fetch(item.url);
      const buffer = await imgRes.arrayBuffer();
      base64 = "data:image/png;base64," + Buffer.from(buffer).toString("base64");
    } else {
      throw new Error("No image data returned from API");
    }

    const wasRewritten = !!(revised && revised !== rawPrompt);
    if (wasRewritten) {
      console.warn("API rewrote prompt!");
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        base64,
        url: imageUrl,
        revisedPrompt: revised,
        wasRewritten,
        model: model,
        sentPrompt: finalPrompt.slice(0, 300)
      })
    };

  } catch (err) {
    console.error("generate-bg error:", err.message);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message })
    };
  }
};
