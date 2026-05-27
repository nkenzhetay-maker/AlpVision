const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

// ════════════════════════════════════════════════════════════════
//  ALPVISION — TREND ENGINE
//  Kaynak 1: Dribbble API — editorial/news design trendleri
//  Kaynak 2: YouTube Data API — haber kanalı thumbnail trendleri
//  Haftalık cache: Netlify Blobs
// ════════════════════════════════════════════════════════════════

const CACHE_KEY    = 'alpvision-trends';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün

// ── Netlify Blobs ──
async function readCache() {
  const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_TOKEN;
  if (!siteId || !token) return null;
  try {
    const r = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/blobs/${CACHE_KEY}`,
      { headers:{ Authorization:`Bearer ${token}` }, signal:AbortSignal.timeout(2000) }
    );
    if (!r.ok) return null;
    const data = await r.json();
    // TTL kontrolü
    if (data.fetchedAt && (Date.now() - new Date(data.fetchedAt).getTime()) < CACHE_TTL_MS) {
      return data;
    }
    return null; // Expired
  } catch { return null; }
}

async function writeCache(data) {
  const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_TOKEN;
  if (!siteId || !token) return;
  try {
    await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/blobs/${CACHE_KEY}`,
      { method:'PUT',
        headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ ...data, fetchedAt: new Date().toISOString() }),
        signal: AbortSignal.timeout(3000) }
    );
  } catch {}
}

// ── Dribbble API ──
async function fetchDribbble() {
  const token = process.env.DRIBBBLE_TOKEN;
  if (!token) return [];

  const queries = [
    'editorial news design',
    'news magazine cover',
    'political poster design',
    'breaking news graphic',
  ];

  const results = [];
  for (const q of queries.slice(0, 2)) { // Rate limit için 2 sorgu
    try {
      const r = await fetch(
        `https://api.dribbble.com/v2/shots?q=${encodeURIComponent(q)}&per_page=6&sort=popularity`,
        { headers:{ Authorization:`Bearer ${token}` }, signal:AbortSignal.timeout(5000) }
      );
      if (!r.ok) continue;
      const shots = await r.json();
      if (!Array.isArray(shots)) continue;
      shots.forEach(shot => {
        results.push({
          source:    'dribbble',
          id:        shot.id,
          title:     shot.title,
          thumb:     shot.images?.hidpi || shot.images?.normal || shot.images?.teaser,
          tags:      shot.tags?.slice(0, 5) || [],
          likes:     shot.likes_count || 0,
          url:       shot.html_url,
          color:     shot.animated ? null : extractDominantStyle(shot.title, shot.tags || []),
        });
      });
    } catch {}
  }
  return results.sort((a, b) => b.likes - a.likes).slice(0, 10);
}

// ── YouTube Data API v3 ──
async function fetchYouTubeThumbs() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];

  // Haber kanalları: DW News, Al Jazeera, Reuters, TRT World
  const channelIds = [
    'UCknLrEdhRCp1aegoMqRaCZg', // DW News
    'UCNye-wNBqNL5ZzHSJj3l8Bg', // Al Jazeera English
    'UChqUTb7kYRX8-EiaN3XFrSQ', // Reuters
    'UC8wIHc7RNEimRkV8rCFiJ_Q', // TRT World
  ];

  const results = [];
  for (const channelId of channelIds.slice(0, 2)) {
    try {
      // Kanalın son videolarını çek
      const searchR = await fetch(
        `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&channelId=${channelId}&maxResults=5&order=date&type=video&key=${key}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!searchR.ok) continue;
      const searchData = await searchR.json();
      const items = searchData.items || [];
      items.forEach(item => {
        const sn = item.snippet;
        if (!sn) return;
        results.push({
          source:      'youtube',
          id:          item.id?.videoId,
          title:       sn.title,
          thumb:       sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url,
          channelName: sn.channelTitle,
          publishedAt: sn.publishedAt,
          url:         `https://youtube.com/watch?v=${item.id?.videoId}`,
          color:       'dark', // Haber videoları genelde koyu
        });
      });
    } catch {}
  }
  return results.slice(0, 8);
}

// Tasarım stilini başlık ve taglerden tahmin et
function extractDominantStyle(title, tags) {
  const t = (title + ' ' + tags.join(' ')).toLowerCase();
  if (t.includes('minimal') || t.includes('clean') || t.includes('simple')) return 'minimal';
  if (t.includes('bold') || t.includes('brutalist') || t.includes('strong')) return 'brutalist';
  if (t.includes('dark') || t.includes('black') || t.includes('night')) return 'dark';
  if (t.includes('red') || t.includes('crisis') || t.includes('war')) return 'red';
  if (t.includes('editorial') || t.includes('magazine')) return 'editorial';
  if (t.includes('typograph') || t.includes('type')) return 'typographic';
  return 'editorial';
}

// Trend özetini Claude için metin olarak üret
function buildTrendSummary(dribbble, youtube) {
  const lines = [];

  if (dribbble.length > 0) {
    lines.push('DRIBBBLE EDITORIAL TRENDLER (bu hafta popüler):');
    dribbble.slice(0, 5).forEach((s, i) => {
      lines.push(`  ${i+1}. "${s.title}" — stil: ${s.color || 'editorial'} ${s.tags.length ? '| ' + s.tags.slice(0,3).join(', ') : ''}`);
    });
    // Dominant stiller
    const styles = dribbble.map(s => s.color).filter(Boolean);
    const styleCounts = {};
    styles.forEach(s => { styleCounts[s] = (styleCounts[s]||0)+1; });
    const topStyle = Object.entries(styleCounts).sort((a,b)=>b[1]-a[1])[0];
    if (topStyle) lines.push(`  → Bu hafta dominant stil: ${topStyle[0]}`);
  }

  if (youtube.length > 0) {
    lines.push('\nYOUTUBE HABER THUMBNAIL TRENDLERİ:');
    youtube.slice(0, 4).forEach((v, i) => {
      lines.push(`  ${i+1}. [${v.channelName}] "${v.title.slice(0, 60)}"`);
    });
  }

  return lines.join('\n');
}

// ── HANDLER ──
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"{}" };

  // GET: Trend verilerini getir (cache varsa cache'den)
  if (event.httpMethod === "GET") {
    // Force refresh?
    const forceRefresh = event.queryStringParameters?.refresh === 'true';

    if (!forceRefresh) {
      const cached = await readCache();
      if (cached) {
        console.log('Serving from cache, age:', Math.round((Date.now()-new Date(cached.fetchedAt).getTime())/3600000), 'hours');
        return { statusCode:200, headers:CORS, body:JSON.stringify(cached) };
      }
    }

    // Cache miss veya force refresh — API'lerden çek
    console.log('Fetching fresh trend data...');
    const [dribbble, youtube] = await Promise.allSettled([
      fetchDribbble(),
      fetchYouTubeThumbs(),
    ]);

    const dribbbleItems = dribbble.status === 'fulfilled' ? dribbble.value : [];
    const youtubeItems  = youtube.status  === 'fulfilled' ? youtube.value  : [];

    const result = {
      dribbble:     dribbbleItems,
      youtube:      youtubeItems,
      summary:      buildTrendSummary(dribbbleItems, youtubeItems),
      totalDribbble: dribbbleItems.length,
      totalYoutube:  youtubeItems.length,
      fetchedAt:    new Date().toISOString(),
    };

    // Cache'e yaz (arka planda)
    writeCache(result);

    return { statusCode:200, headers:CORS, body:JSON.stringify(result) };
  }

  return { statusCode:405, headers:CORS, body:JSON.stringify({ error:"Method not allowed" }) };
};
