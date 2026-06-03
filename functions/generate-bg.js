const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

// Economist illüstrasyon stil tanımı — referans görseller yerine kelimeyle tarif
const ECONOMIST_STYLE = [
  "flat matte gouache painting",
  "cream off-white solid background #F2F2F0",
  "fine ink outlines on shapes",
  "limited palette 3-4 colors maximum",
  "40 percent negative space",
  "single strong central metaphor",
  "ironic understated mood",
  "no text no letters no numbers no words anywhere",
  "no photorealism no gradients no glows",
  "The Economist magazine cover illustration style",
  "similar to The Economist's editorial cartoons",
  "flat vector-like shapes with slight texture",
  "bold simple composition"
].join(", ");

const TRT_PALETTE = "Use only these colors: off-white #F2F2F0, beige #DCD0BA, charcoal #3A3A3A, near-black #1C1C1C, deep blue #042E58, navy #01203F, cyan #00B6CB, dark green #216125, editorial red #B11731, mustard #C48901";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "{}" };

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const rawPrompt = body.prompt || body.dallePrompt || "";
  const mode      = body.mode || "illustration";
  const size      = "1024x1024";

  if (!rawPrompt) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "No prompt received" }) };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "OPENAI_API_KEY missing" }) };
  }

  // Kiril temizle — DALL-E stok görsele kaçar
  const cleaned = rawPrompt
    .replace(/[А-ЯЁа-яё]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  let finalPrompt, model, reqBody;

  if (mode === "photo") {
    // gpt-image-1 — photo-realistic editorial news photo
    finalPrompt = [
      "High quality editorial news photograph.",
      "Photojournalism style, cinematic lighting.",
      "No text, no watermark, no illustration, no AI-art look.",
      "Realistic DSLR camera quality.",
      "Subject:", cleaned
    ].join(" ");

    model = "gpt-image-1";
    reqBody = { model, prompt: finalPrompt, n: 1, size, quality: "medium" };

  } else {
    // gpt-image-1 — Economist illustration
    finalPrompt = [
      "IMPORTANT: Create an editorial illustration.",
      ECONOMIST_STYLE + ".",
      TRT_PALETTE + ".",
      "STRICTLY NO text, NO letters, NO words, NO numbers anywhere in the image.",
      "Scene:", cleaned
    ].join(" ");

    model = "gpt-image-1";
    reqBody = { model, prompt: finalPrompt, n: 1, size, quality: "medium" };
  }

  console.log("MODE:", mode, "| MODEL:", model);
  console.log("PROMPT:", finalPrompt.slice(0, 300));

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify(reqBody),
      signal: AbortSignal.timeout(22000)
    });

    const ct = res.headers.get('content-type') || '';
    let data;
    if (ct.includes('application/json')) {
      data = await res.json();
    } else {
      const txt = await res.text();
      throw new Error("OpenAI " + res.status + ": " + txt.slice(0, 100));
    }

    if (!res.ok) throw new Error(data.error?.message || "OpenAI API error " + res.status);

    const item = data.data?.[0] || {};
    let base64 = null;

    if (item.b64_json) {
      base64 = "data:image/png;base64," + item.b64_json;
    } else if (item.url) {
      try {
        const imgRes = await fetch(item.url, { signal: AbortSignal.timeout(8000) });
        const buffer = await imgRes.arrayBuffer();
        base64 = "data:image/png;base64," + Buffer.from(buffer).toString("base64");
      } catch {
        base64 = item.url;
      }
    } else {
      throw new Error("No image data from API");
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ base64, model, mode, revisedPrompt: item.revised_prompt || "" })
    };

  } catch (err) {
    console.error("generate-bg error:", err.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
