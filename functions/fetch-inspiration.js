// TRT Russian içerik analizi — trtrussian.com web sitesinden güncel tasarım örnekleri çeker
// Bu veriler analyze.js'e editöryal referans olarak iletilir

const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  try {
    // TRT Russian web sitesinden son manşetleri çek
    const res = await fetch("https://www.trtrussian.com/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AlpVision/1.0; editorial-research)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ru,en;q=0.9"
      },
      timeout: 8000
    });

    if (!res.ok) throw new Error("TRT Russian site HTTP " + res.status);

    const html = await res.text();

    // Başlıkları çıkar (h1, h2, article başlıkları)
    const headlines = [];
    const patterns = [
      /<h[123][^>]*class="[^"]*(?:title|headline|heading)[^"]*"[^>]*>([^<]+)</gi,
      /<a[^>]*class="[^"]*(?:title|headline)[^"]*"[^>]*>([^<]+)</gi,
      /<h[23][^>]*>([А-ЯЁа-яё][^<]{10,80})</gi
    ];
    
    for (const pattern of patterns) {
      let m;
      while ((m = pattern.exec(html)) !== null && headlines.length < 20) {
        const text = m[1].trim().replace(/\s+/g, ' ');
        if (text.length > 15 && text.length < 100 && /[А-ЯЁа-яё]/.test(text)) {
          headlines.push(text);
        }
      }
    }

    // Kategori örnekleri çıkar
    const categories = [];
    const catPattern = /<a[^>]*href="\/[^/]+\/"[^>]*>([А-ЯЁа-яё][а-яё]+)</gi;
    let cm;
    while ((cm = catPattern.exec(html)) !== null && categories.length < 10) {
      categories.push(cm[1]);
    }

    // Editöryal referans oluştur
    const inspiration = {
      source: "trtrussian.com",
      fetchedAt: new Date().toISOString(),
      recentHeadlines: [...new Set(headlines)].slice(0, 15),
      categories: [...new Set(categories)].slice(0, 8),
      designPatterns: [
        "Bold uppercase Cyrillic headlines over photo backgrounds",
        "TRT logo top-left in white on dark, black on light",
        "Carousel format for in-depth stories (6-8 slides)",
        "Dark overlay gradient from bottom for text legibility",
        "Beige/gold accent for Feature stories",
        "Editorial Red for breaking news",
        "Clean sans-serif (Manrope) for body text",
        "Full-bleed photography with minimal text overlay"
      ],
      editorialVoice: "Authoritative yet accessible. International news with Russian-speaking audience perspective. Factual, balanced, premium news brand.",
      colorUsage: {
        breakingNews: "#B11731",
        features: "#DCD0BA",
        geopolitics: "#042E58",
        economy: "#042E58"
      }
    };

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(inspiration)
    };

  } catch (err) {
    console.warn("fetch-inspiration error:", err.message);
    // Fallback: cached design patterns
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        source: "cached",
        fetchedAt: new Date().toISOString(),
        recentHeadlines: [],
        designPatterns: [
          "Bold uppercase Cyrillic headlines",
          "TRT logo top-left",
          "The Economist style editorial illustrations",
          "Carousel for features",
          "Dark overlay gradient"
        ],
        editorialVoice: "Authoritative international news for Russian-speaking audience",
        error: err.message
      })
    };
  }
};
