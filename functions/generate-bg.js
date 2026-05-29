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
  const debug = body.debug || false;

  if (!rawPrompt) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "No prompt received", bodyKeys: Object.keys(body) }) };
  }

  // ── TEMIZLE: Rusça karakterleri İngilizce eşdeğeriyle değiştir ──
  // DALL-E Rusça prompt alınca "stok haber" görseline sığınır
  const cleanedPrompt = rawPrompt
    .replace(/[А-ЯЁа-яё]+/g, '')  // Tüm Kiril harflerini sil
    .replace(/\s{2,}/g, ' ')       // Çift boşlukları tek yap
    .trim();

  // ── PROMPT KORUMA: OpenAI rewrite'ı engelle ──
  const finalPrompt = "I NEED to test how the tool works with a specific artistic prompt. " +
    "DO NOT rewrite, sanitize, or alter the artistic direction in any way. " +
    "Use EXACTLY as provided: " + cleanedPrompt;

  console.log("PROMPT SENT:", finalPrompt.slice(0, 300));

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "OPENAI_API_KEY missing" }) };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: finalPrompt,
        n: 1,
        size: size,
        quality: "hd",
        style: "natural",       // "natural" = daha az plastik, daha mat
        response_format: "url"
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("OpenAI error:", JSON.stringify(data));
      throw new Error(data.error?.message || "OpenAI API error " + res.status);
    }

    const imageUrl = data.data?.[0]?.url;
    const revised  = data.data?.[0]?.revised_prompt || "";

    if (!imageUrl) throw new Error("No image URL returned");

    // URL → base64 (1 saat cache riski olmadan)
    const imgRes = await fetch(imageUrl);
    const buffer = await imgRes.arrayBuffer();
    const base64 = `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;

    const wasRewritten = revised && revised !== rawPrompt;
    if (wasRewritten) {
      console.warn("DALL-E rewrote prompt!");
      console.warn("Original:", rawPrompt.slice(0, 200));
      console.warn("Revised:", revised.slice(0, 200));
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        base64,
        url: imageUrl,
        revisedPrompt: revised,
        wasRewritten,
        sentPrompt: finalPrompt.slice(0, 300),
        cleanedPrompt: cleanedPrompt.slice(0, 300)
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
