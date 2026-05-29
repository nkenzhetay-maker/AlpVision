const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

// ════════════════════════════════════════════════════════════════
//  LUMA LABS — Dream Machine Image Generation
//  Model: photon-flash-1 (hızlı) veya photon-1 (premium)
//  TRT Russian haber görselleri için sinematik AI arka plan
// ════════════════════════════════════════════════════════════════

const LUMA_BASE = 'https://api.lumalabs.ai/dream-machine/v1';

async function createGeneration(prompt, model = 'photon-flash-1') {
  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) throw new Error('LUMA_API_KEY env variable eksik');

  const r = await fetch(`${LUMA_BASE}/generations/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      prompt,
      aspect_ratio: '16:9', // Haber görseli için
    })
  });

  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Luma API ${r.status}: ${err.slice(0, 300)}`);
  }
  return await r.json();
}

async function pollGeneration(id, maxWait = 55000) {
  const apiKey = process.env.LUMA_API_KEY;
  const start  = Date.now();
  const delay  = 2000; // 2sn aralıkla kontrol

  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, delay));

    const r = await fetch(`${LUMA_BASE}/generations/${id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!r.ok) continue;
    const gen = await r.json();

    if (gen.state === 'completed' && gen.assets?.image) {
      return gen.assets.image; // URL döner
    }
    if (gen.state === 'failed') {
      throw new Error('Luma generation failed: ' + (gen.failure_reason || 'unknown'));
    }
    // 'pending' veya 'processing' → bekle
  }
  throw new Error('Luma zaman aşımı (55sn)');
}

async function urlToBase64(imageUrl) {
  const r = await fetch(imageUrl);
  if (!r.ok) throw new Error(`Image fetch failed: ${r.status}`);
  const buffer = await r.buffer();
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '{}' };
  if (event.httpMethod !== 'POST')   return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { prompt, model = 'photon-flash-1' } = body;

  if (!prompt || prompt.length < 5) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Prompt eksik' }) };
  }

  try {
    // 1. Generation başlat
    const gen = await createGeneration(prompt, model);
    const genId = gen.id;
    console.log(`Luma generation started: ${genId}`);

    // 2. Tamamlanmasını bekle (polling)
    const imageUrl = await pollGeneration(genId);
    console.log(`Luma completed: ${imageUrl.slice(0, 80)}`);

    // 3. URL'den base64'e çevir
    const base64 = await urlToBase64(imageUrl);

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ base64, url: imageUrl, model, genId })
    };

  } catch (err) {
    console.error('Luma error:', err.message);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message })
    };
  }
};
