/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  ALPVISION — EDITORIAL DIRECTOR                              ║
 * ║  GPT-4o multimodal "Art Director" katmanı                    ║
 * ║                                                              ║
 * ║  Görev: Metni + Few-Shot örneklerini analiz ederek           ║
 * ║  "insani sezgiyle" tasarım kararı vermek                     ║
 * ║                                                              ║
 * ║  Mimari:                                                     ║
 * ║  1. Metin → Duygu/mesaj analizi                              ║
 * ║  2. Few-Shot knowledge base → Benzer başarılı örnekler       ║
 * ║  3. GPT-4o vision → Görsel karar (A/B/C senaryosu)          ║
 * ║  4. Structured JSON çıktı → downstream sistemlere           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

// ═══════════════════════════════════════════════════════════════
// FEW-SHOT KNOWLEDGE BASE
// "Başarı hikayeleri" — metin duygusu → görsel karar
// Her entry: {emotion, context, decision, reasoning, imagePrompt}
// ═══════════════════════════════════════════════════════════════
const FEW_SHOT_EXAMPLES = [
  {
    id: "fs_001",
    emotion: "confrontation",
    context: "Two world leaders in tense negotiations, nuclear/military stakes",
    textSignals: ["vs", "confrontation", "negotiations", "threat", "deal"],
    decision: {
      visualStrategy: "COLLAGE_PORTRAIT",
      photoStrategy: "REAL_PERSON_PHOTO",
      subjects: ["Leader A", "Leader B"],
      composition: "Two faces split by vertical red line — The Economist fear factor style",
      colorMood: "black_white_red",
      textPlacement: "top_black_block",
      template: "collage_dark"
    },
    reasoning: "When two powerful figures face off, their faces are the story. Split composition creates visual tension that mirrors political tension.",
    imagePrompt: "Two world leaders facing each other, black and white photography, split by bold red vertical line, dramatic editorial composition"
  },
  {
    id: "fs_002",
    emotion: "economic_crisis",
    context: "Trade war, sanctions, market collapse, financial pressure",
    textSignals: ["economy", "trade", "sanctions", "market", "billion", "percent"],
    decision: {
      visualStrategy: "METAPHORICAL_ILLUSTRATION",
      photoStrategy: "AI_ILLUSTRATION",
      subjects: [],
      composition: "Single powerful object with ironic metaphor — bag with downward arrow, scales tipping, bridge breaking",
      colorMood: "cream_deep_blue",
      textPlacement: "top_serif_text",
      template: "photo_text_top"
    },
    reasoning: "Economic stories need metaphors not faces. A shopping bag with a downward arrow says more than any graph.",
    imagePrompt: "Editorial flat gouache illustration, shopping bag or scales with downward red arrow, cream background, Economist style"
  },
  {
    id: "fs_003",
    emotion: "political_analysis",
    context: "Opinion piece, analysis, political commentary without specific event",
    textSignals: ["analysis", "opinion", "perspective", "question", "why", "how"],
    decision: {
      visualStrategy: "PURE_TYPOGRAPHY",
      photoStrategy: "NO_PHOTO",
      subjects: [],
      composition: "Strong serif italic headline centered, generous white space — letter/invitation style",
      colorMood: "white_navy",
      textPlacement: "centered_serif",
      template: "letter_envelope"
    },
    reasoning: "Deep analysis doesn't need imagery. The words ARE the design. Economist 'By Invitation' style.",
    imagePrompt: null
  },
  {
    id: "fs_004",
    emotion: "breaking_news",
    context: "Urgent event, attack, disaster, sudden development",
    textSignals: ["attack", "explosion", "killed", "breaking", "urgent", "срочно", "атака"],
    decision: {
      visualStrategy: "REAL_PHOTO_DOMINANT",
      photoStrategy: "REAL_PERSON_PHOTO",
      subjects: [],
      composition: "Full bleed dramatic photo, bold white headline at bottom on dark bar",
      colorMood: "dark_red_accent",
      textPlacement: "bottom_bold",
      template: "trt_breaking"
    },
    reasoning: "Breaking news needs real photography. Drama over aesthetics. Headline must be unmissable.",
    imagePrompt: null
  },
  {
    id: "fs_005",
    emotion: "diplomatic_meeting",
    context: "Summit, official visit, bilateral talks, agreements",
    textSignals: ["summit", "visit", "meeting", "agreement", "bilateral", "визит", "переговоры"],
    decision: {
      visualStrategy: "OFFICIAL_PHOTO",
      photoStrategy: "REAL_PERSON_PHOTO",
      subjects: ["Primary leader"],
      composition: "Clean portrait top 60%, text block bottom 40% — TRT headline style",
      colorMood: "navy_cream",
      textPlacement: "top_photo_bottom_text",
      template: "photo_text_top"
    },
    reasoning: "Diplomatic stories need the human face of power. Official portrait gives authority.",
    imagePrompt: null
  },
  {
    id: "fs_006",
    emotion: "satirical_metaphor",
    context: "Absurd political situation, irony, contradictions in power",
    textSignals: ["irony", "despite", "while", "paradox", "absurd", "странно"],
    decision: {
      visualStrategy: "METAPHORICAL_ILLUSTRATION",
      photoStrategy: "AI_ILLUSTRATION",
      subjects: [],
      composition: "Object doing impossible thing — puppet with cut strings, chess piece falling, clock running backwards",
      colorMood: "cream_accent_color",
      textPlacement: "illus_bottom_text_top",
      template: "illus_bottom"
    },
    reasoning: "Irony needs a visual pun. The absurd situation deserves an absurd image.",
    imagePrompt: "Economist editorial illustration, surreal metaphor object, matte gouache, cream background, ironic composition"
  },
  {
    id: "fs_007",
    emotion: "single_person_profile",
    context: "Profile piece, interview, biography of a known figure",
    textSignals: ["заявил", "сообщил", "по словам", "stated", "said", "declared"],
    decision: {
      visualStrategy: "PORTRAIT_EDITORIAL",
      photoStrategy: "REAL_PERSON_PHOTO",
      subjects: ["Named person in text"],
      composition: "Large portrait with slight desaturation, name/quote treatment",
      colorMood: "light_editorial",
      textPlacement: "text_over_portrait",
      template: "photo_overlay"
    },
    reasoning: "When someone says something important, their face carries the weight of the statement.",
    imagePrompt: null
  },
  {
    id: "fs_008",
    emotion: "geopolitical_map",
    context: "Regional conflict, territorial dispute, geographic story",
    textSignals: ["region", "border", "territory", "strait", "corridor", "пролив", "коридор"],
    decision: {
      visualStrategy: "MAP_VISUAL",
      photoStrategy: "AERIAL_PHOTO",
      subjects: [],
      composition: "Aerial/satellite perspective or illustrated map with highlighted zones",
      colorMood: "light_map",
      textPlacement: "top_text_map_bottom",
      template: "map_visual"
    },
    reasoning: "Geographic stories need geographic context. Map > face when territory is the protagonist.",
    imagePrompt: "Editorial map illustration, minimalist, highlighted region in red, clean cartographic style"
  }
];

