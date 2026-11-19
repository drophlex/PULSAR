/* coach.js — the first time PULSAR opens: three moves to a groove (and the guide stays one click away on ?) */
Object.assign(ES, {
  'WELCOME': 'BIENVENIDA', 'Three moves to a groove.': 'Tres movimientos y ya hay groove.',
  'Pick a family and press ⚡ GENERATE.': 'Elige una familia y pulsa ⚡ GENERAR.', 'You get a kit and a pattern that fit together, already mixed.': 'Obtienes un kit y un patrón que encajan, ya mezclados.',
  'Turn the macros.': 'Gira las macros.', 'DRIVE, PUMP, FILTER, TENSION… each one is a musical move. Went too far? RECOVER brings the groove back.': 'SATURACIÓN, BOMBEO, FILTRO, TENSIÓN… cada una es un movimiento musical. ¿Te pasaste? RECUPERAR regresa el groove.',
  'Launch scenes on the bar.': 'Lanza escenas en el compás.', 'Press a scene: it changes on the next bar, always in time. The 36 patterns of the bank preview before you keep them.': 'Pulsa una escena: cambia en el siguiente compás, siempre a tiempo. Los 36 patrones del banco se escuchan antes de quedarte con ellos.',
  'Start': 'Empezar', 'Later': 'Después' });
const Coach = {
  show() {
    if (LS.get('pulsar.coach')) return;
    const d = document.createElement('div'); d.id = 'coach';
    d.style.cssText = 'position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:#030405d9;padding:20px';
    const step = (n, a, b) => `<div style="display:flex;gap:12px;margin:14px 0;align-items:flex-start"><b style="flex:none;width:30px;height:30px;border-radius:50%;background:var(--beam);color:#050607;display:grid;place-items:center;font-weight:800">${n}</b><div><b>${tr(a)}</b> <span style="color:var(--dim)">${tr(b)}</span></div></div>`;
    d.innerHTML = `<div style="max-width:560px;background:#0d1116;border:1px solid #ffffff22;border-radius:14px;padding:24px 26px;line-height:1.5;font-size:14px">
      <div style="letter-spacing:.2em;font-size:11px;color:var(--dim)">${tr('WELCOME')}</div><h2 style="margin:4px 0 6px;font-size:26px">${tr('Three moves to a groove.')}</h2>
      ${step(1, 'Pick a family and press ⚡ GENERATE.', 'You get a kit and a pattern that fit together, already mixed.')}
      ${step(2, 'Turn the macros.', 'DRIVE, PUMP, FILTER, TENSION… each one is a musical move. Went too far? RECOVER brings the groove back.')}
      ${step(3, 'Launch scenes on the bar.', 'Press a scene: it changes on the next bar, always in time. The 36 patterns of the bank preview before you keep them.')}
      <div style="display:flex;gap:8px;margin-top:16px"><button id="coachGo" class="big">${tr('Start')}</button><button id="coachLater">${tr('Later')}</button></div></div>`;
    document.body.append(d);
    const close = () => { LS.set('pulsar.coach', '1'); d.remove(); };
    d.querySelector('#coachLater').onclick = close;
    d.querySelector('#coachGo').onclick = () => { close(); if (typeof quickGenerate === 'function') quickGenerate(); };
  }
};
