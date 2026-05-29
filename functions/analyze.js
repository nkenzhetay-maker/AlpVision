const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

// ════════════════════════════════════════════════════════════════
//  STYLE MEMORY — Netlify Blobs ile kalıcı görsel hafıza
//  Tekrar eden promptları, renkleri, konseptleri önler
// ════════════════════════════════════════════════════════════════

let _warmCache = null; // Lambda container warm cache

function emptyMemory() {
  return { prompts:[], concepts:[], colors:[], templates:[], totalCount:0 };
}

async function readBlob() {
  const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_TOKEN;
  if (!siteId || !token) return null;
  try {
    const r = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/blobs/alpvision-style`,
      { headers:{ Authorization:`Bearer ${token}` }, signal: AbortSignal.timeout(2000) }
    );
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function writeBlob(data) {
  const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_TOKEN;
  if (!siteId || !token) return;
  try {
    await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/blobs/alpvision-style`,
      { method:'PUT',
        headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(2000) }
    );
  } catch {}
}


// ── TREND FEED — haftalık cache'den yükle ──
async function fetchTrends() {
  try {
    const base = process.env.URL || 'https://alpvision.netlify.app';
    const r = await fetch(`${base}/.netlify/functions/trend-feed`, {
      signal: AbortSignal.timeout(3000)
    });
    if (!r.ok) return '';
    const data = await r.json();
    if (!data.summary || data.totalDribbble === 0 && data.totalYoutube === 0) return '';
    return `\n\n════ TREND ENGINE — BU HAFTA ════\n${data.summary}\n══════════════════════════════════`;
  } catch { return ''; }
}

async function getMemory() {
  if (_warmCache) return _warmCache;
  const blob = await readBlob();
  _warmCache = blob || emptyMemory();
  return _warmCache;
}

async function saveMemory(result) {
  const mem = _warmCache || emptyMemory();
  const push = (arr, val, max) => { arr.unshift(val); if(arr.length > max) arr.length = max; };

  if (result.dallePrompt)  push(mem.prompts,   result.dallePrompt.slice(0,120), 30);
  if (result.colorScheme)  push(mem.colors,    result.colorScheme, 20);
  if (result.template)     push(mem.templates, result.template, 20);

  const selectedConcept = result.concepts?.find(x => x.id === result.selectedConcept);
  if (selectedConcept?.type) push(mem.concepts, selectedConcept.type, 20);

  mem.totalCount = (mem.totalCount || 0) + 1;
  mem.updatedAt  = new Date().toISOString();
  _warmCache = mem;
  writeBlob(mem); // arka planda — response'u bekleme
}

// Hafızadan "kaçın" listesi üret
function buildAvoidSection(mem) {
  if (!mem || mem.totalCount === 0) return '';

  const lines = [];

  // Son 8 DALL-E prompt — tekrar etme
  if (mem.prompts.length > 0) {
    lines.push('SON DALLE PROMPTLAR (tekrar etme, farklı kompozisyon üret):');
    mem.prompts.slice(0, 8).forEach((p, i) => lines.push(`  ${i+1}. ${p}`));
  }

  // En az kullanılan konsept tipini öner
  const allConcepts = ['economist_metaphor','cinematic_crop','symbolic','brutalist',
    'map_power','magazine_cover','infographic_hybrid','reuters_modern'];
  const cCounts = {};
  mem.concepts.forEach(c => { cCounts[c] = (cCounts[c]||0)+1; });
  const freshConcepts = allConcepts.filter(c => !cCounts[c]).slice(0, 3);
  const staleConcepts = [...new Set(mem.concepts.slice(0, 4))];

  if (staleConcepts.length) lines.push(`\nKonsept tipler — SON KULLANILAN (kaçın): ${staleConcepts.join(', ')}`);
  if (freshConcepts.length) lines.push(`Konsept tipler — ÖNERİLEN (hiç kullanılmamış): ${freshConcepts.join(', ')}`);

  // Renk çeşitliliği
  const allColors = ['dark','red','teal','gold','grey'];
  const colCounts = {};
  mem.colors.forEach(c => { colCounts[c] = (colCounts[c]||0)+1; });
  const freshColor = allColors.sort((a,b) => (colCounts[a]||0)-(colCounts[b]||0))[0];
  const recentColors = [...new Set(mem.colors.slice(0, 3))];
  if (recentColors.length) lines.push(`\nRenk şeması — SON (kaçın): ${recentColors.join(', ')}`);
  if (freshColor) lines.push(`Renk şeması — ÖNERİLEN: ${freshColor}`);

  lines.push(`\nToplam üretim sayısı: ${mem.totalCount}`);

  return `\n\n════ STYLE MEMORY — ÇEŞİTLİLİK İÇİN ════\n${lines.join('\n')}\n══════════════════════════════════════════`;
}

