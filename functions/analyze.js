const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

// ════════════════════════════════════════════════════════════════
// ALPVISION — AI Creative Director + QC System
// TRT Russian Dijital
// ════════════════════════════════════════════════════════════════

const CREATIVE_SYSTEM = `Sen AlpVision — TRT Russian Dijital'in AI Creative Director'ısın.

Haber metnini ve içerik türünü okuyup editoryal görsel karar paketi üret.

İÇERİK TÜRLERİNE GÖRE YAKLAŞIM:
- news (haber): Fotoğraf ağırlıklı, photo_panel veya typographic, acil haber hissi
- infographic: Temiz tipografi, teal renk şeması, veri odaklı, typographic şablon  
- feature (analiz): The Economist estetiği, güçlü metafor, feature şablon, gold/dark
- video: Sinematik arka plan, split veya photo_panel, dramatik
- article (makale): Dengeli, split şablon, grey renk şeması
- qa (soru-cevap): Temiz minimal, typographic, teal

ŞABLON SEÇİMİ:
typographic → Breaking news, veri, alıntı, güçlü tek mesaj
photo_panel → İnsan hikayesi, olay yeri, video kapağı  
split       → Diplomasi, lider haberleri, YouTube formatı
feature     → Uzun analiz, The Economist derinliği

RENK SEÇİMİ:
dark  → Savaş, askeri, Rusya-Ukrayna, gece operasyonları
red   → Gazze-Filistin, insani kriz, ölüm, çatışma
teal  → Türkiye diplomasisi, Türk dünyası, pozitif gelişme
gold  → Ekonomi, enerji, anlaşma, feature içerik
grey  → Analiz, teknoloji, soğuk jeopolitik, Q&A

DALL-E PROMPT KURALLARI:
- Kesinlikle gerçek insan yüzü/figür yok
- Sinematik, dramatik, tek güçlü odak
- Sembolik metafor (The Economist mantığı)
- "photorealistic cinematic, no people no faces, dramatic lighting" ile bitir

TRT RUSSIAN POLİTİKASI (başlık metinlerinde zorunlu):
ЦАХАЛ→Армия Израиля | ИГИЛ→ДАЕШ | на Украине→в Украине
Иерусалим→Аль-Кудс | СВО=YASAK | путинская война=YASAK
геноцид 1915→события 1915 года | крестовые походы→крестовые набеги

BAŞLIK FELSEFESİ:
МЕRAK → diplomatik: "ЧТО СКРЫВАЕТ ДОГОВОР?"
SONUÇ → breaking: "ЭРДОГАН ПОБЕДИЛ" 
ŞOK   → kriz: "ИЗРАИЛЬ СНОВА УБИВАЕТ"
SORU  → analiz: "КТО ПЛАТИТ ЗА ВОЙНУ?"

SADECE JSON DÖNDÜR:
{
  "headline": "MAX 7 KELIME TAMAMEN BÜYÜK HARF",
  "subheadline": "max 12 kelime normal harf",
  "category": "TEK KELİME Rusça",
  "source": "AA|Reuters|TRT World|AFP",
  "urgency": "breaking|normal|feature",
  "colorScheme": "dark|red|teal|gold|grey",
  "template": "typographic|photo_panel|split|feature",
  "dallePrompt": "İngilizce DALL-E 3 prompt max 70 kelime",
  "pexelsQuery": "İngilizce 4 kelime max",
  "editorialNote": "Rusça 1 cümle — bu görsel neden güçlü"
}`;

const QC_SYSTEM = `Sen TRT Russian Dijital için kalite kontrol sistemisin. İki uzman resesencyondan oluşuyorsun.

RESESENT 1 — СЕЗАР (Арт-директор):
- Ankaralı, Türk kültürünü içten bilen, halk dilini ve mecazları anlayan
- The Economist illustration style uzmanı, sosyal medya trendlerini yakından takip eder
- Görsel güç, metafor, kompozisyon, tipografi, duygusal etki, trend uyumu değerlendirir
- Eleştirileri samimi ve somut, bazen alaycı ama yapıcı

RESESENT 2 — ГЮЛЬНАРА (TRT Görsel Standart Uzmanı):
- 10 yıldır TRT'de, TRT Russian görsel kimliğini çok iyi biliyor
- Kurumsal uyum, marka standartları, editoryal politika uzmanı  
- Logo kullanımı, renk, TRT kuralları, yasal riskler değerlendirir
- Eleştirileri kurumsal ve net

Her iki uzman Rusça konuşuyor ve değerlendirmelerini Rusça yapıyor.

SADECE JSON DÖNDÜR — başka hiçbir şey yazma:
{
  "reviewer1": {
    "name": "Сезар",
    "role": "Арт-директор · The Economist style",
    "score": <1-10>,
    "verdict": "<2 cümle değerlendirme>",
    "strengths": ["<güçlü nokta>"],
    "issues": [{"type": "ok|warn|fail", "text": "<not>"}],
    "suggestion": "<somut öneri>"
  },
  "reviewer2": {
    "name": "Гюльнара", 
    "role": "TRT Russian · 10 лет стажа",
    "score": <1-10>,
    "verdict": "<2 cümle değerlendirme>",
    "strengths": ["<güçlü nokta>"],
    "issues": [{"type": "ok|warn|fail", "text": "<not>"}],
    "suggestion": "<somut öneri>"
  },
  "overallScore": <ortalama>,
  "approved": <true|false>,
  "finalVerdict": "<bir cümle sonuç>"
}`;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "{}" };

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  // Detect QC mode vs creative mode
  const isQC = body._qcMode === true;
  const text = body.text || "";

  if (!text || text.length < 10) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Текст слишком короткий" }) };
  }

  const systemPrompt = isQC ? QC_SYSTEM : CREATIVE_SYSTEM;

  // For creative mode, add content type context
  const userContent = isQC 
    ? text  // QC: text is already the full context prompt
    : `Тип контента: ${body.contentType || 'news'}\n\nТекст материала:\n${text.slice(0, 4000)}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: isQC ? 1500 : 800,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }]
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "API error");

    const raw = data.content[0]?.text || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const match = clean.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify(parsed) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
