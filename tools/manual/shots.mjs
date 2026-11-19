import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
for (const lang of ['en', 'es']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(l => { try { localStorage.clear(); localStorage.setItem('pulsar.lang', l); localStorage.setItem('pulsar.coach', '1'); } catch (e) {} }, lang);
  await p.goto('http://127.0.0.1:8811/index.html'); await p.waitForTimeout(1200);
  const D = `/home/claude/man/pulsar/shots/${lang}_`;
  await p.screenshot({ path: D + 'splash.png' });
  await p.click('#splash'); await p.waitForTimeout(9500);
  await p.evaluate(() => { UI.style = 'BIG BEAT'; $('#style').value = 'BIG BEAT'; applyKit('BIG BEAT'); setP(G.BPM, 132); setP(G.DRIVE, .1); setP(G.COMP, .45); UI.pats[0] = generate('BIG BEAT', 11, .55); pushPat(0); UI.sel = 5; renderAll(); });
  await p.click('#play'); await p.waitForTimeout(1700);
  await p.evaluate(() => setView('LIVE')); await p.waitForTimeout(300);
  await p.screenshot({ path: D + 'live.png' });
  await p.evaluate(() => setView('GRID')); await p.waitForTimeout(300);
  await p.screenshot({ path: D + 'main.png' });
  const tab = async n => { await p.evaluate(n => { UI.tab = n; renderPanel(); }, n); await p.waitForTimeout(250); await p.screenshot({ path: D + 'panel_' + n.toLowerCase() + '.png', clip: { x: 1100, y: 96, width: 340, height: 720 } }); };
  await tab('SOUND'); await p.evaluate(() => { UI.sel = 0; renderAll(); }); await p.waitForTimeout(200);
  await p.evaluate(() => { UI.tab = 'SOUND'; renderPanel(); }); await p.screenshot({ path: D + 'panel_synth.png', clip: { x: 1100, y: 96, width: 340, height: 720 } });
  await p.evaluate(() => { UI.sel = 5; renderRows(); setP(TXID(5, XT.PUNCH), .55); setP(TXID(5, XT.COMP), .35); setP(TXID(5, XT.HIGH), .25); }); await tab('MIX'); await tab('TRACK'); await tab('SONG'); await tab('MASTER');
  await p.locator('.row').nth(5).locator('.st').nth(10).click({ button: 'right' }); await p.waitForTimeout(300);
  await p.screenshot({ path: D + 'panel_step.png', clip: { x: 1100, y: 96, width: 340, height: 720 } });
  await p.screenshot({ path: D + 'grid.png', clip: { x: 0, y: 96, width: 1100, height: 330 } });
  await p.evaluate(() => setFX((1 << 2) | (1 << 7)));
  await p.waitForTimeout(400); await p.screenshot({ path: D + 'perf.png', clip: { x: 0, y: 820, width: 1440, height: 80 } });
  await p.screenshot({ path: D + 'top.png', clip: { x: 0, y: 0, width: 1440, height: 96 } });
  await p.evaluate(() => setFX(0));
  { const bx = await p.locator('.xy canvas').boundingBox(); await p.evaluate(() => { setP(XGID(XG.REPEAT), 2); Pro.renderPerf(); });
    await p.mouse.move(bx.x + bx.width * .25, bx.y + bx.height * .35); await p.mouse.down(); await p.mouse.move(bx.x + bx.width * .2, bx.y + bx.height * .3, { steps: 3 }); await p.waitForTimeout(250);
    await p.screenshot({ path: D + 'perf2.png', clip: { x: 700, y: 795, width: 740, height: 105 } }); await p.mouse.up(); }
  await p.evaluate(() => setView('LIVE')); await p.waitForTimeout(300); await p.screenshot({ path: D + 'tr8.png', clip: { x: 0, y: 650, width: 1100, height: 170 } });
  await p.screenshot({ path: D + 'strips.png', clip: { x: 0, y: 100, width: 420, height: 660 } });
  await p.evaluate(() => setView('GRID'));
  await p.selectOption('#style', 'DRILL N BASS'); await p.evaluate(() => { doGenerate(); }); await p.waitForTimeout(1200);
  await p.screenshot({ path: D + 'dnb.png' });
  await p.evaluate(() => { UI.style = 'BRAINDANCE'; $('#style').value = 'BRAINDANCE'; doGenerate(); }); await p.waitForTimeout(1200);
  await p.screenshot({ path: D + 'braindance.png' });
  // PULSAR 3: the LAB view and its sections (QUICK START, PATTERNS, MACROS, DIRTY VOLTAGE, ..., HYPERLINK)
  await p.evaluate(() => setView('LAB')); await p.waitForTimeout(700);
  await p.screenshot({ path: D + 'lab.png' });
  const secs = await p.locator('#labV .lsec').count();
  for (let i = 0; i < secs; i++) { const sec = p.locator('#labV .lsec').nth(i); const cls = (await sec.getAttribute('class')) || ''; const t = (await sec.locator('h3').first().textContent()) || 's' + i;
    await sec.scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
    await sec.screenshot({ path: D + 'lab_' + i + '.png' }); console.log('lab section', i, t.trim(), cls); }
  await p.evaluate(() => { localStorage.removeItem('pulsar.coach'); Coach.show(); }); await p.waitForTimeout(300);
  await p.locator('#coach > div').screenshot({ path: D + 'coach.png' }); await p.evaluate(() => { const c = document.getElementById('coach'); if (c) c.remove(); });
  console.log(lang, JSON.stringify(errs));
  await ctx.close();
}
await b.close();