// ════════════════════════════════════════════════════════════════
//  EDITORIAL SYSTEM PROMPT — 13 Soru + Memory-aware
// ════════════════════════════════════════════════════════════════

function buildSystem(avoidSection) {
  return `Sen AlpVision — TRT Russian Dijital'in AI Creative Director ve Editorial Intelligence Engine'isin.

Görsel üretmeden önce haberi 13 sorudan geçir. Bu sorular senin düşünme motorundur.

SORU 1 — HABERİ ANLAMA: Gerçek merkez? Yüzey değil derinlik. Kim kazandı/kaybetti? Güç dengesi?
SORU 2 — DUYGU: Tek duygu seç: Güç|Tehdit|Barış|Kaos|Kontrol|Strateji|Yakınlaşma|Çatışma|Zafer
SORU 3 — JEOPOLİTİK: Hangi bölgeler? Harita gerekli mi? Dominant ülke? Semboller?
SORU 4 — SOSYAL MEDYA: Scroll-stopper ne? Thumbnail 50x50'de çalışır mı? 1.7 saniye testi?
SORU 5 — 3 ZORUNLU KONSEPT (her biri farklı gazetecilik tarzı):
  ALT-1 (METAFORİK): The Economist tarzı — tek güçlü sembol/nesne metaforu
  ALT-2 (ANALİTİK): Veri/harita odaklı — haberin kritik sayısı veya coğrafyası
  ALT-3 (EDİTÖRYEL): Tipografi + renk + form — güçlü kelime/sayı ön plana
SORU 6 — METAFOR: Satranç|Harita|Gölge|Çatlak|Bayrak|Köprü|Yangın|Maske|Duvar|Ayna
SORU 7 — KOMPOZİSYON: Ana odak? Göz akışı? Crop? Denge?
SORU 8 — TRT KONTROLÜ: TRT estetiği? Clickbait değil? Devlet yayıncısı tonu?
  POLİTİKA: ЦАХАЛ→Армия Израиля | ИГИЛ→ДАЕШ | на Украине→в Украине | Иерусалим→Аль-Кудс
  Персидский залив→Басрийский залив | СВО=YASAK | путинская война=YASAK
  геноцид 1915→события 1915 года | Türkiye: her zaman nötr/olumlu
SORU 9 — SİNEMATİK: Derinlik? Işık dramatik? Premium görünüm?
SORU 10 — KALİTESİZLİK: Stok hissi? AI plastik? Sadece gradient+başlık? Görsel fikir yok? → REDDET
SORU 11 — ALTERNATİF: The Economist nasıl yapardı? Reuters nasıl çözerdi?
SORU 12 — FORMAT: Instagram 4:5 güçlü merkez? Telegram koyu mod? Twitter scroll-stopper?
SORU 13 — SON KARAR: "BBC paylaşır mıydı?" Hayırsa → yeniden üret

BAŞLIK: Max 7 kelime. TAMAMEN BÜYÜK HARF. Güçlü eylem fiili.
DALL-E — TRT YARATICILIK ANAYASASI:
Asla klişe: el sıkışma, yanan bina, küre, bayrak, stok görsel hissi.
Her zaman: özgün metafor, editöryal illüstrasyon tarzı, entelektüel hiciv.
Konsept tipine göre:
  economist_metaphor → sade pastel zemin, TEK güçlü nesne (satranç taşı, terazi, bozuk para, kapı)
  map_power → haritalı kompozisyon, ışık dramatik, güç hissi
  cinematic_crop → sinematik kare, derin gölge, tek odak
  symbolic → soyut sembol, kavramsal, net ama düşündürücü
  brutalist → güçlü tipografik form, geometrik sertlik
Max 80 kelime. "editorial illustration, no people no faces, photorealistic" ile bitir.
Kurumsal tonlar: lacivert, koyu kırmızı, asil gri — neon veya pastel kaçın.
KALİTE: creativity+newsImpact+thumbnailPower+trtCompliance+mobileReadability+metaphorStrength+premiumLook+globalStandard+socialPerformance+editorialIntel → 80+ = passed
${avoidSection}

SADECE GEÇERLİ JSON DÖNDÜR:
{
  "editorialAnalysis":{"realCenter":"Rusça","dominantEmotion":"Rusça","powerDynamic":"Rusça","psychologicalCore":"Rusça","socialMediaHook":"Rusça","geopoliticalWeight":"Rusça","thumbnailTest":"Rusça","metaphorObject":"Rusça"},
  "concepts":[
    {"id":1,"type":"economist_metaphor|cinematic_crop|symbolic|brutalist|map_power|magazine_cover|infographic_hybrid|reuters_modern","title":"Rusça","description":"Rusça 3 cümle","whyStrong":"Rusça","scores":{"creativity":0,"newsImpact":0,"thumbnailPower":0,"trtCompliance":0,"mobileReadability":0,"metaphorStrength":0,"premiumLook":0,"globalStandard":0,"socialPerformance":0,"editorialIntel":0,"total":0}},
    {"id":2,"type":"...","title":"...","description":"...","whyStrong":"...","scores":{"creativity":0,"newsImpact":0,"thumbnailPower":0,"trtCompliance":0,"mobileReadability":0,"metaphorStrength":0,"premiumLook":0,"globalStandard":0,"socialPerformance":0,"editorialIntel":0,"total":0}},
    {"id":3,"type":"...","title":"...","description":"...","whyStrong":"...","scores":{"creativity":0,"newsImpact":0,"thumbnailPower":0,"trtCompliance":0,"mobileReadability":0,"metaphorStrength":0,"premiumLook":0,"globalStandard":0,"socialPerformance":0,"editorialIntel":0,"total":0}}
  ],
  "selectedConcept":1,
  "selectionReason":"Rusça",
  "headline":"RUSÇA MAX 7 KELİME BÜYÜK HARF",
  "subheadline":"Rusça max 12 kelime",
  "category":"SADECE KONU — ИРАН/ГАЗА/ТУРЦИЯ/УКРАИНА/ЭКОНОМИКА vb",
  "source":"AA|Reuters|TRT World|AFP",
  "urgency":"breaking|normal|feature",
  "colorScheme":"dark|red|teal|gold|grey",
  "template":"typographic|photo_panel|split|feature",
  "dallePrompt":"English max 80 words no people no faces cinematic",
  "pexelsQuery":"English 4 words",
  "platformNotes":{"instagram":"Rusça","telegram":"Rusça"},
  "qualityGate":"passed|failed",
  "visualNote":"Rusça 1 cümle"
}`;
}


