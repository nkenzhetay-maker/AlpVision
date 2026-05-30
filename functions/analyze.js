const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

let _warmCache = null;

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

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "{}" };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const text  = (body.text || body.txt || "").trim();
  const ctype = (body.contentType || body.ctype || "news").toLowerCase();
  const isQC  = !!body.isQC;

  if (!text || text.length < 10) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Текст слишком короткий" }) };
  }

  let memory = _warmCache;
  if (!memory) {
    const blob = await readBlob();
    memory = blob || emptyMemory();
    _warmCache = memory;
  }

  let system = buildSystemPrompt(ctype, isQC, memory);
  
  if (body.finalSystem) {
    system += body.finalSystem;
  }

  if (body._altMode) {
    console.log(`[ALPVISION ALTERNATIVE MODE] Strategy triggered: ${body._strategy}`);
  }

  const content = `Target News Text:\n"""\n${text}\n"""`;
  const maxTok  = isQC ? 1500 : 1000;

  let parsed = null;
  let engine = 'claude35';

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

  if (!parsed) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ...buildFallback(text), _engine: 'fallback' }) };
  }

  const blocked = ['НОВОСТИ','NEWS','HABER','VIDEO','ВИДЕО','FEATURE','СТАТЬЯ','ARTICLE','INFOGRAPHIC','ИНФОГРАФИКА'];
  if (blocked.includes((parsed.category || '').toUpperCase().trim())) {
    parsed.category = 'МИРОВЫЕ';
  }

  if (!isQC && ['feature', 'article', 'qa'].includes(ctype)) {
    parsed.pexelsQuery = ''; 
    if (parsed.dallePrompt && !parsed.dallePrompt.includes('matte gouache')) {
      parsed.dallePrompt += '. Matte gouache texture, clean flat colors, sharp fine ink lines, 40% empty negative space, solid cream background, no typography, single direct visual metaphor in the style of The Economist illustration.';
    }
  }

  if (!isQC && parsed.dallePrompt) {
    memory.prompts = pushRing(memory.prompts, parsed.dallePrompt, 30);
    if (parsed.conceptType) memory.concepts = pushRing(memory.concepts, parsed.conceptType, 20);
    if (parsed.colorScheme) memory.colors = pushRing(memory.colors, parsed.colorScheme, 20);
    memory.totalCount = (memory.totalCount || 0) + 1;
    _warmCache = memory;
    writeBlob(memory).catch(() => {});
  }

  parsed.styleMemoryCount = memory.totalCount || 0;
  parsed._engine = engine;

  return { statusCode: 200, headers: CORS, body: JSON.stringify(parsed) };
};

function buildSystemPrompt(ctype, isQC, mem) {
  if (isQC) return `You are the Lead Visual Quality Control AI for TRT Russian. Output valid JSON only.`;
  const avoidPrompts  = (mem.prompts  || []).slice(-4).map(p => `- ${p}`).join("\n");
  const avoidConcepts = (mem.concepts || []).slice(-5).join(", ");
  const avoidColors   = (mem.colors   || []).slice(-5).join(", ");

  let base = `You are the Lead Editorial Art Director for The Economist and TRT Russian. 
Your core task is to analyze news stories and transform them into highly intellectual, minimalist visual metaphors.

CRITICAL DESIGN RULES:
1. NEVER use cliché or literal representations. Find an indirect symbolic representation.
2. Maintain elite editorial status: Heavy use of negative/empty space (40%+ space should be plain background).
3. The style must be clean vector/matte gouache drawing with fine ink lines on a solid muted background.
4. ABSOLUTELY NO text, typography, letters, or characters inside the artwork prompt.

`;

  if (avoidConcepts || avoidColors) {
    base += `STYLE MEMORY PROTECTION (DO NOT REPEAT THESE RECENT CONCEPTS/COLORS):\n`;
    if (avoidConcepts) base += `- Avoid repeating these concepts/symbols: ${avoidConcepts}\n`;
    if (avoidColors)   base += `- Avoid repeating these dominant color schemes: ${avoidColors}\n`;
    if (avoidPrompts)  base += `Recent precise prompts to avoid:\n${avoidPrompts}\n`;
    base += `Force yourself to think of a completely fresh perspective.\n\n`;
  }

  base += `You MUST respond with a strictly valid JSON object matching this schema:
{
  "category": "SHORT UPPERCASE CATEGORY (1-2 words)",
  "headline": "Punchy, short Russian headline",
  "subheading": "Detailed Russian subtitle",
  "economistMetaphor": "Detailed English explanation of the creative metaphor",
  "dallePrompt": "Conceptual English prompt for DALL-E 3. NO TEXT.",
  "colorScheme": "Specify dominant colors",
  "template": "${ctype}"
}`;
  return base;
}

async function callClaude(system, content, maxTok) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-3-5-sonnet-20241022", max_tokens: maxTok, system: system, messages: [{ role: "user", content: content }] }),
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error(`Claude API error ${r.status}`);
  const d = await r.json();
  return d.content?.[0]?.text || "";
}

async function callGPT(system, content, maxTok) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o", max_tokens: maxTok, temperature: 0.3, messages: [ { role: "system", content: system }, { role: "user", content: content } ] }),
    signal: AbortSignal.timeout(6000)
  });
  if (!r.ok) throw new Error(`GPT API error ${r.status}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

function pushRing(arr, item, max) {
  let copy = [...(arr || [])];
  copy.push(item);
  if (copy.length > max) copy.shift();
  return copy;
}

function safeParse(str) {
  if (!str) return null;
  try { return JSON.parse(str.trim()); } catch { return null; }
}

function extractJsonFallback(str) {
  const start = str.indexOf("{");
  const end = str.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return str.slice(start, end + 1);
  return "";
}

function buildFallback(text) {
  return { category: "ГЛОБАЛЬНО", headline: "Анализ завершен", subheading: text.slice(0, 100) + "...", economistMetaphor: "Minimalist layout.", dallePrompt: "Minimalist concept illustration.", colorScheme: "dark", template: "news" };
}
