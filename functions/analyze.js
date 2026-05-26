const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

const SYSTEM = `Sen AlpVision — TRT Russian Dijital'in görsel asistanısın.
Sana bir haber metni verilecek. Şu JSON'u üret (başka hiçbir şey yazma):

{
  "headline": "Rusça kısa başlık (max 8 kelime, TAMAMEN BÜYÜK HARF)",
  "subheadline": "Rusça alt başlık (max 12 kelime, normal harf)",
  "category": "TEK KELİME kategori etiketi Rusça (ИРАН / ГАЗА / ТУРЦИЯ / УКРАИНА / МИРОВЫЕ / ЭКОНОМИКА / vb)",
  "source": "Kaynak adı (AA / Reuters / TRT World / vb)",
  "colorScheme": "dark|red|teal|gold",
  "dallePrompt": "İngilizce DALL-E 3 prompt — soyut, sinematik, gerçek insan YOK, haber temasıyla ilgili sembolik arka plan (max 60 kelime)",
  "pexelsQuery": "İngilizce Pexels arama terimi (max 4 kelime, konuyla ilgili coğrafya/sembol)",
  "urgency": "breaking|normal|feature"
}

Renk şeması seçim kuralları:
- dark: Rusya-Ukrayna, İran savaşı, askeri haberler
- red: İsrail-Gazze, insani kriz, sert haberler
- teal: Türkiye diplomasisi, Türk dünyası, olumlu haberler
- gold: Ekonomi, Türkiye tanıtım, özel içerik

DALL-E prompt kuralları:
- Gerçek kişi, yüz, tanınabilir figür ASLA
- Bayrak, harita, silüet, ışık, duman, su yansıması gibi soyut görseller
- Sinematik, dramatik, haber ajansı estetiği
- "photorealistic cinematic, dark dramatic lighting, no people, no faces" ile bitir`;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "{}" };

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { text } = body;
  if (!text || text.length < 20) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Metin çok kısa" }) };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: SYSTEM,
        messages: [{ role: "user", content: text.slice(0, 3000) }]
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "API error");

    const raw = data.content[0]?.text || "{}";
    // Strip markdown fences if present
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return { statusCode: 200, headers: CORS, body: JSON.stringify(parsed) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
