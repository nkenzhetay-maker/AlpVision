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

  const { prompt, size = "1792x1024" } = body;
  if (!prompt) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Prompt required" }) };

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: size,           // "1792x1024" for landscape, "1024x1792" for portrait
        quality: "standard",  // "hd" için 2x maliyet — standard yeterli
        response_format: "url"
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "OpenAI API error");

    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) throw new Error("No image URL returned");

    // DALL-E URL'leri 1 saat geçerli — base64'e dönüştür ki frontend'de güvenle kullanılsın
    const imgRes = await fetch(imageUrl);
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        url: imageUrl,
        base64: `data:image/png;base64,${base64}`,
        revisedPrompt: data.data?.[0]?.revised_prompt || prompt
      })
    };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
