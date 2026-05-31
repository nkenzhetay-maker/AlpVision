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
  const size = body.size || "1792x1024";

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

  // Model seçimi: gpt-image-1 (dall-e-3 artık kullanılmıyor)
  const model = "gpt-image-1";

  try {
    const reqBody = {
      model: model,
      prompt: finalPrompt,
      n: 1,
      size: size
      // quality: "high" — gpt-image-1 için opsiyonel, şimdilik kaldırıldı
    };

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify(reqBody)
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("OpenAI error:", JSON.stringify(data));
      throw new Error(data.error?.message || "OpenAI API error " + res.status);
    }

    const item = data.data?.[0] || {};
    const revised = item.revised_prompt || "";
    let base64 = null;
    let imageUrl = null;

    if (item.b64_json) {
      // gpt-image-1 → doğrudan base64
      base64 = "data:image/png;base64," + item.b64_json;
    } else if (item.url) {
      // URL döndü → base64'e çevir
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
