const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

const ECONOMIST_STYLE = [
  "flat matte gouache painting",
  "cream off-white solid background #F2F2F0",
  "fine ink outlines on shapes",
  "limited palette 3-4 colors maximum",
  "40 percent negative space",
  "single strong central metaphor",
  "ironic understated mood",
  "no text no letters no numbers no words anywhere in the image",
  "no photorealism no gradients no lens flares no glows",
  "The Economist magazine cover illustration style",
  "flat vector-like shapes with slight hand-painted texture",
  "bold asymmetric composition",
  "strong foreground object against minimal background"
].join(", ");

const TRT_PALETTE = "Strict color palette — use ONLY: off-white #F2F2F0, beige #DCD0BA, charcoal #3A3A3A, near-black #1C1C1C, deep blue #042E58, navy #01203F, cyan #00B6CB, dark green #216125, editorial red #B11731, mustard #C48901. No other colors.";

// TAM KAPAK prompt inşaatı
function buildCoverPrompt(headline, concept, category) {
  const cat = (category || '').toLowerCase();

  // Kategori → renk tonu
  const colorHint =
    /эконом|finans|trade|market/.test(cat) ? "dominant color: deep blue #042E58 and beige #DCD0BA" :
    /войн|кризис|conflict|military/.test(cat) ? "dominant color: editorial red #B11731 and near-black #1C1C1C" :
    /дипломат|summit|negotiat/.test(cat) ? "dominant color: navy #01203F and cyan #00B6CB" :
    /техно|AI|digital/.test(cat) ? "dominant color: cyan #00B6CB and charcoal #3A3A3A" :
    "dominant color: deep blue #042E58 and cream #F2F2F0";

  return [
    "Create a complete editorial magazine cover illustration.",
    "Style: The Economist cover — " + ECONOMIST_STYLE + ".",
    TRT_PALETTE + ".",
    colorHint + ".",
    platform === "instagram"
      ? "Composition: Portrait format 4:5. Large empty space in UPPER LEFT corner (25% of image) reserved for logo. Main illustration occupies center and lower area."
      : (platform === "web" || platform === "youtube" || platform === "twitter" || platform === "telegram" || platform === "facebook")
      ? "Composition: Landscape wide format 16:9. Empty space in LEFT THIRD reserved for text overlay. Main illustration occupies center and right two-thirds."
      : "Composition: Square format. Empty space in TOP LEFT corner reserved for logo. Main illustration centered.",
    "The illustration must visually express this concept: " + concept + ".",
    "NO text, NO letters, NO words, NO numbers anywhere. ZERO text.",
    "The image must work as a standalone cover without any text — pure visual storytelling.",
    "Quality: museum-quality editorial illustration, not clipart, not cartoon."
  ].join(" ");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "{}" };

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const rawPrompt  = body.prompt || body.dallePrompt || "";
  const mode       = body.mode || "illustration";
  const headline   = body.headline || "";
  const concept    = body.concept  || rawPrompt;
  const category   = body.category || "";
  // Platform → boyut mapping
  const platform = body.platform || "instagram";
  const SIZE_MAP = {
    instagram: "1024x1536",   // 4:5 portrait
    twitter:   "1536x1024",   // 16:9 landscape
    telegram:  "1536x1024",   // 16:9 landscape
    youtube:   "1536x1024",   // 16:9 landscape
    facebook:  "1536x1024",   // landscape
    web:       "1536x1024",   // wide
    square:    "1024x1024",   // 1:1
  };
  const size = SIZE_MAP[platform] || "1024x1536";

  if (!rawPrompt && !concept) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "No prompt received" }) };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "OPENAI_API_KEY missing" }) };
  }

  // Kiril temizle
  const cleaned = rawPrompt
    .replace(/[А-ЯЁа-яё]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const cleanConcept = concept
    .replace(/[А-ЯЁа-яё]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  let finalPrompt, reqBody;
  const model = "gpt-image-1";

  if (mode === "cover" || mode === "collage") {
    const subjects = body.subjects || [];
    let finalConcept = cleanConcept || cleaned;

    if (mode === "collage" && subjects.length >= 2) {
      // Economist kolaj tarzı — iki figür karşı karşıya
      finalPrompt = [
        "Editorial magazine cover collage illustration in The Economist style.",
        "Black and white photographic composition with bold red color accents.",
        "Two powerful figures facing each other divided by a vertical red line.",
        "Dark dramatic mood, high contrast black and white, editorial gravitas.",
        "Red rectangular accent blocks overlaid on the composition.",
        "Bold black header area in upper 30% — empty for text overlay.",
        "NO text, NO letters anywhere in the image.",
        "Subjects of the story: " + finalConcept,
        TRT_PALETTE + ".",
        "Style reference: The Economist fear factor cover — stark, journalistic, powerful."
      ].join(" ");
    } else {
      finalPrompt = buildCoverPrompt(headline, finalConcept, category);
    }
    reqBody = { model, prompt: finalPrompt, n: 1, size, quality: "high" };

  } else if (mode === "photo") {
    // Gerçekçi haber fotoğrafı
    finalPrompt = [
      "High quality editorial news photograph.",
      "Photojournalism style, cinematic lighting, shallow depth of field.",
      "No text, no watermark, no illustration.",
      "Realistic DSLR camera quality, Reuters/AP style.",
      "Subject:", cleaned
    ].join(" ");
    reqBody = { model, prompt: finalPrompt, n: 1, size: "1024x1024", quality: "medium" };

  } else {
    // Economist illüstrasyon (arka plan için)
    finalPrompt = [
      "Editorial illustration background.",
      ECONOMIST_STYLE + ".",
      TRT_PALETTE + ".",
      "STRICTLY NO text anywhere.",
      "Scene:", cleaned
    ].join(" ");
    reqBody = { model, prompt: finalPrompt, n: 1, size: "1024x1024", quality: "medium" };
  }

  console.log("MODE:", mode, "| SIZE:", reqBody.size, "| QUALITY:", reqBody.quality);
  console.log("PROMPT:", finalPrompt.slice(0, 400));

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify(reqBody),
      signal: AbortSignal.timeout(25000)
    });

    const ct = res.headers.get('content-type') || '';
    let data;
    if (ct.includes('application/json')) {
      data = await res.json();
    } else {
      throw new Error("OpenAI " + res.status + ": " + (await res.text()).slice(0, 100));
    }

    if (!res.ok) throw new Error(data.error?.message || "OpenAI API error " + res.status);

    const item = data.data?.[0] || {};
    let base64 = null;

    if (item.b64_json) {
      base64 = "data:image/png;base64," + item.b64_json;
    } else if (item.url) {
      try {
        const imgRes = await fetch(item.url, { signal: AbortSignal.timeout(10000) });
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
