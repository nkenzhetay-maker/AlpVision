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

GÖREV: 4 karar ver + 20 Economist konsepti üret.

━━━ KARAR 1: TEMPLATE SEÇİMİ ━━━
Aşağıdaki 20 template'ten BİRİNİ seç. Tam ID'yi yaz:
• dark_minimal     → Sadece metin, siyah zemin (analiz/görüş yazıları)
• photo_overlay    → Fotoğraf üstünde metin (güçlü fotoğraf haberleri)
• color_block      → Düz renk zemin + illüstrasyon (ekonomi/politika analiz)
• pure_typography  → Beyaz zemin, sadece metin (düşünce yazısı/alıntı)
• accent_color     → Sarı/pembe/mor zemin (feature/trend haberler)
• collage_dark     → Siyah-beyaz kolaj + kırmızı (çatışma/gerilim)
• map_visual       → Harita veya veri görseli (coğrafi/ekonomik haber)
• portrait_illus   → Kalem çizimi portre (kişi odaklı haber)
• invitation       → Çerçeveli ortalanmış (diplomatik/resmi haber)
• magazine_cover   → Dergi kapağı formatı (büyük kapak haberleri)
• silhouette       → Siluet + açık zemin (gizemli/siyasi figür)
• insider          → Kırmızı nokta + srochno (son dakika)
• trt_headline     → Metin üst + portre alt (kişi haberleri)
• trt_breaking     → Alt kırmızı şerit (acil/breaking)
• tweet_card       → Sosyal medya kartı (resmi açıklama/tweet)
• typographic      → Oswald büyük başlık (güçlü slogan/döviz)
• photo_panel      → Fotoğraf + beyaz panel (standart haber)
• split            → Sol metin / Sağ fotoğraf (analiz haberi)
• feature          → AI fon + alt metin bloğu (özel içerik)
• geometric        → Geometrik vektör (teknoloji/finans)

━━━ KARAR 2: RENK ŞEMASI ━━━
dark=siyah | red=kırmızı | teal=turkuaz | gold=altın | grey=gri | navy=lacivert | light=açık

━━━ KARAR 3: FOTOĞRAF ÖNERİSİ ━━━
photoQuery: Pexels/Unsplash için EN İYİ İngilizce arama sorgusu
photoSubject: Haberdeki ana kişi adı (varsa, tam İngilizce isim) veya null
photoContext: "person" | "place" | "object" | "abstract"
photoOrientation: "portrait" | "landscape"

━━━ KARAR 4: 20 DALL-E PROMPT ━━━
KURAL: Klişe yasak (bayrak, el sıkışma, küre, gazete)
Üslup: Matte gouache, flat color, fine ink lines, solid BG, 40% negative space, NO text

TRT: ЦАХАЛ→Армия Израиля | ИГИЛ→ДАЕШ | на Украине→в Украине | СВО=YASAK
PALETTE: #F2F2F0 #DCD0BA #3A3A3A #1C1C1C #042E58 #01203F #00B6CB #216125 #B11731 #C48901

SADECE JSON döndür, başka hiçbir şey yazma:
{
  "editorialAnalysis": {
    "realCenter": "Rusça — haberin gerçek özü",
    "dominantEmotion": "tek kelime Rusça",
    "economistMetaphor": "İngilizce ironi sahnesi"
  },
  "template": "BURAYA_TEMPLATE_ID",
  "colorScheme": "BURAYA_RENK",
  "photoQuery": "english pexels search query 3-5 words",
  "photoSubject": "Full Name in English or null",
  "photoContext": "person|place|object|abstract",
  "photoOrientation": "portrait|landscape",
  "dallePrompt": "S1 matte gouache prompt — specific to THIS article, no text, The Economist style",
  "altPrompts": [
    "S1: matte gouache cream bg — [THIS article specific metaphor scene]",
    "S2: giant vs tiny yellow bg — [asymmetry from THIS story]",
    "S3: stamp collage cream — [THIS story's key objects]",
    "S4: split diptych contrast — [two realities from THIS story]",
    "S5: bold figure yellow bg — [power figure from THIS story]",
    "S6: objects forming concept dark bg — [THIS story's symbols]",
    "S7: minimal data visualization red/offwhite — [THIS story's numbers]",
    "S8: duotone BW+color portrait — [key figure from THIS story]",
    "S9: cinematic dark atmospheric — [THIS story's dramatic scene]",
    "S10: huge stat number centered — [THIS story's key number]",
    "S11: black silhouette solid color bg — [THIS story's symbol]",
    "S12: watercolor ink portrait — [THIS story's main person]",
    "S13: TRT dark dramatic editorial — [THIS story's tension]",
    "S14: constructivist red black diagonal — [THIS story's conflict]",
    "S15: minimalist single icon 60% space — [THIS story's essence]",
    "S16: object casts ironic shadow — [THIS story's hidden truth]",
    "S17: puppet strings control — [THIS story's power dynamic]",
    "S18: geopolitical chessboard — [THIS story's actors]",
    "S19: brutalist BW+red accent — [THIS story's raw tension]",
    "S20: documentary extreme closeup grain — [THIS story's human detail]"
  ],
  "carouselPlan": {
    "caption": "Rusça Instagram caption 2-3 cümle + emoji",
    "hashtags": "#новости #TRTрусском",
    "slides": [
      {"headline": "Rusça güçlü kısa başlık", "subtext": "Rusça açıklama 1-2 cümle", "stat": "", "scheme": "navy", "template": "TEMPLATE_HOOK", "bullets": []},
      {"headline": "Rusça 2. slayt", "subtext": "Ana gerçek/bağlam", "stat": "SAYI varsa", "scheme": "beige", "template": "TEMPLATE_DATA", "bullets": ["madde1","madde2"]},
      {"headline": "Rusça 3. slayt", "subtext": "Detay", "stat": "", "scheme": "teal", "template": "TEMPLATE_LIST", "bullets": ["nokta1","nokta2","nokta3"]},
      {"headline": "Rusça 4. slayt", "subtext": "Analiz/yorum", "stat": "", "scheme": "dark", "template": "TEMPLATE_HOOK", "bullets": []},
      {"headline": "TRT НА РУССКОМ", "subtext": "Сохраните и поделитесь", "stat": "", "scheme": "navy", "template": "TEMPLATE_CTA", "bullets": []}
    ]
  },
  "visualNote": "Rusça — seçilen metaforun neden güçlü olduğunu açıkla",
  "qualityGate": "passed"
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
        signal: AbortSignal.timeout(7500)
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
        signal: AbortSignal.timeout(7000)
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
