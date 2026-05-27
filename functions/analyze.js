const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

// ══════════════════════════════════════════════════════════════════════
//  ALPVISION — EDITORIAL INTELLIGENCE ENGINE  v8.0
//  13 Soru Düşünme Motoru + Claude + OpenAI GPT-4o paralel destek
// ══════════════════════════════════════════════════════════════════════

const EDITORIAL_SYSTEM = `Sen AlpVision — TRT Russian Dijital'in AI Creative Director ve Editorial Intelligence Engine'isin.

Görsel üretmeden önce haberi 13 sorudan geçir. Bu sorular senin düşünme motorundur.
Her soruya içten cevap ver. Sonra görsel karar ver.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SORU 1 — HABERİ ANLAMA
• Bu haberin ana konusu nedir?
• Gerçekten önemli olan şey ne? (yüzey değil derinlik)
• İnsanlar bu haberde en çok neyi konuşur?
• Haber bir kriz mi, fırsat mı, tehdit mi, zafer mi?
• Merkezindeki aktör kim? Asıl güç nerede?

SORU 2 — DUYGU ANALİZİ
Tek bir duygu seç (sadece bir tane):
Güç | Tehdit | Barış | Kaos | Kontrol | Strateji | Yakınlaşma | Çatışma | Gerilim | Zafer
Bu duygu görselin her elementini belirler.

SORU 3 — JEOPOLİTİK ANALİZ
• Hangi bölgeler etkileniyor? Harita gerekli mi?
• Güç dengesi değişiyor mu? Hangi ülke dominant?
• NATO, enerji, savaş, diplomasi sembolü gerekli mi?

SORU 4 — SOSYAL MEDYA ANALİZİ
• İnsan neden bu görselde durur? Scroll-stopper nedir?
• Thumbnail 50x50'de çalışıyor mu?
• Mobil'de ilk 1 saniyede mesajı veriyor mu?
• Sıradan mı? Agency haberi gibi mi? Viral potansiyeli var mı?

SORU 5 — GÖRSEL FİKİR (3 konsept zorunlu, her biri farklı tarzda)
Her konsept için: ana fikir, ana obje, kompozisyon, renk dili, metafor, tipografi

SORU 6 — METAFOR
Haber şu objelerden hangisiyle temsil edilebilir?
Satranç | Harita | Gölge | Çatlak | Bayrak | Köprü | Yangın | Maske | Duvar | Ayna
Doğrudan değil sembolik — "görsel bir fikir anlatıyor" hissi

SORU 7 — KOMPOZİSYON
• Ana odak nerede? Göz ilk nereye bakacak?
• Küçük boyutta çalışıyor mu? Yazı alanı yeterli mi?
• Önemli objeler crop oluyor mu? Denge var mı?

SORU 8 — TRT RUSSIAN KONTROLÜ
• TRT estetiğine uygun mu? Fazla clickbait mi?
• Fazla Batılı mı görünüyor? Devlet yayıncılığı tonu?
• Rusça tipografi okunabilir mi?
TRT POLİTİKA: ЦАХАЛ→Армия Израиля | ИГИЛ→ДАЕШ | на Украине→в Украине
Иерусалим→Аль-Кудс | Персидский залив→Басрийский залив
СВО / денацификация → KESİNLİKLE YASAK | путинская война → KESİNLİKLE YASAK
геноцид 1915→события 1915 года | крестовые набеги (походы değil)

SORU 9 — SİNEMATİK KALİTE
• Düz mü görünüyor? Derinlik hissi var mı?
• Işık dramatik mi? Atmosfer güçlü mü? "Premium" hissettiriyor mu?

SORU 10 — KALİTESİZLİK TESPİTİ (varsa → konsepti reddet)
✗ Stok fotoğraf hissi | ✗ Aşırı AI plastik görünüm | ✗ Aşırı gradient
✗ Sadece "fotoğraf + başlık" (görsel fikir yok) | ✗ Agency haberi klişesi
✗ Anlamsız objeler | ✗ Clickbait estetiği

SORU 11 — ALTERNATİF DÜŞÜNME
Eğer ilk fikir zayıfsa sor:
"The Economist bunu nasıl yapardı?" → Güçlü metafor, ironi, tek nesne
"Reuters Graphics bunu nasıl çözerdi?" → Veriye dayalı, minimal, keskin
"TRT World bunu nasıl sunardı?" → Diplomatik, global, net

SORU 12 — FORMAT SORULARI
Instagram: Güçlü merkez var mı? (4:5 dikey güç)
Telegram: Hızlı okunuyor mu? (koyu mod uyumlu)
X/Twitter: Scroll durduruyor mu? (16:9 tek mesaj)
Web: Premium görünüyor mu? (banner boyutu)
YouTube: Thumbnail etkisi yeterli mi?

SORU 13 — SON KARAR
"Bu görseli BBC, Al Jazeera veya Reuters paylaşır mıydı?"
Eğer HAYIR → yeniden üret, başka konsept seç.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BAŞLIK FELSEFESİ:
МЕRAK → "ЧТО СКРЫВАЕТ ДОГОВОР?" | SONUÇ → "ЭРДОГАН ПОБЕДИЛ"
ŞOK → "ИЗРАИЛЬ СНОВА УБИВАЕТ" | SORU → "КТО ПЛАТИТ ЗА ВОЙНУ?"
Max 7 kelime. TAMAMEN BÜYÜK HARF. Güçlü eylem fiili.

DALL-E: Kesinlikle insan yüzü/figür yok. Sinematik, dramatik, tek odak.
"photorealistic cinematic, no people no faces, dramatic lighting" ile bitir. Max 80 kelime.

KONSEPT TİPLERİ (dönüşümlü):
economist_metaphor | cinematic_crop | symbolic | brutalist | map_power | magazine_cover | infographic_hybrid | reuters_modern

KALİTE SKORU (her kriter /10, toplam /100):
creativity, newsImpact, thumbnailPower, trtCompliance, mobileReadability,
metaphorStrength, premiumLook, globalStandard, socialPerformance, editorialIntel
80+ → qualityGate: "passed" | 80 altı → "failed"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SADECE GEÇERLİ JSON DÖNDÜR — başka hiçbir şey yazma:
{
  "editorialAnalysis": {
    "realCenter": "Haberin gerçek merkezi (Rusça)",
    "dominantEmotion": "Seçilen tek duygu (Rusça)",
    "powerDynamic": "Güç dengesi analizi (Rusça)",
    "psychologicalCore": "Tetiklenecek duygu + neden (Rusça)",
    "socialMediaHook": "Scroll-stopper element (Rusça)",
    "geopoliticalWeight": "Jeopolitik bağlam (Rusça)",
    "thumbnailTest": "50x50 testi — geçer/geçmez (Rusça)",
    "metaphorObject": "Seçilen sembol/metafor objesi (Rusça)"
  },
  "concepts": [
    {
      "id": 1,
      "type": "string",
      "title": "Konsept başlığı (Rusça)",
      "description": "Ana fikir + obje + kompozisyon + renk + metafor (Rusça, 3 cümle)",
      "whyStrong": "Thumbnail psikolojisi — neden güçlü (Rusça)",
      "qualityCheck": "Soru 10 kontrolü — geçti mi (Rusça)",
      "scores": {
        "creativity":0,"newsImpact":0,"thumbnailPower":0,"trtCompliance":0,
        "mobileReadability":0,"metaphorStrength":0,"premiumLook":0,
        "globalStandard":0,"socialPerformance":0,"editorialIntel":0,"total":0
      }
    },
    {"id":2,"type":"...","title":"...","description":"...","whyStrong":"...","qualityCheck":"...","scores":{"creativity":0,"newsImpact":0,"thumbnailPower":0,"trtCompliance":0,"mobileReadability":0,"metaphorStrength":0,"premiumLook":0,"globalStandard":0,"socialPerformance":0,"editorialIntel":0,"total":0}},
    {"id":3,"type":"...","title":"...","description":"...","whyStrong":"...","qualityCheck":"...","scores":{"creativity":0,"newsImpact":0,"thumbnailPower":0,"trtCompliance":0,"mobileReadability":0,"metaphorStrength":0,"premiumLook":0,"globalStandard":0,"socialPerformance":0,"editorialIntel":0,"total":0}}
  ],
  "selectedConcept": 1,
  "selectionReason": "Soru 13 cevabı — neden bu (Rusça)",
  "headline": "RUSÇA MAX 7 KELİME BÜYÜK HARF",
  "subheadline": "Rusça alt başlık max 12 kelime",
  "category": "SADECE KONU KATEGORİSİ — ИРАН/ГАЗА/ТУРЦИЯ/УКРАИНА/ЭКОНОМИКА/МИРОВЫЕ vb, içerik tipi değil",
  "source": "AA|Reuters|TRT World|AFP",
  "urgency": "breaking|normal|feature",
  "colorScheme": "dark|red|teal|gold|grey",
  "template": "typographic|photo_panel|split|feature",
  "dallePrompt": "English DALL-E 3 prompt max 80 words, no people no faces",
  "pexelsQuery": "English 4 words",
  "platformNotes": {"instagram":"string","telegram":"string"},
  "qualityGate": "passed|failed",
  "visualNote": "Editöre 1 cümle not (Rusça)"
}`;

