// ═══════════════════════════════════════════════════════════
// ANALYZE-FAST.JS — Haiku ile 2-3sn
// Görev: Metin → Başlık + Kategori + Canva şablon seçimi
// ═══════════════════════════════════════════════════════════
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

const CANVA_TEMPLATES = [
  { id:"EAHLcbSuSmo", style:"trt_dark",        tone:["breaking","urgent","war","crisis","military"],     category:["news","video"] },
  { id:"EAHLcdMwS-E", style:"trt_dark_v2",     tone:["breaking","politics","international","sanctions"], category:["news","video"] },
  { id:"EAHLcZWnH0Y", style:"trt_banner",      tone:["breaking","urgent","election"],                    category:["news"] },
  { id:"EAHLcZKx8UA", style:"economist_cream", tone:["analysis","diplomacy","economy","trade"],          category:["news","feature","article"] },
  { id:"EAHLcZEDHv0", style:"power_editorial", tone:["geopolitics","power","analysis","strategy"],       category:["news","feature"] },
  { id:"EAHLcbHdSNw", style:"asymmetry",       tone:["inequality","power","conflict","pressure"],        category:["news","feature","infographic"] },
  { id:"EAHLcdNXGXA", style:"power_imbalance", tone:["sanctions","embargo","pressure","geopolitics"],    category:["news","feature"] },
  { id:"EAHLcU_Ullg", style:"black_split",     tone:["breaking","politics","military","crisis"],         category:["news","video"] },
  { id:"EAHLccH0QyI", style:"bw_editorial",    tone:["serious","documentary","historical","war"],        category:["feature","article"] },
  { id:"EAHLcQY-qCY", style:"big_number",      tone:["data","statistics","economy","percent"],           category:["infographic","news"] },
  { id:"EAHLcazlbZo", style:"big_number_v2",   tone:["data","statistics","social","population"],         category:["infographic"] },
  { id:"EAHLcaFMLas", style:"data_viz",        tone:["data","economy","market","finance"],               category:["infographic","news"] },
  { id:"EAHLcannr_U", style:"quote_editorial", tone:["opinion","statement","leader","minister"],         category:["feature","article","qa"] },
  { id:"EAHLcaHdlfA", style:"quote_v2",        tone:["opinion","analysis","expert","interview"],         category:["feature","article"] },
  { id:"EAHLcZBObt4", style:"quote_gray",      tone:["serious","historical","documentary","archive"],    category:["feature","article"] },
  { id:"EAHLcSz-Gik", style:"quote_v3",        tone:["crisis","urgent","human","social"],                category:["feature","article"] },
  { id:"EAHLcVs6bOo", style:"data_chart",      tone:["economy","market","trade","energy","oil"],         category:["infographic","news"] },
  { id:"EAHLcU3FTH4", style:"comparison",      tone:["comparison","analysis","before","after"],          category:["infographic","feature"] },
  { id:"EAHLcXQ8FVQ", style:"trend_analysis",  tone:["trend","social","technology","innovation"],        category:["feature","infographic"] },
  { id:"EAHLccBt_XA", style:"watercolor",      tone:["opinion","profile","portrait","interview"],        category:["article","feature","qa"] }
];

function selectTemplates(headline, emotion, ctype) {
  const text = (headline + ' ' + emotion).toLowerCase();
  const scored = CANVA_TEMPLATES.map(t => {
    let score = 0;
    if (t.category.includes(ctype)) score += 3;
    t.tone.forEach(k => { if (text.includes(k)) score += 2; });
    score += Math.random() * 0.3;
    return { ...t, score };
  });
  return scored.sort((a,b) => b.score - a.score).map(t => ({
    id: t.id,
    style: t.style,
    score: Math.round(t.score * 10) / 10,
    createUrl: `https://www.canva.com/design?create=true&template=${t.id}`
  }));
}

const FAST_SYSTEM = `Sen TRT Russian için hızlı editöryal asistansın.
Görevi: Haberi 2-3 saniyede analiz et.

TRT KURALLARI:
- ЦАХАЛ → Армия Израиля
- ИГИЛ → ДАЕШ  
- на Украине → в Украине
- СВО kelimesini KULLANMA
- Иерусалим → Аль-Кудс

SADECE bu JSON'u döndür (başka hiçbir şey yazma):
{
  "headline": "RUSÇA MAX 7 KELİME BÜYÜK HARF",
  "subheadline": "Rusça max 12 kelime açıklayıcı alt başlık",
  "category": "МИРОВЫЕ|ПОЛИТИКА|ЭКОНОМИКА|БЕЗОПАСНОСТЬ|ТЕХНОЛОГИИ|КУЛЬТУРА",
  "emotion": "diplomacy|breaking|analysis|crisis|economy|politics|military|social",
  "urgency": "breaking|normal|feature",
  "source": "AA|Reuters|AFP|TRT World",
  "pexelsQuery": "İngilizce 3-4 kelime fotoğraf arama",
  "photoCredit": "Фото: Reuters|AA|AFP|TRT Russian"
}`;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"{}" };
  if (event.httpMethod !== "POST") return { statusCode:405, headers:CORS, body:"{}" };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode:400, headers:CORS, body:JSON.stringify({error:"Invalid JSON"}) }; }

  const text  = (body.text || "").trim();
  const ctype = body.contentType || "news";

  if (!text || text.length < 10)
    return { statusCode:400, headers:CORS, body:JSON.stringify({error:"Текст слишком короткий"}) };

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key)
    return { statusCode:500, headers:CORS, body:JSON.stringify({error:"ANTHROPIC_API_KEY missing"}) };

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: FAST_SYSTEM,
        messages: [{ role:"user", content:`Haber:\n${text.slice(0,1500)}` }]
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!r.ok) {
      const e = await r.text();
      throw new Error(`Claude ${r.status}: ${e.slice(0,100)}`);
    }

    const d = await r.json();
    const raw = d.content?.[0]?.text || "{}";

    let parsed;
    try { parsed = JSON.parse(raw); }
    catch {
      const s = raw.indexOf('{'), e2 = raw.lastIndexOf('}');
      if (s !== -1 && e2 > s) parsed = JSON.parse(raw.slice(s, e2+1));
      else throw new Error("JSON parse failed");
    }

    // Canva şablonlarını seç
    const templates = selectTemplates(
      parsed.headline || "",
      parsed.emotion || "",
      ctype
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ...parsed,
        canvaTemplates: templates,
        _engine: "haiku-fast",
        _phase: "fast"
      })
    };

  } catch (err) {
    console.error("analyze-fast error:", err.message);
    // Fallback — API olmadan bile çalış
    const fallbackHeadline = text.split(/[.!?]/)[0].toUpperCase().split(/\s+/).slice(0,7).join(' ');
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        headline: fallbackHeadline,
        subheadline: "",
        category: "МИРОВЫЕ",
        emotion: "analysis",
        urgency: "normal",
        source: "",
        pexelsQuery: "news world",
        photoCredit: "",
        canvaTemplates: selectTemplates(fallbackHeadline, "analysis", ctype),
        _engine: "fallback",
        _phase: "fast",
        _error: err.message
      })
    };
  }
};