const FAST_SYSTEM = `Sen AlpVision'ın hızlı analiz motorusun — 15 saniyede sonuç üret.
TRT Russian için acil/breaking haber görseli.

Kısa analiz yap, hızlı karar ver. SADECE JSON:
{
  "editorialAnalysis":{"realCenter":"Rusça 1 cümle","dominantEmotion":"tek kelime","psychologicalCore":"Rusça","socialMediaHook":"Rusça","thumbnailTest":"OK|FAIL"},
  "concepts":[{"id":1,"type":"typographic|photo_panel","title":"Rusça","description":"Rusça 1 cümle","whyStrong":"Rusça","scores":{"creativity":7,"newsImpact":8,"thumbnailPower":7,"trtCompliance":9,"mobileReadability":8,"metaphorStrength":5,"premiumLook":7,"globalStandard":7,"socialPerformance":7,"editorialIntel":6,"total":71}}],
  "selectedConcept":1,"selectionReason":"Быстрый режим",
  "headline":"РУССКИЙ МАКС 7 СЛОВ ЗАГЛАВНЫЕ",
  "subheadline":"Rusça max 8 kelime",
  "category":"KONU KELİMESİ",
  "source":"AA|Reuters|TRT World|AFP",
  "urgency":"breaking",
  "colorScheme":"dark|red",
  "template":"typographic|photo_panel",
  "dallePrompt":"",
  "pexelsQuery":"English 3 words breaking news",
  "platformNotes":{"instagram":"Быстро","telegram":"Быстро"},
  "qualityGate":"passed",
  "visualNote":"Быстрый режим — 15 сек"
}
TRT POLİTİKA: ЦАХАЛ→Армия Израиля | ИГИЛ→ДАЕШ | на Украине→в Украине | СВО=YASAK`;

