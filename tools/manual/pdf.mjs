import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage();
for (const [src, out] of [['manual_en.html', 'PULSAR-Manual-EN.pdf'], ['manual_es.html', 'PULSAR-Manual-ES.pdf'], ['manual_en_es.html', 'PULSAR-Manual-EN-ES.pdf']]) {
  await p.goto('file:///home/claude/man/pulsar/' + src); await p.waitForTimeout(800);
  const over = await p.evaluate(() => [...document.querySelectorAll('.page')].map((pg, i) => { const r = pg.getBoundingClientRect(); let m = 0; pg.querySelectorAll('*').forEach(e => { if (e.closest('footer')) return; const q = e.getBoundingClientRect(); if (q.height) m = Math.max(m, q.bottom - r.top); }); return [i + 1, Math.round(m)]; }).filter(x => x[1] > 990));
  await p.pdf({ path: '/home/claude/man/pulsar/' + out, width: '8.5in', height: '11in', printBackground: true });
  console.log(out, 'overflow:', JSON.stringify(over));
}
await b.close();
