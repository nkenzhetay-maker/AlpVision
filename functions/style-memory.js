const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

// ════════════════════════════════════════════════════════════════
//  ALPVISION — STYLE MEMORY SYSTEM
//  Netlify Blobs REST API ile kalıcı görsel hafıza
//
//  Saklanan veriler:
//  - Son 30 DALL-E prompt (tekrar önleme)
//  - Son 20 konsept tipi (çeşitlilik)
//  - Son 20 renk şeması (monotonluk önleme)
//  - Son 20 şablon kullanımı (denge)
//  - Son 20 başlık teması (içerik çeşitliliği)
// ════════════════════════════════════════════════════════════════

const SITE_ID    = process.env.SITE_ID;
const NETLIFY_TOKEN = process.env.NETLIFY_TOKEN;
const STORE      = "alpvision-memory";
const MEMORY_KEY = "style-history";
const MAX_PROMPTS   = 30;
const MAX_CONCEPTS  = 20;

// Netlify Blobs REST API
function blobUrl(key) {
  return `https://api.netlify.com/api/v1/blobs/${SITE_ID}/${STORE}/${encodeURIComponent(key)}`;
}

function blobHeaders() {
  return {
    "Authorization": `Bearer ${NETLIFY_TOKEN}`,
    "Content-Type": "application/json"
  };
}

async function readMemory() {
  if (!SITE_ID || !NETLIFY_TOKEN) return null;
  try {
    const r = await fetch(blobUrl(MEMORY_KEY), { headers: blobHeaders() });
    if (!r.ok) return null;
    const text = await r.text();
    return JSON.parse(text);
  } catch { return null; }
}

async function writeMemory(data) {
  if (!SITE_ID || !NETLIFY_TOKEN) return false;
  try {
    const r = await fetch(blobUrl(MEMORY_KEY), {
      method: "PUT",
      headers: blobHeaders(),
      body: JSON.stringify(data)
    });
    return r.ok;
  } catch { return false; }
}

function addToRing(arr, item, max) {
  const next = [item, ...arr.filter(x => x !== item)];
  return next.slice(0, max);
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "{}" };

  // ── GET: Hafızayı oku (analyze.js için) ──
  if (event.httpMethod === "GET") {
    const memory = await readMemory();
    if (!memory) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({
        dallePrompts: [], conceptTypes: [], colorSchemes: [],
        templates: [], themes: [], totalSaved: 0
      })};
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify(memory) };
  }

  // ── POST: Yeni kayıt ekle ──
  if (event.httpMethod === "POST") {
    let body;
    try { body = JSON.parse(event.body || "{}"); } catch {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    // Mevcut hafızayı al
    let memory = await readMemory() || {
      dallePrompts: [], conceptTypes: [], colorSchemes: [],
      templates: [], themes: [], totalSaved: 0,
      lastUpdated: null
    };

    // Yeni veriyi ekle
    if (body.dallePrompt)   memory.dallePrompts  = addToRing(memory.dallePrompts,  body.dallePrompt,   MAX_PROMPTS);
    if (body.conceptType)   memory.conceptTypes  = addToRing(memory.conceptTypes,  body.conceptType,   MAX_CONCEPTS);
    if (body.colorScheme)   memory.colorSchemes  = addToRing(memory.colorSchemes,  body.colorScheme,   MAX_CONCEPTS);
    if (body.template)      memory.templates     = addToRing(memory.templates,     body.template,      MAX_CONCEPTS);
    if (body.theme)         memory.themes        = addToRing(memory.themes,        body.theme,         MAX_CONCEPTS);

    memory.totalSaved  = (memory.totalSaved || 0) + 1;
    memory.lastUpdated = new Date().toISOString();

    const ok = await writeMemory(memory);
    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({ saved: ok, totalSaved: memory.totalSaved })
    };
  }

  // ── DELETE: Hafızayı sıfırla ──
  if (event.httpMethod === "DELETE") {
    const empty = {
      dallePrompts: [], conceptTypes: [], colorSchemes: [],
      templates: [], themes: [], totalSaved: 0,
      lastUpdated: new Date().toISOString()
    };
    await writeMemory(empty);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ reset: true }) };
  }

  return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };
};