const QC_SYSTEM = `Sen TRT Russian QC panelinin 2 uzman hakemisin.
СЕЗАР (Арт-директор, Анкара): The Economist tarzı, görsel zeka, thumbnail psikolojisi. Samimi, doğrudan.
ГЮЛЬНАРА (TRT 10 yıl): Kurumsal kimlik, TRT kuralları, marka standartları. Net, kurumsal.
Her ikisi Rusça. SADECE JSON:
{"reviewer1":{"name":"Сезар","role":"Арт-директор","score":0,"verdict":"Rusça","strengths":["string"],"issues":[{"type":"ok|warn|fail","text":"string"}],"suggestion":"Rusça"},"reviewer2":{"name":"Гюльнара","role":"TRT Russian · 10 лет","score":0,"verdict":"Rusça","strengths":["string"],"issues":[{"type":"ok|warn|fail","text":"string"}],"suggestion":"Rusça"},"overallScore":0,"approved":true,"finalVerdict":"Rusça"}`;

// ════════════════════════════════════════════════════════════════
//  API ÇAĞIRICI — Claude önce, GPT-4o yedek
// ════════════════════════════════════════════════════════════════

async function callClaude(system, content, maxTok) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},
    body: JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:maxTok, system, messages:[{role:"user",content}] })
  });
  if (!r.ok) { const e = await r.text(); throw new Error(`Claude ${r.status}: ${e.slice(0,200)}`); }
  const d = await r.json();
  return d.content?.[0]?.text || "{}";
}

async function callGPT(system, content, maxTok) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
    body: JSON.stringify({ model:"gpt-4o", max_tokens:maxTok, temperature:0.3,
      messages:[{role:"system",content:system},{role:"user",content}] })
  });
  if (!r.ok) { const e = await r.text(); throw new Error(`GPT ${r.status}: ${e.slice(0,200)}`); }
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "{}";
}

function safeParse(raw) {
  if (!raw) return null;
  for (const s of [raw, raw.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim()]) {
    try { return JSON.parse(s); } catch {}
  }
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
  if (s !== -1 && e > s) { try { return JSON.parse(raw.slice(s, e+1)); } catch {} }
  return null;
}

