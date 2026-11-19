import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage();
const list = [['manual_en.html', 'PULSAR-Manual-EN.pdf'], ['manual_es.html', 'PULSAR-Manual-ES.pdf'], ['manual_en_es.html', 'PULSAR-Manual-EN-ES.pdf']];
for (const [ed, name] of [['web', 'PULSAR-Web-Manual'], ['vst', 'PULSAR-VST-Manual'], ['fm1', 'PULSAR-FM1-Manual']]) list.push([ed + '_manual_en.html', name + '-EN.pdf'], [ed + '_manual_es.html', name + '-ES.pdf'], [ed + '_manual_en_es.html', name + '-EN-ES.pdf']);
for (const [src, out] of list) {
  await p.goto('file:///home/claude/man/pulsar/' + src); await p.waitForTimeout(800);
  const over = await p.evaluate(() => [...document.querySelectorAll('.page')].map((pg, i) => { const r = pg.getBoundingClientRect(); let m = 0; pg.querySelectorAll('*').forEach(e => { if (e.closest('footer')) return; const q = e.getBoundingClientRect(); if (q.height) m = Math.max(m, q.bottom - r.top); }); return [i + 1, Math.round(m)]; }).filter(x => x[1] > 990));
  await p.pdf({ path: '/home/claude/man/pulsar/' + out, width: '8.5in', height: '11in', printBackground: true });
  console.log(out, 'overflow:', JSON.stringify(over));
}
await b.close();