// ═══════════════════════════════════════════════════════════════
// EDITORIAL KNOWLEDGE BASE (büyüyebilir — "Hafızaya Ekle" ile)
// ═══════════════════════════════════════════════════════════════
let EDITORIAL_MEMORY = [];

// ═══════════════════════════════════════════════════════════════
// SINEMATIK VE SANATSAL TERİM SÖZLÜĞÜ
// Prompt kalitesini artırmak için
// ═══════════════════════════════════════════════════════════════
const VISUAL_VOCABULARY = {
  lighting: ["chiaroscuro", "rembrandt lighting", "golden hour", "harsh directional", "diffused editorial"],
  composition: ["rule of thirds", "leading lines", "negative space dominant", "frame within frame", "diagonal tension"],
  mood: ["gravitas", "melancholy", "urgent", "contemplative", "ironic", "tense", "hopeful"],
  style: ["matte gouache", "flat editorial", "photojournalism", "constructivist", "typographic"],
  economist_specific: [
    "single central metaphor", "generous whitespace", "understated irony",
    "flat perspective no depth", "limited 3-4 color palette", "fine ink outlines"
  ]
};

// ═══════════════════════════════════════════════════════════════
// KARAR MOTORU — Few-Shot matching
// ═══════════════════════════════════════════════════════════════
function matchFewShot(text, emotion) {
  const textLower = (text + ' ' + emotion).toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const example of FEW_SHOT_EXAMPLES) {
    let score = 0;
    // Emotion match
    if (emotion && emotion.includes(example.emotion)) score += 3;
    // Signal match
    for (const signal of example.textSignals) {
      if (textLower.includes(signal.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = example;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
}

// ═══════════════════════════════════════════════════════════════
// GPT-4o MULTIMODAL ART DIRECTOR
// ═══════════════════════════════════════════════════════════════
async function runArtDirector(text, headline, referenceImages, openaiKey) {

  // Few-shot örneklerini string olarak hazırla
  const fewShotStr = FEW_SHOT_EXAMPLES.slice(0,4).map(ex => `
EXAMPLE [${ex.id}]:
Emotion: ${ex.emotion}
Context: ${ex.context}
Decision: ${JSON.stringify(ex.decision)}
Reasoning: "${ex.reasoning}"
`).join('\n');

  // Eğer referans görseller varsa — multimodal vision analizi
  const hasImages = referenceImages && referenceImages.length > 0;
  const imageContent = hasImages ? referenceImages.slice(0,3).map(b64 => ({
    type: "image_url",
    image_url: { url: `data:image/jpeg;base64,${b64}`, detail: "low" }
  })) : [];

  const systemPrompt = `Sen TRT Russian'ın 20 yıllık deneyimli Art Director'ısın.
The Economist, Reuters, AP'nin görsel dilini içselleştirdin.
Bir haberi okuduğunda şunları hissediyorsun:
- Haberin GERÇEK çatışması nerede?
- Okuyucuya en güçlü mesajı hangi GÖRSEL verir?
- Fotoğraf mı, illüstrasyon mu, saf tipografi mi?
- Hangi renk tonu bu haberin duygusunu taşır?

KARAR ŞEMASI:
- COLLAGE_PORTRAIT: İki güçlü figür karşı karşıya → yüzleri böl
- METAPHORICAL_ILLUSTRATION: Soyut ekonomi/politika → güçlü metafor
- PURE_TYPOGRAPHY: Derin analiz/görüş → sözcükler görselin kendisi
- REAL_PHOTO_DOMINANT: Son dakika, felaket, somut olay → gerçek fotoğraf
- OFFICIAL_PHOTO: Diplomatik ziyaret, resmi açıklama → yetkili portre
- PORTRAIT_EDITORIAL: Kişi haberi → yüz+alıntı kompozisyonu
- MAP_VISUAL: Coğrafi/bölgesel haber → harita perspektifi

TRT YASAK LİSTESİ:
- СВО → война/конфликт
- ЦАХАЛ → Армия Израиля  
- ИГИЛ → ДАЕШ
- на Украине → в Украине
- Dramatik abartı kelimeler yasak

SADECE JSON döndür.`;

  const userContent = [
    {
      type: "text",
      text: `FEW-SHOT ÖRNEKLER (Referans tasarım kararları):
${fewShotStr}

---
ŞİMDİ BU HABERİ ART DIRECTOR GÖZÜYlE ANALİZ ET:

BAŞLIK: ${headline}
METİN: ${text.slice(0, 1500)}

${hasImages ? `Bu referans görseller (Economist/TRT başarılı kapaklar) sana stilsel yol gösteriyor:` : ''}

Şu JSON formatında karar ver:
{
  "editorialEmotion": "haberin tek kelime duygusu (confrontation/crisis/analysis/breaking/diplomatic/satirical/profile/geographic)",
  "realStory": "Rusça — haberin yüzeyin altındaki gerçek mesajı (1 cümle)",
  "visualDecision": {
    "strategy": "COLLAGE_PORTRAIT | METAPHORICAL_ILLUSTRATION | PURE_TYPOGRAPHY | REAL_PHOTO_DOMINANT | OFFICIAL_PHOTO | PORTRAIT_EDITORIAL | MAP_VISUAL",
    "reasoning": "Rusça — neden bu görsel strateji (1 cümle, sanat yönetmeni gibi düşün)",
    "photoStrategy": "REAL_PERSON_PHOTO | AI_ILLUSTRATION | AERIAL_PHOTO | NO_PHOTO",
    "subjects": ["Haberdeki tanınmış kişi tam adı İngilizce — boş liste eğer kişi yoksa"],
    "photoQuery": "Pexels/Wikimedia için İngilizce arama sorgusu",
    "colorMood": "dark_red | cream_blue | black_white_red | navy_cream | warm_gold | teal_dark",
    "composition": "Kompozisyon tarifi — text placement, ana element, boşluk kullanımı",
    "cinematicTerms": ["2-3 sinematik terim: chiaroscuro, rule_of_thirds, negative_space vb."],
    "template": "collage_dark | photo_text_top | illus_bottom | letter_envelope | dark_minimal | photo_overlay | insider | trt_breaking | split | pure_typography | typographic | photo_panel | color_block | portrait_illus | map_visual | magazine_cover | silhouette | invitation | tweet_card | geometric | accent_color | feature"
  },
  "headline": "TRT kurallarına uygun Rusça başlık — max 8 kelime",
  "subheadline": "Alt başlık — max 12 kelime",
  "dallePrompt": "gpt-image-1 için İngilizce prompt — seçilen stratejiye göre, no text, editorial quality",
  "collageMode": true/false,
  "fewShotMatch": "Hangi örnek en yakın eşleşti (fs_001..fs_008 veya null)",
  "artDirectorNote": "Rusça — bu kararı neden verdim (editöryal not, kullanıcıya gösterilecek)"
}`
    },
    ...imageContent
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ]
    }),
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `GPT-4o ${response.status}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(raw);
}

// ═══════════════════════════════════════════════════════════════
// PHOTO RESOLVER — Karar → Gerçek fotoğraf URL'i
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// MULTI-SOURCE PHOTO RESOLVER
// Öncelik sırası:
// 1. Wikimedia Commons (güncel resmi portreler)
// 2. Wikipedia REST API (hızlı thumbnail)
// 3. Pexels (stok/haber fotoğrafı)
// 4. DuckDuckGo Image Search (genel web)
// Tüm kaynaklar paralel — en hızlı + kaliteli kazanır
// ═══════════════════════════════════════════════════════════════

async function tryWikimediaCommons(person) {
  // Wikimedia Commons — daha güncel ve yüksek çözünürlük
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?` +
      `action=query&list=search&srsearch=${encodeURIComponent(person + ' official portrait')}&` +
      `srnamespace=6&srlimit=3&format=json&origin=*`;
    const r = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    const files = (d.query?.search || [])
      .map(f => f.title)
      .filter(t => /\.(jpg|jpeg|png|webp)/i.test(t));
    if (!files.length) return null;

    // İlk dosyanın URL'ini al
    const infoUrl = `https://commons.wikimedia.org/w/api.php?` +
      `action=query&titles=${encodeURIComponent(files[0])}&prop=imageinfo&` +
      `iiprop=url&iiurlwidth=1200&format=json&origin=*`;
    const ir = await fetch(infoUrl, { signal: AbortSignal.timeout(4000) });
    const id = await ir.json();
    const pages = Object.values(id.query?.pages || {});
    const url = pages[0]?.imageinfo?.[0]?.url;
    if (url) return { url, source: 'wikimedia_commons', quality: 3 };
  } catch {}
  return null;
}

