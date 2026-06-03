// ═══════════════════════════════════════════════════════════
// ANALYZE-DEEP.JS — Sonnet ile 8-10sn (arka planda)
// Görev: DALL-E prompt + 20 Economist konsepti + editorial analiz
// ═══════════════════════════════════════════════════════════
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

const DEEP_SYSTEM = `Sen AlpVision — TRT Russian'ın AI Creative Director'ısın.
The Economist baş illüstratörü gibi düşünüyorsun.

GÖREV: Habere özel DALL-E prompt + 20 farklı Economist konsepti üret.

KURAL 1 — STOK FOTOĞRAF KLİŞELERİ YASAK:
✗ Gazete, kahve, büyüteç, küre, el sıkışma, Kremlin binası, bayrak

KURAL 2 — METAFORİK DÜŞÜNME:
Ana çatışmayı ironik fiziksel bir eyleme dönüştür.
Örnek: "Rusya enerji kozu" → "A massive gas pipe as a lever lifting Europe off the ground"
Örnek: "Ermenistan seçimleri" → "Two giant hands from opposite sides grabbing the same chess piece"

KURAL 3 — SANATIK ÜSLUP:
✓ Matte gouache, flat color, fine ink lines
✓ Solid background: off-white/beige/slate
✓ 40% negative space
✓ SIFIR metin/harf/yazı görselde

KURAL 4 — RENK PALETİ (sadece bunlar):
#F2F2F0 #DCD0BA #3A3A3A #1C1C1C #042E58 #01203F #00B6CB #216125 #B11731 #C48901

TRT POLİTİKA: ЦАХАЛ→Армия Израиля | ИГИЛ→ДАЕШ | на Украине→в Украине | СВО=YASAK

20 STİL:
S1=Economist cream gouache metaphor | S2=Giant vs tiny yellow bg
S3=Stamp collage cream | S4=Split diptych contrast
S5=Bold figure yellow | S6=Objects forming concept dark
S7=Minimal bar chart red/offwhite | S8=Duotone BW+color
S9=Cinematic dark atmospheric | S10=Huge stat number
S11=Black silhouette solid bg | S12=Watercolor ink portrait
S13=TRT dark news dramatic | S14=Constructivist red/black diagonal
S15=Minimalist icon 60% space | S16=Object casts ironic shadow
S17=Puppet strings control | S18=Geopolitical chessboard
S19=Brutalist BW+red | S20=Documentary extreme closeup grain

SADECE JSON döndür:
{
  "editorialAnalysis": {
    "realCenter": "Rusça — gerçek merkez",
    "dominantEmotion": "tek kelime",
    "powerDynamic": "Rusça",
    "psychologicalCore": "Rusça",
    "socialMediaHook": "Rusça",
    "economistMetaphor": "İngilizce — ironi sahnesi"
  },
  "concepts": [
    {"id":1,"type":"economist_metaphor","title":"Rusça","description":"Rusça 2 cümle","whyStrong":"Rusça","scores":{"creativity":8,"newsImpact":8,"thumbnailPower":9,"trtCompliance":9,"total":85}},
    {"id":2,"type":"cinematic_crop","title":"Rusça","description":"Rusça 2 cümle","whyStrong":"Rusça","scores":{"creativity":7,"newsImpact":8,"thumbnailPower":8,"trtCompliance":9,"total":80}},
    {"id":3,"type":"symbolic","title":"Rusça","description":"Rusça 2 cümle","whyStrong":"Rusça","scores":{"creativity":9,"newsImpact":7,"thumbnailPower":8,"trtCompliance":9,"total":82}}
  ],
  "selectedConcept": 1,
  "selectionReason": "Rusça",
  "colorScheme": "dark|red|teal|gold|grey",
  "template": "economist_illustrated|photo_panel|split|typographic",
  "dallePrompt": "İngilizce DALL-E prompt — matte gouache, NO text, solid background, 40% negative space, The Economist cover style",
  "altPrompts": [
    "S1: [Economist cream gouache — specific metaphor scene for THIS article]",
    "S2: [Giant vs tiny scale asymmetry — specific to THIS story]",
    "S3: [Stamp collage — specific objects from THIS story]",
    "S4: [Split diptych — two contrasting realities from THIS story]",
    "S5: [Bold figure yellow — power character from THIS story]",
    "S6: [Objects forming concept — THIS story's key symbols]",
    "S7: [Minimal bar chart — THIS story's data if any]",
    "S8: [Duotone portrait — key figure from THIS story]",
    "S9: [Cinematic dark — THIS story's dramatic moment]",
    "S10: [Huge number — key statistic from THIS story]",
    "S11: [Black silhouette — THIS story's key symbol]",
    "S12: [Watercolor portrait — key person from THIS story]",
    "S13: [TRT dark news — THIS story's dramatic photo style]",
    "S14: [Constructivist — THIS story's political tension]",
    "S15: [Minimalist icon — THIS story's essence in one icon]",
    "S16: [Shadow irony — THIS story's hidden truth revealed]",
    "S17: [Puppet strings — THIS story's power control]",
    "S18: [Chessboard — THIS story's geopolitical actors]",
    "S19: [Brutalist — THIS story's raw conflict]",
    "S20: [Documentary closeup — THIS story's human detail]"
  ],
  "visualNote": "Rusça — Metaforik sahneyi açıkla",
  "qualityGate": "passed|failed"
}`;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"{}" };
  if (event.httpMethod !== "POST") return { statusCode:405, headers:CORS, body:"{}" };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode:400, headers:CORS, body:JSON.stringify({error:"Invalid JSON"}) }; }

  const text     = (body.text || "").trim();
  const headline = (body.headline || "").trim();
  const ctype    = body.contentType || "news";

  if (!text || text.length < 10)
    return { statusCode:400, headers:CORS, body:JSON.stringify({error:"Текст слишком короткий"}) };

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey    = process.env.OPENAI_API_KEY;

  let parsed = null;
  let engine = "none";

  // Claude Sonnet dene
  if (anthropicKey) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2500,
          system: DEEP_SYSTEM,
          messages: [{ role:"user", content:`Başlık: ${headline}\n\nHaber metni:\n${text.slice(0,2000)}` }]
        }),
        signal: AbortSignal.timeout(22000)
      });

      if (r.ok) {
        const d = await r.json();
        const raw = d.content?.[0]?.text || "{}";
        try {
          parsed = JSON.parse(raw);
          engine = "sonnet";
        } catch {
          const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
          if (s !== -1 && e > s) {
            parsed = JSON.parse(raw.slice(s, e+1));
            engine = "sonnet";
          }
        }
      }
    } catch (err) {
      console.warn("Sonnet failed:", err.message);
    }
  }

  // GPT-4o yedek
  if (!parsed && openaiKey) {
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 2000,
          temperature: 0.3,
          messages: [
            { role:"system", content: DEEP_SYSTEM },
            { role:"user",   content: `Başlık: ${headline}\n\nHaber:\n${text.slice(0,2000)}` }
          ]
        }),
        signal: AbortSignal.timeout(20000)
      });

      if (r.ok) {
        const d = await r.json();
        const raw = d.choices?.[0]?.message?.content || "{}";
        try {
          parsed = JSON.parse(raw);
          engine = "gpt4o";
        } catch {
          const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
          if (s !== -1 && e > s) {
            parsed = JSON.parse(raw.slice(s, e+1));
            engine = "gpt4o";
          }
        }
      }
    } catch (err) {
      console.warn("GPT-4o failed:", err.message);
    }
  }

  if (!parsed) {
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        editorialAnalysis: { realCenter:"Анализ недоступен", dominantEmotion:"Нейтральный" },
        concepts: [],
        dallePrompt: "Flat matte gouache editorial illustration on cream background, single symbolic object, sharp ink lines, 40% negative space, no text anywhere, The Economist cover style",
        altPrompts: [],
        colorScheme: "dark",
        template: "photo_panel",
        qualityGate: "failed",
        visualNote: "Повторите анализ",
        _engine: "fallback",
        _phase: "deep"
      })
    };
  }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      ...parsed,
      _engine: engine,
      _phase: "deep"
    })
  };
};
