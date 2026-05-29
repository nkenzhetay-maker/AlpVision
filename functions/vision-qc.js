const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

// ════════════════════════════════════════════════════════════════
//  ALPVISION — VISION QC ENGINE
//  Görseli görüp analiz eden kalite kontrol sistemi
//  Claude Vision ile çalışır
// ════════════════════════════════════════════════════════════════

const VISION_SYSTEM = `Sen AlpVision'ın Vision QC motorusun — acımasız bir baş editör.
Sana bir haber görseli gösterilecek. TRT Russian Dijital standartlarında değerlendir.

KESİN CEZA KURALLARI (bunları gör → puanı otomatik düşür):
- Dünya küresi, el sıkışma, büyüteç, takım elbiseli yönetici, yanan bina = noStockFeel'den -3
- Aşırı parlak plastik 3D render, yapay ışıklar, AI kokan görünüm = noAiFeel'den -3
- Neon renkler, absürd, marjinal, kurumsal ağırlıktan uzak = trtCompliance = max 4
- Görsel literal/düz anlam, zekice alt metin yok = visualIdea = max 5 (baraj altı)
- METİN GÜVENLİ ALAN: Alt %25 bant + sol üst köşede yoğun/karmaşık görsel öğe varsa
  (başlık okunmaz olur) = textSafeZone puanından -15
- 80 ALTI TOPLAM = REJECTi → "verdict": "failed" + "regenerate": true

10 kritik soruyu cevapla (1-10 puan):

1. GÖRSEL FİKİR — Klişe değil, zekice metafor var mı? Literal=1-4, Metaforik=7-10
2. TRT UYUMU — Devlet yayıncısı ciddiyeti. Neon/absürd=1-3, Kurumsal=7-10
3. THUMBNAIL GÜCÜ — 50x50'de mesaj anlaşılır mı?
4. TİPOGRAFİ — Rusça metin okunabilirliği
5. KOMPOZİSYON — Odak, göz akışı, denge
6. RENK ETKİSİ — Renk şeması duygusal destek
7. PREMIUM GÖRÜNÜM — Bloomberg/Reuters/Al Jazeera seviyesi
8. AI HİSSİ — Plastik/yapay görünüm YOK mu? (10=asla plastik)
9. STOK HİSSİ — Klişe/jenerik değil? (10=tamamen özgün)
10. SOSYAL PERFORMANS — Scroll durdurucu mu?
11. METİN GÜVENLİ ALAN — Alt %25 ve sol üst köşe: başlık yazan açık alan var mı?
    Karmaşa=1-4, Temiz=7-10. Karmaşa varsa toplam puandan -15.

TOTAL = toplam / 10. Eğer herhangi bir kriter ceza kuralına giriyorsa toplam düşer.

SADECE GEÇERLİ JSON DÖNDÜR:
{
  "scores": {
    "visualIdea": 0,
    "trtCompliance": 0,
    "thumbnailPower": 0,
    "typography": 0,
    "composition": 0,
    "colorImpact": 0,
    "premiumLook": 0,
    "noAiFeel": 0,
    "noStockFeel": 0,
    "textSafeZone": 0,
    "socialPerformance": 0,
    "total": 0
  },
  "regenerate": false,
  "manualApprovalNeeded": false,
  "strongest": "En güçlü element (Rusça)",
  "weakest": "En zayıf element (Rusça)",
  "needsRegeneration": true,
  "verdict": "passed|warning|failed",
  "regenerate": true,
  "fixSuggestion": "Spesifik düzeltme önerisi (Rusça)",
  "oneLineSummary": "Tek cümle özet (Rusça)"
}`;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "{}" };
  if (event.httpMethod !== "POST")   return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { imageBase64, context } = body;

  if (!imageBase64 || imageBase64.length < 100) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Görsel verisi eksik" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "API key eksik" }) };

  // Base64 prefix temizle
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
  const mediaType = imageBase64.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';

  // Context mesajı oluştur
  const contextMsg = context
    ? `Görselin bağlamı:\n- Başlık: ${context.headline || '—'}\n- Kategori: ${context.category || '—'}\n- İçerik tipi: ${context.contentType || '—'}\n- Şablon: ${context.template || '—'}\n\nBu bağlamı göz önünde bulundurarak görseli değerlendir.`
    : 'Bu TRT Russian haber görselini değerlendir.';

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: VISION_SYSTEM,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: cleanBase64
              }
            },
            {
              type: "text",
              text: contextMsg
            }
          ]
        }]
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Vision API error:", res.status, err.slice(0, 200));
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: `API ${res.status}` }) };
    }

    const data = await res.json();
    const raw = data.content?.[0]?.text || "{}";

    // JSON parse
    let parsed;
    const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    try { parsed = JSON.parse(clean); }
    catch {
      const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
      if (s !== -1 && e > s) {
        try { parsed = JSON.parse(clean.slice(s, e + 1)); } catch { parsed = null; }
      }
    }

    if (!parsed) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Vision QC parse hatası", raw: raw.slice(0,200) }) };
    }

    // Total hesapla (yoksa)
    if (!parsed.scores?.total) {
      const sc = parsed.scores || {};
      const vals = Object.values(sc).filter(v => typeof v === 'number');
      parsed.scores.total = vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0) / vals.length * 10) : 0;
    }

    // Verdict belirle (yoksa)
    if (!parsed.verdict) {
      const t = parsed.scores.total;
      parsed.verdict = t >= 80 ? 'passed' : t >= 60 ? 'warning' : 'failed';
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify(parsed) };

  } catch (err) {
    console.error("Vision QC error:", err.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
