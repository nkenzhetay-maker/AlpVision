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

  const { query, orientation = "landscape" } = body;
  if (!query) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Query required" }) };

  const PEXELS_KEY = process.env.PEXELS_API_KEY;
  if (!PEXELS_KEY) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Pexels key missing" }) };

  try {
    const params = new URLSearchParams({
      query,
      orientation,         // landscape | portrait | square
      size: "large",       // large = 1280px+
      per_page: "6",
      page: "1"
    });

    const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { "Authorization": PEXELS_KEY }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Pexels API error");

    const photos = (data.photos || []).map(p => ({
      id: p.id,
      width: p.width,
      height: p.height,
      photographer: p.photographer,
      pexels_url: p.url,
      // Boyutlara göre en uygun URL seç
      src_large: p.src.large2x || p.src.large,
      src_medium: p.src.medium,
      src_tiny: p.src.tiny,
      // Portrait için de hazır ol
      src_portrait: p.src.portrait
    }));

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ photos, total: data.total_results })
    };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
