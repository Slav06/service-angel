// Captures the /demo/* screenshots used on the homepage showcase (public/demo/shots).
// Run against a local server on :3456 after changing a demo: node scripts/capture-demos.mjs
// Needs playwright-core and a Chromium (set CHROME to its path).
import { chromium } from 'playwright-core';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const OUT = new URL('../public/demo/shots', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.CHROME ?? process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell' });
async function shot(slug, w, h, full, name, outW) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })).newPage();
  await p.goto('http://localhost:3456/demo/' + slug, { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: 'body > div.sticky:first-child, div.sticky.top-0.z-50 { display:none !important }' });
  await p.waitForTimeout(400);
  const buf = await p.screenshot({ fullPage: full, clip: full ? undefined : undefined });
  let img = sharp(buf);
  const meta = await img.metadata();
  if (full) img = img.extract({ left: 0, top: 0, width: meta.width, height: Math.round(Math.min(meta.height, w * 2 * 2.2)) });
  const info = await img.resize({ width: outW }).webp({ quality: 74 }).toFile(`${OUT}/${name}.webp`);
  console.log(name, info.width + 'x' + info.height, Math.round(info.size / 1024) + 'KB');
}
for (const s of ['northline', 'ember-olive', 'lumen']) await shot(s, 1440, 900, true, s, 1100);
await shot('northline', 1440, 900, false, 'northline-hero', 1100);
await shot('lumen', 390, 844, false, 'lumen-mobile', 360);
await shot('ember-olive', 390, 844, false, 'ember-mobile', 360);
await b.close();