function buildFallback(text) {
  return {
    editorialAnalysis:{realCenter:"Анализ недоступен",dominantEmotion:"Нейтральный",
      powerDynamic:"—",psychologicalCore:"—",socialMediaHook:"TRT Russian",
      geopoliticalWeight:"—",thumbnailTest:"OK",metaphorObject:"—"},
    concepts:[{id:1,type:"photo_panel",title:"Базовый шаблон",
      description:"Фото + заголовок — повторите анализ",whyStrong:"Базовый режим",
      scores:{creativity:5,newsImpact:6,thumbnailPower:6,trtCompliance:9,
        mobileReadability:7,metaphorStrength:3,premiumLook:5,globalStandard:5,
        socialPerformance:5,editorialIntel:4,total:55}}],
    selectedConcept:1,selectionReason:"Базовый режим",
    headline:text.slice(0,60).toUpperCase().split(/\s+/).slice(0,7).join(' '),
    subheadline:"",category:"МИРОВЫЕ",source:"TRT Russian",urgency:"normal",
    colorScheme:"dark",template:"photo_panel",
    dallePrompt:"dramatic news background dark atmospheric lighting no people no faces cinematic",
    pexelsQuery:"news breaking dramatic",
    platformNotes:{instagram:"Базовый режим",telegram:"Базовый режим"},
    qualityGate:"failed",visualNote:"Повторите анализ"
  };
}

// ════════════════════════════════════════════════════════════════
//  HANDLER
// ════════════════════════════════════════════════════════════════

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return {statusCode:200,headers:CORS,body:"{}"};
  if (event.httpMethod !== "POST")   return {statusCode:405,headers:CORS,body:JSON.stringify({error:"Method not allowed"})};

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return {statusCode:400,headers:CORS,body:JSON.stringify({error:"Invalid JSON"})}; }

  const isQC    = body._qcMode  === true;
  const isFast  = body._fastMode === true;
  const text  = (body.text || "").trim();
  const ctype = body.contentType || "news";

  if (!text || text.length < 10)
    return {statusCode:400,headers:CORS,body:JSON.stringify({error:"Текст слишком короткий"})};

  // ── Style Memory + Trend Feed paralel yükle ──
  let avoidSection = '';
  let trendSection = '';
  if (!isQC && !isFast) {
    const [mem, trends] = await Promise.allSettled([
      getMemory(),
      fetchTrends(),
    ]);
    if (mem.status === 'fulfilled') avoidSection = buildAvoidSection(mem.value);
    if (trends.status === 'fulfilled' && trends.value) trendSection = trends.value;
  }

  const system  = isQC ? QC_SYSTEM : isFast ? FAST_SYSTEM : buildSystem(avoidSection);
  const content = isQC
    ? text
    : `Тип контента: ${ctype}\n\nТекст материала:\n${text.slice(0, 4000)}${trendSection}`;
  const maxTok  = isQC ? 1200 : isFast ? 600 : 2200;

  // Claude önce, GPT-4o yedek
  let parsed = null;
  let engine = 'none';

  try {
    const raw = await callClaude(system, content, maxTok);
    parsed = safeParse(raw);
    if (parsed && (parsed.headline || parsed.reviewer1)) { engine = 'claude'; }
    else { parsed = null; throw new Error("Claude invalid JSON"); }
  } catch (claudeErr) {
    console.warn("Claude failed:", claudeErr.message);
    try {
      const raw = await callGPT(system, content, maxTok);
      parsed = safeParse(raw);
      if (parsed) engine = 'gpt4o';
    } catch (gptErr) {
      console.error("Both failed:", gptErr.message);
    }
  }

  if (!parsed) {
    return {statusCode:200,headers:CORS,body:JSON.stringify({...buildFallback(text),_engine:'fallback'})};
  }

  // Kategori filtrele
  const blocked = ['НОВОСТИ','NEWS','HABER','VIDEO','ВИДЕО','FEATURE','СТАТЬЯ','ARTICLE','INFOGRAPHIC','ИНФОГРАФИКА'];
  if (blocked.includes((parsed.category||'').toUpperCase().trim())) parsed.category = 'МИРОВЫЕ';

  // ── Başarılı analiz → memory'e kaydet (arka planda) ──
  if (!isQC) saveMemory(parsed);

  return {statusCode:200,headers:CORS,body:JSON.stringify({...parsed,_engine:engine,_memoryItems:_warmCache?.totalCount||0})};
};
