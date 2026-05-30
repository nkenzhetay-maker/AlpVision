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
      { headers:{ Authorization:`Bearer ${token}` }, signal: AbortSignal.timeout(2000) }\n    );
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function writeBlob(data) {
  const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_TOKEN;
  if (!siteId || !token) return false;
  try {
    const r = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/blobs/alpvision-style`,
      {
        method: 'PUT',
        headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(2000)
      }
    );
    return r.ok;
  } catch { return false; }
}

// ════════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ════════════════════════════════════════════════════════════════

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "{}" };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  // Frontend 'text' anahtarı ile gönderiyor, tam uyumluluk sağlandı
  const text  = (body.text || body.txt || "").trim();
  const ctype = (body.contentType || body.ctype || "news").toLowerCase();
  const isQC  = !!body.isQC;

  if (!text || text.length < 10) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Текст слишком короткий" }) };
  }

  // Hafızayı yükle (Warm cache veya Netlify Blob API)
  let memory = _warmCache;
  if (!memory) {
    const blob = await readBlob();
    memory = blob || emptyMemory();
    _warmCache = memory;
  }

  // ── SYSTEM PROMPT SEÇİMİ VE MANİPÜLASYONU ──
  let system = buildSystemPrompt(ctype, isQC, memory);
  
  // Frontend'den gelen editoryal alternatif zorlaması (finalSystem) varsa promptun sonuna ekle
  if (body.finalSystem) {
    system += body.finalSystem;
  }

  // Netlify logları için strateji takibi
  if (body._altMode) {
    console.log(`[ALPVISION ALTERNATIVE MODE] Strategy triggered: ${body._strategy}`);
  }

  // Claude içerik paketi limit ayarı
  const content = `Target News Text:\n"""\n${text}\n"""`;
  const maxTok  = isQC ? 1500 : 1000;

  let parsed = null;
  let engine = 'claude35';

  // ── MODEL TETİKLEME ZİNCİRİ (CLAUDE-3.5-SONNET -> Fallback: GPT-4O) ──
  try {
    const raw = await callClaude(system, content, maxTok);
    parsed = safeParse(raw);
    if (!parsed) { parsed = safeParse(extractJsonFallback(raw)); }
  } catch (claudeErr) {
    console.warn("Claude failed, switching to GPT:", claudeErr.message);
    try {
      const raw = await callGPT(system, content, maxTok);
      parsed = safeParse(raw);
      if (parsed) engine = 'gpt4o';
    } catch (gptErr) {
      console.error("Both models failed:", gptErr.message);
    }
  }

  // İki model de kilitlenirse sistemin çökmemesi için Fallback üretimi tetikle
  if (!parsed) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ...buildFallback(text), _engine: 'fallback' }) };
  }

  // Yasaklı jenerik kategorileri filtreleme ve düzeltme
  const blocked = ['НОВОСТИ','NEWS','HABER','VIDEO','ВИДЕО','FEATURE','СТАТЬЯ','ARTICLE','INFOGRAPHIC','ИНФОГРАФИКА'];
  if (blocked.includes((parsed.category || '').toUpperCase().trim())) {
    parsed.category = 'МИРОВЫЕ';
  }

  // ── BAŞARILI ANALİZ -> MEMORY'E KAYDET (ARKA PLAN) ──
  // Editörlük/Dergi formatı için Pexels stok fotoğraf modunu kapatıp DALL-E'ye yönlendir
  if (!isQC && ['feature', 'article', 'qa'].includes(ctype)) {
    parsed.pexelsQuery = ''; // Stok görsel yasaklandı
    
    // DALL-E promptu için The Economist çizim kural setlerini ekle
    if (parsed.dallePrompt && !parsed.dallePrompt.includes('matte gouache')) {
      parsed.dallePrompt += '. Matte gouache texture, clean flat colors, sharp fine ink lines, 40% empty negative space, solid cream background, no typography, single direct visual metaphor in the style of The Economist illustration.';
    }
  }

  if (!isQC && parsed.dallePrompt) {
    // Hafıza yüzüğünü güncelle (Aynı konseptlerin tekrarını önlemek için)
    memory.prompts = pushRing(memory.prompts, parsed.dallePrompt, 30);
    if (parsed.conceptType) memory.concepts = pushRing(memory.concepts, parsed.conceptType, 20);
    if (parsed.colorScheme) memory.colors = pushRing(memory.colors, parsed.colorScheme, 20);
    memory.totalCount = (memory.totalCount || 0) + 1;
    _warmCache = memory;
    
    // Arka planda asenkron olarak Netlify Blob'a yaz (Yanıtı geciktirmemek için await kullanılmadı)
    writeBlob(memory).catch(() => {});
  }

  // UI katmanına hafıza bilgisini ve motor adını dön
  parsed.styleMemoryCount = memory.totalCount || 0;
  parsed._engine = engine;

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify(parsed)
  };
};

// ════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS & PROMPTS
// ════════════════════════════════════════════════════════════════

function buildSystemPrompt(ctype, isQC, mem) {
  if (isQC) {
    return `You are the Lead Visual Quality Control AI for TRT Russian. Your job is to review editorial assets against premium design rules. Output valid JSON only.`;
  }