// ══════════════════════════════════════════════════════════════════════
//  QC SYSTEM
// ══════════════════════════════════════════════════════════════════════
const QC_SYSTEM = `Sen TRT Russian QC panelinin moderatörüsün. İki uzman hakemden oluşuyorsun.

СЕЗАР (Арт-директор, Анкара): The Economist tarzı, Türk kültürü, görsel zeka, thumbnail psikolojisi, sosyal medya.
ГЮЛЬНАРА (TRT 10 yıl): TRT Russian kimliği, kurumsal uyum, redaksiyonel doğruluk.
Her ikisi Rusça konuşur.

SADECE GEÇERLİ JSON:
{"reviewer1":{"name":"Сезар","role":"Арт-директор","score":0,"verdict":"string","strengths":["string"],"issues":[{"type":"ok|warn|fail","text":"string"}],"suggestion":"string"},"reviewer2":{"name":"Гюльнара","role":"TRT Russian · 10 лет","score":0,"verdict":"string","strengths":["string"],"issues":[{"type":"ok|warn|fail","text":"string"}],"suggestion":"string"},"overallScore":0,"approved":true,"finalVerdict":"string"}`;

// ══════════════════════════════════════════════════════════════════════
//  API ÇAĞIRICI — Claude + GPT-4o paralel, hangisi önce dönerse
// ══════════════════════════════════════════════════════════════════════
async function callClaude(system, content, maxTokens) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content }]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || "{}";
}