async function tryWikipedia(person) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(person)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.thumbnail?.source) {
      const highRes = d.thumbnail.source.replace(/\/\d+px-/, '/1200px-');
      return { url: highRes, source: 'wikipedia', quality: 2, description: d.description };
    }
  } catch {}
  return null;
}

async function tryWikipediaRU(person) {
  // Rusça Wikipedia — bazen daha güncel portreler
  try {
    const url = `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(person)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.thumbnail?.source) {
      const highRes = d.thumbnail.source.replace(/\/\d+px-/, '/1200px-');
      return { url: highRes, source: 'wikipedia_ru', quality: 2 };
    }
  } catch {}
  return null;
}

async function tryPexels(query, pexelsKey) {
  if (!pexelsKey) return null;
  try {
    const params = new URLSearchParams({
      query: query + ' official portrait',
      orientation: 'portrait',
      size: 'large',
      per_page: '3'
    });
    const r = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { Authorization: pexelsKey },
      signal: AbortSignal.timeout(5000)
    });
    const d = await r.json();
    const photo = d.photos?.[0];
    if (photo) return {
      url: photo.src.large2x || photo.src.large,
      source: 'pexels',
      quality: 2,
      credit: photo.photographer
    };
  } catch {}
  return null;
}

async function tryDuckDuckGoImages(person) {
  // DDG vqd token al, sonra görsel ara
  try {
    const vqdRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(person + ' official photo')}&ia=images`,
      { signal: AbortSignal.timeout(4000),
        headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const html = await vqdRes.text();
    const vqdMatch = html.match(/vqd=([\d-]+)/);
    if (!vqdMatch) return null;

    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?q=${encodeURIComponent(person + ' official portrait')}&vqd=${vqdMatch[1]}&p=1`,
      { signal: AbortSignal.timeout(4000),
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://duckduckgo.com' } }
    );
    const imgData = await imgRes.json();
    const result = imgData.results?.[0];
    if (result?.image) return { url: result.image, source: 'duckduckgo', quality: 1 };
  } catch {}
  return null;
}

async function resolvePhoto(decision, pexelsKey) {
  const { photoStrategy, subjects, photoQuery } = decision;

  if (photoStrategy === 'NO_PHOTO') return null;
  if (photoStrategy === 'AI_ILLUSTRATION') return null;

  const person = subjects?.[0] || '';
  const query = person || photoQuery || '';
  if (!query) return null;

  console.log(`resolvePhoto: strategy=${photoStrategy}, person="${person}", query="${query}"`);

  // Tüm kaynakları paralel çalıştır
  const tasks = [
    tryWikimediaCommons(person || query),
    tryWikipedia(person || query),
    tryWikipediaRU(person || query),
    person ? tryPexels(person, pexelsKey) : Promise.resolve(null),
    tryDuckDuckGoImages(person || query),
  ];

  const results = await Promise.allSettled(tasks);
  const photos = results
    .filter(r => r.status === 'fulfilled' && r.value?.url)
    .map(r => r.value)
    .sort((a, b) => (b.quality || 0) - (a.quality || 0));

  if (photos.length > 0) {
    console.log(`resolvePhoto: ${photos.length} kaynak buldu, seçilen: ${photos[0].source}`);
    return {
      ...photos[0],
      person,
      allSources: photos.map(p => p.source),
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// ANA HANDLER
// ═══════════════════════════════════════════════════════════════
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "{}" };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const {
    text = "",
    headline = "",
    referenceImages = [], // Base64 few-shot görseller (isteğe bağlı)
    action = "direct"     // "direct" | "train" | "recall"
  } = body;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "OPENAI_API_KEY missing" }) };
  }

  // TRAIN: Başarılı tasarımı hafızaya ekle
  if (action === "train") {
    const { trainEntry } = body;
    if (trainEntry) {
      EDITORIAL_MEMORY.push({
        ...trainEntry,
        timestamp: Date.now(),
        id: `mem_${Date.now()}`
      });
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ success: true, memorySize: EDITORIAL_MEMORY.length })
      };
    }
  }

  if (!text && !headline) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "text or headline required" }) };
  }

  try {
    const startTime = Date.now();

    // 1. Few-shot hızlı eşleşme dene
    const quickMatch = matchFewShot(text, '');
    console.log('Quick match:', quickMatch?.id || 'none');

    // 2. GPT-4o Art Director kararı
    const decision = await runArtDirector(text, headline, referenceImages, openaiKey);
    console.log('Art Director decision:', decision.visualDecision?.strategy);

    // 3. Fotoğraf çözümle — çok kaynaklı paralel arama
    const pexelsKey = process.env.PEXELS_API_KEY;
    const photoResult = await resolvePhoto(decision.visualDecision || {}, pexelsKey);

    const elapsed = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        // Ana kararlar
        headline:        decision.headline        || headline,
        subheadline:     decision.subheadline     || '',
        editorialEmotion: decision.editorialEmotion || '',
        realStory:       decision.realStory        || '',
        artDirectorNote: decision.artDirectorNote  || '',
        fewShotMatch:    decision.fewShotMatch     || quickMatch?.id || null,

        // Görsel karar
        visualDecision:  decision.visualDecision   || {},
        template:        decision.visualDecision?.template || 'photo_panel',
        colorMood:       decision.visualDecision?.colorMood || 'navy_cream',
        collageMode:     decision.collageMode      || false,

        // Prompt ve fotoğraf
        dallePrompt:     decision.dallePrompt      || '',
        photoResult,
        subjects:        decision.visualDecision?.subjects || [],
        photoQuery:      decision.visualDecision?.photoQuery || '',

        // Meta
        _elapsed: elapsed,
        _engine: 'editorial-director-v1',
        _fewShotCount: FEW_SHOT_EXAMPLES.length,
        _memoryCount: EDITORIAL_MEMORY.length
      })
    };

  } catch (err) {
    console.error('Editorial Director error:', err.message);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message, _engine: 'editorial-director-v1' })
    };
  }
};
