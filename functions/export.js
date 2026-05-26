const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const { chromium } = require('playwright-core');

const CORS_IMG = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "image/png"
};
const CORS_JSON = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS_JSON, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS_JSON, body: "{}" };

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: CORS_JSON, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { platform, headline, sub, cat, src, template, bgBase64, logoBase64 } = body;
  if (!platform) return { statusCode: 400, headers: CORS_JSON, body: JSON.stringify({ error: "Platform required" }) };

  const W = platform.w, H = platform.h;
  const VIEW_W = 540;
  const VIEW_H = Math.round(540 * H / W);
  const SCALE = W / VIEW_W;

  const bgStyle = bgBase64
    ? `url(${bgBase64}) center/cover no-repeat`
    : 'linear-gradient(160deg,#1a2a3a 0%,#0a0f1a 100%)';

  const isPortrait = platform.id === 'instagram';

  // Build card HTML based on template
  let cardInner = '';

  if (template === 'typographic') {
    cardInner = `
      <div style="position:absolute;inset:0;background:${bgStyle};filter:grayscale(60%) contrast(1.1);"></div>
      <div style="position:absolute;inset:0;background:rgba(245,245,240,0.88);"></div>
      <div style="position:absolute;top:${isPortrait?'6%':'8%'};left:5%;right:5%;z-index:2;">
        <span style="font-family:Manrope,sans-serif;font-size:${isPortrait?'18px':'14px'};font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#111;">TRT НА РУССКОМ</span>
      </div>
      <div style="position:absolute;top:${isPortrait?'16%':'22%'};left:5%;right:5%;z-index:2;">
        <div style="font-family:Oswald,sans-serif;font-size:${isPortrait?Math.round(VIEW_W*0.12)+'px':Math.round(VIEW_W*0.09)+'px'};font-weight:700;line-height:.92;color:#111;text-transform:uppercase;letter-spacing:-1px;margin-bottom:${Math.round(VIEW_H*0.025)}px;">
          ${headline||'ЗАГОЛОВОК'}
        </div>
        ${sub?`<div style="font-family:Manrope,sans-serif;font-size:${Math.round(VIEW_W*0.038)}px;font-weight:400;color:#333;line-height:1.4;max-width:80%;">${sub}</div>`:''}
      </div>
      <div style="position:absolute;bottom:4%;left:5%;right:5%;z-index:2;display:flex;align-items:center;justify-content:space-between;">
        <div style="font-family:Manrope,sans-serif;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#888;">${src?'Фото: '+src:''}</div>
        <div style="width:28px;height:3px;background:#20A9CF;border-radius:2px;"></div>
      </div>`;

  } else if (template === 'photo_panel') {
    const panelH = isPortrait ? '42%' : '52%';
    cardInner = `
      <div style="position:absolute;inset:0;background:${bgStyle};"></div>
      <div style="position:absolute;top:3%;left:4%;z-index:2;">
        <span style="font-family:Manrope,sans-serif;font-size:14px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.9);">TRT НА РУССКОМ</span>
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:${panelH};background:rgba(248,248,245,0.97);z-index:2;display:flex;flex-direction:column;justify-content:center;padding:4% 5%;border-top:4px solid #20A9CF;">
        <div style="font-family:Oswald,sans-serif;font-size:${isPortrait?Math.round(VIEW_W*0.1)+'px':Math.round(VIEW_W*0.072)+'px'};font-weight:700;line-height:1.02;color:#0D1B2E;text-transform:uppercase;letter-spacing:-0.5px;margin-bottom:${Math.round(VIEW_H*0.018)}px;">
          ${headline||'ЗАГОЛОВОК МАТЕРИАЛА'}
        </div>
        ${sub?`<div style="font-family:Manrope,sans-serif;font-size:${Math.round(VIEW_W*0.032)}px;font-weight:400;color:#444;line-height:1.35;">${sub}</div>`:''}
      </div>
      ${src?`<div style="position:absolute;bottom:1.5%;right:3%;z-index:3;font-family:Manrope,sans-serif;font-size:11px;color:rgba(0,0,0,.4);font-weight:600;">Фото: ${src}</div>`:''}`;

  } else if (template === 'split') {
    const panelW = isPortrait ? '75%' : '42%';
    cardInner = `
      <div style="position:absolute;inset:0;background:${bgStyle};"></div>
      <div style="position:absolute;top:3%;left:3%;z-index:3;">
        <span style="font-family:Manrope,sans-serif;font-size:13px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.9);">TRT НА РУССКОМ</span>
      </div>
      <div style="position:absolute;top:${isPortrait?'18%':'0'};bottom:0;left:0;width:${panelW};background:rgba(248,248,245,0.97);z-index:2;display:flex;flex-direction:column;justify-content:center;padding:6% 6% 8%;">
        <div style="font-family:Oswald,sans-serif;font-size:${isPortrait?Math.round(VIEW_W*0.1)+'px':Math.round(VIEW_W*0.082)+'px'};font-weight:700;line-height:.98;color:#0D1B2E;text-transform:uppercase;letter-spacing:-0.5px;margin-bottom:${Math.round(VIEW_H*0.022)}px;">
          ${headline||'ПЕРВАЯ СТРОКА'}
        </div>
        ${sub?`<div style="font-family:Oswald,sans-serif;font-size:${Math.round(VIEW_W*0.06)}px;font-weight:400;line-height:1.08;color:#1A3A6B;text-transform:uppercase;">${sub}</div>`:''}
        <div style="margin-top:${Math.round(VIEW_H*0.02)}px;width:32px;height:4px;background:#20A9CF;border-radius:2px;"></div>
      </div>`;

  } else { // feature
    cardInner = `
      <div style="position:absolute;inset:0;background:${bgStyle};"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 30%,rgba(10,15,26,.97) 65%,rgba(10,15,26,1) 100%);"></div>
      <div style="position:absolute;top:3%;left:4%;z-index:2;">
        <span style="font-family:Manrope,sans-serif;font-size:13px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.8);">TRT НА РУССКОМ</span>
      </div>
      ${cat?`<div style="position:absolute;top:3%;right:4%;z-index:2;font-family:Manrope,sans-serif;font-size:12px;font-weight:800;letter-spacing:3px;text-transform:uppercase;padding:3px 10px;border-radius:2px;background:#20A9CF;color:#fff;">${cat}</div>`:''}
      <div style="position:absolute;bottom:0;left:0;right:0;padding:${isPortrait?'6% 5% 6%':'4% 5% 4%'};z-index:2;">
        <div style="width:24px;height:3px;background:#20A9CF;border-radius:2px;margin-bottom:${Math.round(VIEW_H*0.02)}px;"></div>
        <div style="font-family:'Playfair Display',serif;font-size:${isPortrait?Math.round(VIEW_W*0.095)+'px':Math.round(VIEW_W*0.074)+'px'};font-weight:900;line-height:1.06;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.8);margin-bottom:${Math.round(VIEW_H*0.015)}px;">
          ${headline||'Заголовок feature'}
        </div>
        ${sub?`<div style="font-family:Manrope,sans-serif;font-size:${Math.round(VIEW_W*0.03)}px;font-weight:400;color:rgba(255,255,255,.72);line-height:1.35;">${sub}</div>`:''}
        <div style="margin-top:${Math.round(VIEW_H*0.012)}px;font-family:Manrope,sans-serif;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.4);">${src||'TRT RUSSIAN'}</div>
      </div>`;
  }

  const cardHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Playfair+Display:wght@700;900&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:${VIEW_W}px;height:${VIEW_H}px;overflow:hidden;background:#111;}.card{width:100%;height:100%;position:relative;overflow:hidden;}</style>
</head><body><div class="card">${cardInner}</div></body></html>`;

  let browser;
  try {
    browser = await chromium.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage({
      viewport: { width: VIEW_W, height: VIEW_H },
      deviceScaleFactor: SCALE
    });
    await page.setContent(cardHtml, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: VIEW_W, height: VIEW_H }
    });
    return {
      statusCode: 200,
      headers: { ...CORS_IMG, "Content-Disposition": `attachment; filename="TRT_${platform.id}_${Date.now()}.png"` },
      body: screenshot.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    return { statusCode: 500, headers: CORS_JSON, body: JSON.stringify({ error: err.message }) };
  } finally {
    if (browser) await browser.close();
  }
};
