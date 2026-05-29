const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

// ════════════════════════════════════════════════════════════════
//  MULTI-SOURCE PHOTO SEARCH
//  Kaynak 1: Pexels       (PEXELS_API_KEY)        — yüksek kalite
//  Kaynak 2: Unsplash     (UNSPLASH_ACCESS_KEY)   — editorial feel
//  Kaynak 3: Pixabay      (PIXABAY_API_KEY)       — haber odaklı
//  Kaynak 4: Wikimedia    (ücretsiz, key yok)     — gerçek haber fotoğrafı
//
//  Strateji: tüm aktif kaynakları paralel çalıştır,
//  en iyi sonuçları birleştir, kaliteye göre sırala
// ════════════════════════════════════════════════════════════════

async function searchPexels(query, orientation, page) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  try {
    const params = new URLSearchParams({
      query, orientation, size: 'large', per_page: '6', page: String(page||1)
    });
    const r = await fetch(`https://api.pexels.com/v1/search?${params}`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(6000) });
    const d = await r.json();
    return (d.photos || []).map(p => ({
      id: 'px_'+p.id, source: 'pexels',
      src_large:   p.src.large2x || p.src.large,
      src_medium:  p.src.medium,
      src_tiny:    p.src.tiny,
      src_portrait: p.src.portrait,
      photographer: p.photographer,
      alt: p.alt || query,
      quality: 3, // 1=low 3=high
    }));
  } catch { return []; }
}

async function searchUnsplash(query, orientation, page) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  try {
    const orient = orientation === 'portrait' ? 'portrait' : 'landscape';
    const params = new URLSearchParams({
      query, orientation: orient, per_page: '6', page: String(page||1),
      order_by: 'relevant', content_filter: 'high'
    });
    const r = await fetch(`https://api.unsplash.com/search/photos?${params}`,
      { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(6000) });
    const d = await r.json();
    return (d.results || []).map(p => ({
      id: 'un_'+p.id, source: 'unsplash',
      src_large:    p.urls.regular,
      src_medium:   p.urls.small,
      src_tiny:     p.urls.thumb,
      src_portrait: p.urls.regular,
      photographer: p.user?.name || 'Unsplash',
      alt: p.alt_description || query,
      quality: 3,
    }));
  } catch { return []; }
}

async function searchPixabay(query, orientation, page) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return [];
  try {
    const orient = orientation === 'portrait' ? 'vertical' : 'horizontal';
    const params = new URLSearchParams({
      key, q: query, orientation: orient,
      image_type: 'photo', safesearch: 'true',
      per_page: '6', page: String(page||1),
      min_width: '1280', order: 'popular'
    });
    const r = await fetch(`https://pixabay.com/api/?${params}`,
      { signal: AbortSignal.timeout(6000) });
    const d = await r.json();
    return (d.hits || []).map(p => ({
      id: 'pb_'+p.id, source: 'pixabay',
      src_large:    p.largeImageURL || p.webformatURL,
      src_medium:   p.webformatURL,
      src_tiny:     p.previewURL,
      src_portrait: p.webformatURL,
      photographer: p.user,
      alt: query,
      quality: 2,
    }));
  } catch { return []; }
}

async function searchWikimedia(query) {
  // Ücretsiz, key yok — Wikipedia Commons görselleri
  // Haber konuları için: yerler, liderler, kurumlar
  try {
    const params = new URLSearchParams({
      action: 'query', list: 'search',
      srsearch: query + ' filetype:bitmap',
      srnamespace: '6', // File namespace
      srlimit: '4', format: 'json', origin: '*'
    });
    const r = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`,
      { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    const files = (d.query?.search || []).map(f => f.title).filter(t => t.match(/\.(jpg|jpeg|png|webp)/i));
    if (!files.length) return [];

    // Dosya URL'lerini al
    const results = [];
    for (const file of files.slice(0,3)) {
      try {
        const infoParams = new URLSearchParams({
          action: 'query', titles: file,
          prop: 'imageinfo', iiprop: 'url|thumb',
          iiurlwidth: '1280', format: 'json', origin: '*'
        });
        const ir = await fetch(`https://commons.wikimedia.org/w/api.php?${infoParams}`,
          { signal: AbortSignal.timeout(4000) });
        const id = await ir.json();
        const pages = Object.values(id.query?.pages || {});
        const info = pages[0]?.imageinfo?.[0];
        if (info?.url) {
          results.push({
            id: 'wm_'+encodeURIComponent(file).slice(0,20),
            source: 'wikimedia',
            src_large:    info.url,
            src_medium:   info.thumburl || info.url,
            src_tiny:     info.thumburl || info.url,
            src_portrait: info.url,
            photographer: 'Wikimedia Commons',
            alt: file.replace('File:','').replace(/_/g,' '),
            quality: 2,
          });
        }
      } catch {}
    }
    return results;
  } catch { return []; }
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "{}" };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { query, orientation = "landscape", page = 1, sources } = body;
  if (!query) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Query required" }) };

  // Hangi kaynaklar aktif?
  const activeSources = sources || ['pexels','unsplash','pixabay','wikimedia'];

  // Paralel arama
  const tasks = [];
  if (activeSources.includes('pexels'))    tasks.push(searchPexels(query, orientation, page));
  if (activeSources.includes('unsplash'))  tasks.push(searchUnsplash(query, orientation, page));
  if (activeSources.includes('pixabay'))   tasks.push(searchPixabay(query, orientation, page));
  if (activeSources.includes('wikimedia')) tasks.push(searchWikimedia(query));

  const results = await Promise.allSettled(tasks);
  const allPhotos = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a,b) => b.quality - a.quality); // Kaliteye göre sırala

  // Kaynak çeşitliliğini koruyarak maks 10 foto döndür
  const seen = new Set();
  const mixed = [];
  for (const p of allPhotos) {
    if (!seen.has(p.source) || mixed.length < 4) {
      mixed.push(p);
      seen.add(p.source);
    }
  }
  const photos = [...mixed, ...allPhotos.filter(p => !mixed.includes(p))].slice(0, 10);

  // Aktif kaynak sayısını bildir
  const activeCount = {
    pexels:    !!process.env.PEXELS_API_KEY,
    unsplash:  !!process.env.UNSPLASH_ACCESS_KEY,
    pixabay:   !!process.env.PIXABAY_API_KEY,
    wikimedia: true, // key yok, her zaman aktif
  };

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ photos, total: photos.length, activeSources: activeCount })
  };
};