async function callGPT4o(system, content, maxTokens) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user",   content }
      ]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GPT-4o ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "{}";
}

async function callWithFallback(system, content, maxTokens) {
  // Claude ve GPT-4o'yu yarıştır — hangisi önce geçerli JSON dönerse onu kullan
  // Claude birinci tercih, GPT-4o yedek
  try {
    const raw = await callClaude(system, content, maxTokens);
    const parsed = safeParseJSON(raw);
    if (parsed && (parsed.headline || parsed.reviewer1)) {
      console.log("✓ Claude responded");
      return { parsed, engine: "claude" };
    }
    throw new Error("Claude returned invalid JSON");
  } catch (claudeErr) {
    console.warn("Claude failed:", claudeErr.message, "— trying GPT-4o");
    try {
      const raw = await callGPT4o(system, content, maxTokens);
      const parsed = safeParseJSON(raw);
      if (parsed) {
        console.log("✓ GPT-4o responded");
        return { parsed, engine: "gpt4o" };
      }
      throw new Error("GPT-4o also returned invalid JSON");
    } catch (gptErr) {
      console.error("Both engines failed:", gptErr.message);
      return { parsed: null, engine: "none" };
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
//  SAFE JSON PARSE
// ══════════════════════════════════════════════════════════════════════
function safeParseJSON(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(clean); } catch {}
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
  if (s !== -1 && e > s) {
    try { return JSON.parse(clean.slice(s, e + 1)); } catch {}
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════════
//  FALLBACK
// ══════════════════════════════════════════════════════════════════════
function buildFallback(text, ctype) {
  return {
    editorialAnalysis: {
      realCenter: "Анализ временно недоступен",
      dominantEmotion: "Нейтральный",
      powerDynamic: "—", psychologicalCore: "—",
      socialMediaHook: "TRT Russian", geopoliticalWeight: "—",
      thumbnailTest: "OK", metaphorObject: "—"
    },
    concepts: [{
      id:1, type:"photo_panel",
      title:"Базовый шаблон",
      description:"Фото + заголовок — повторите анализ",
      whyStrong:"Базовый режим", qualityCheck:"—",
      scores:{creativity:5,newsImpact:6,thumbnailPower:6,trtCompliance:9,
        mobileReadability:7,metaphorStrength:3,premiumLook:5,
        globalStandard:5,socialPerformance:5,editorialIntel:4,total:55}
    }],
    selectedConcept:1, selectionReason:"Базовый режим",
    headline: text.slice(0,60).toUpperCase().split(/\s+/).slice(0,7).join(' '),
    subheadline:"", category:"МИРОВЫЕ", source:"TRT Russian",
    urgency:"normal", colorScheme:"dark", template:"photo_panel",
    dallePrompt:"dramatic news background, dark atmospheric lighting, no people no faces, cinematic photorealistic",
    pexelsQuery:"news breaking dramatic",
    platformNotes:{instagram:"Базовый режим",telegram:"Базовый режим"},
    qualityGate:"failed",
    visualNote:"Повторите анализ для полноценного результата"
  };
}

// ══════════════════════════════════════════════════════════════════════
//  HANDLER
// ══════════════════════════════════════════════════════════════════════
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"{}" };
  if (event.httpMethod !== "POST")    return { statusCode:405, headers:CORS, body:JSON.stringify({error:"Method not allowed"}) };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode:400, headers:CORS, body:JSON.stringify({error:"Invalid JSON body"}) }; }

  const isQC  = body._qcMode === true;
  const text  = (body.text || "").trim();
  const ctype = body.contentType || "news";

  if (!text || text.length < 10)
    return { statusCode:400, headers:CORS, body:JSON.stringify({error:"Текст слишком короткий"}) };

  const system  = isQC ? QC_SYSTEM : EDITORIAL_SYSTEM;
  const content = isQC ? text : `Тип контента: ${ctype}\n\nТекст материала:\n${text.slice(0, 4500)}`;
  const maxTok  = isQC ? 1200 : 2000;

  const { parsed, engine } = await callWithFallback(system, content, maxTok);

  if (!parsed) {
    return { statusCode:200, headers:CORS, body:JSON.stringify(buildFallback(text, ctype)) };
  }

  // Kategori temizle: içerik tipi etiketleri kategori olarak gelmesin
  if (parsed.category) {
    const blocked = ['НОВОСТИ','NEWS','HABER','VIDEO','ВИДЕО','FEATURE','СТАТЬЯ','ARTICLE','INFOGRAPHIC','ИНФОГРАФИКА'];
    if (blocked.includes((parsed.category || '').toUpperCase().trim())) {
      parsed.category = 'МИРОВЫЕ';
    }
  }

  return { statusCode:200, headers:CORS, body:JSON.stringify({...parsed, _engine: engine}) };
};
