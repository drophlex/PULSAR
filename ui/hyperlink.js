/* hyperlink.js — PULSAR 3 · HYPERLINK // DUAL-ENGINE: PULSAR and an original Roland TR-8 (not TR-8S) as one instrument.
   Built from Roland's TR-8 MIDI implementation chart (channel 10 by default; BD 36, SD 38, LT 43, MT 47, HT 50, RS 37, HC 39,
   CH 42, OH 46, CC 49, RC 51; Scatter: CC 68 type, CC 69 depth, CC 70 on, which the TR-8 RECEIVES; SysEx not supported).
   What it does, and only that:
   - the KIT MATRIX: every track plays on PULSAR, on the TR-8 (over MIDI), on both, alternating, or nowhere;
   - CONNECT: the channel, a test note, MIDI clock (off by default: the DAW may already send it), an offset to line them up;
   - SCATTER DIRECTOR: Scatter type, depth and on / off sent on the bar, with an automatic return;
   - GHOST GROOVE: what the TR-8 sends (if it is set to transmit its notes) is heard, never doubled on PULSAR's pads,
     and PULSAR writes an answer around it (ghost notes, off-beats, a fill) — from the notes received, not its memory;
   - a MIDI MONITOR, PANIC, and the status: PULSAR only / MIDI only / TR-8 heard.
   Audio from the TR-8 comes into PULSAR only as your DAW or interface routes it (USB-MIDI carries no audio): the guide
   says how. Nothing here assumes the TR-8 is there: PULSAR plays the same without it. Loaded after lab.js. */
Object.assign(ES, {
  'HYPERLINK · TR-8': 'HYPERLINK · TR-8', 'OFF': 'APAGADO', 'ON': 'ENCENDIDO', 'CHANNEL': 'CANAL', 'TEST NOTE': 'NOTA DE PRUEBA', 'SEND CLOCK': 'MANDAR RELOJ',
  'OFFSET': 'DESFASE', 'KIT MATRIX': 'MATRIZ DE KIT', 'SCATTER DIRECTOR': 'DIRECTOR DE SCATTER', 'TYPE': 'TIPO', 'DEPTH': 'PROFUNDIDAD', 'EVERY': 'CADA',
  'bars, for one bar': 'compases, durante un compás', 'SCATTER NOW': 'SCATTER YA', 'AUTO': 'AUTO', 'GHOST GROOVE': 'GHOST GROOVE', 'LISTEN': 'ESCUCHAR',
  'WRITE THE ANSWER': 'ESCRIBIR LA RESPUESTA', 'MIDI MONITOR': 'MONITOR MIDI', 'PANIC': 'PÁNICO', 'PULSAR only': 'Solo PULSAR', 'MIDI only (nothing heard from the TR-8 yet)': 'Solo MIDI (aún no se oye nada de la TR-8)',
  'TR-8 heard over MIDI': 'TR-8 escuchada por MIDI', 'MIDI OUT': 'SALIDA MIDI', 'MIDI IN': 'ENTRADA MIDI', 'none': 'ninguna', 'PRESETS': 'PRESETS',
  'PULSAR ONLY': 'SOLO PULSAR', 'TR-8 DRUMS · PULSAR BREAKS': 'BATERÍA TR-8 · BREAKS PULSAR', 'LAYER THE KICK': 'BOMBO EN CAPAS', 'CALL & RESPONSE': 'PREGUNTA Y RESPUESTA',
  'Clock is off: start the TR-8 yourself, or let the DAW send it clock — never both': 'El reloj está apagado: arranca la TR-8 tú, o deja que el DAW le mande reloj — nunca los dos',
});
const ROUTES = ['PULSAR', 'TR-8', 'BOTH', 'ALT', 'MUTE'];
const TR8_VOICES = [['BD', 36], ['SD', 38], ['LT', 43], ['MT', 47], ['HT', 50], ['RS', 37], ['HC', 39], ['CH', 42], ['OH', 46], ['CC', 49], ['RC', 51], ['—', 0]];
const TR8_DEFAULT = [36, 38, 39, 42, 46, 0, 0, 37, 43, 49, 0, 47, 51, 0, 0, 50];
const XT_ROUTE = 6, XT_HWNOTE = 7;
// the TR-8 voice that fits a track: by its sound's name and role (a clap to HC, a crash to CC, a bass to none …)
function tr8Voice(t) { const k = UI.kit[t], n = ((k && k.n) || '').toUpperCase(), role = tp(t, T.ROLE) | 0;
  if (/BASS|SUB|REESE|DROP|STAB|PLUCK|RISER|BREAK/.test(n)) return 0;
  if (/CLAP/.test(n)) return 39; if (/RIM|STICK/.test(n)) return 37; if (/CRASH/.test(n)) return 49; if (/RIDE/.test(n)) return 51; if (/OPEN/.test(n)) return 46;
  if (/TOM|CONGA|KNOCK/.test(n)) return [43, 47, 50][t % 3]; if (/COWBELL|BLOCK/.test(n)) return 37; if (/METAL|ANVIL|FM|ZAP|BLIP|GLASS|TICK/.test(n)) return 0;   // PULSAR's own colours stay on PULSAR
  return [36, 38, 42, 0, 0, 46][role] ?? 0; }
const Hyper = {
  st: Object.assign({ on: false, ch: 10, clock: false, off: 0, scType: 1, scDepth: 64, scEvery: 4, scAuto: false, out: '', in: '' }, JSON.parse(LS.get('pulsar.hyper') || '{}')),
  mon: [], heardAt: 0, heard: [], webOut: null, webIn: null, access: null, lastBar: -1, barCount: 0, scOn: false,
};
function hyperSave() { LS.set('pulsar.hyper', JSON.stringify(Hyper.st)); }
function hyperPush() { const s = Hyper.st; Bridge.post({ t: 'hyperlink', on: s.on, ch: s.ch, clock: s.clock, off: s.off }); hyperSave(); }
function monitor(dir, bytes) { Hyper.mon.unshift([dir, [...bytes].map(b => b.toString(16).padStart(2, '0')).join(' '), performance.now()]); Hyper.mon.length = Math.min(Hyper.mon.length, 24); const m = $('#hlMon'); if (m) Hyper.paintMon(m); }
Hyper.paintMon = m => { m.textContent = Hyper.mon.map(([d, b]) => (d === 'out' ? '→ ' : '← ') + b).join('\n') || '—'; };
function hwSendNow(bytes) { monitor('out', bytes); if (Bridge.kind === 'plugin') return; if (Hyper.webOut) try { Hyper.webOut.send(bytes); } catch (e) {} }
function sendCC(cc, v, bar) { const ch = Hyper.st.ch - 1; monitor('out', [0xb0 | ch, cc, v]); Bridge.post({ t: 'hwcc', cc, v, bar: !!bar }); }

// the web version: Web MIDI out / in (the plug-in uses the DAW's MIDI routing instead)
function hyperWebMidi() {
  if (Bridge.kind === 'plugin' || !navigator.requestMIDIAccess) return;
  navigator.requestMIDIAccess({ sysex: false }).then(acc => { Hyper.access = acc; const pick = () => {
      const outs = [...acc.outputs.values()], ins = [...acc.inputs.values()];
      Hyper.webOut = outs.find(o => o.id === Hyper.st.out) || outs.find(o => /TR-8/i.test(o.name)) || null;
      if (Hyper.webIn) Hyper.webIn.removeEventListener('midimessage', Hyper.onIn);
      Hyper.webIn = ins.find(i => i.id === Hyper.st.in) || ins.find(i => /TR-8/i.test(i.name)) || null;
      if (Hyper.webIn) Hyper.webIn.addEventListener('midimessage', Hyper.onIn); Lab.render(); };
    pick(); acc.onstatechange = pick; }).catch(() => {});
}
Hyper.onIn = ev => { const [s, n, v] = ev.data; if ((s & 0xf0) === 0x90 && v > 0 && (s & 15) === Hyper.st.ch - 1) Hyper.hear([[n, v, (Hyper.tele ? Hyper.tele[4] | 0 : 0)]]); if (s < 0xf8) monitor('in', ev.data); };
Hyper.hear = list => { Hyper.heardAt = performance.now(); for (const [n, v, st] of list) { Hyper.heard.push({ n, v, st: st % 16, at: performance.now() }); monitor('in', [0x90 | (Hyper.st.ch - 1), n, v]); }
  if (Hyper.heard.length > 256) Hyper.heard.splice(0, Hyper.heard.length - 256); };
// the engine's hits for the TR-8, in the web: sent with Web MIDI at the right time (the audio clock and the output latency)
Hyper.onHw = d => { if (!Hyper.st.on || !Hyper.webOut) return; const ctx = Bridge.ctx, lat = ((ctx && (ctx.outputLatency || ctx.baseLatency)) || 0) * 1000;
  const base = performance.now() + (d.time - (ctx ? ctx.currentTime : d.time)) * 1000 + lat + Hyper.st.off, ch = Hyper.st.ch - 1;
  for (const [kind, a, v, at] of d.list) { const t = base + at / d.sr * 1000, msg = kind === 1 ? [0xb0 | ch, a, v] : [0x90 | ch, a, v];
    try { Hyper.webOut.send(msg, t); if (!kind) Hyper.webOut.send([0x80 | ch, a, 0], t + 60); } catch (e) {} monitor('out', msg); } };

// presets for the matrix
function routePreset(name) {
  startPreview(tr('KIT MATRIX') + ' · ' + tr(name));
  for (let t = 0; t < NT; t++) { let r = 0;
    if (name === 'TR-8 DRUMS · PULSAR BREAKS') r = tr8Voice(t) && (tp(t, T.ROLE) | 0) !== 4 && !/BASS|SUB/.test(((UI.kit[t] || {}).n || '').toUpperCase()) ? 1 : 0;
    if (name === 'LAYER THE KICK') r = t === 0 ? 2 : 0;
    if (name === 'CALL & RESPONSE') r = [0, 1, 3].includes(t) ? 3 : 0;
    const v = tr8Voice(t); if (r === 1 || r === 3) { if (!v) r = 0; } setP(TXID(t, XT_ROUTE), r); setP(TXID(t, XT_HWNOTE), v); }
  Lab.render();
}
// GHOST GROOVE: from the TR-8's last bars, PULSAR writes ghost snares before its snares, hats on the off-beats it leaves free,
// percussion answering its kick, and a fill in the last beat. Only on PULSAR's own tracks routed to PULSAR.
function ghostGroove() {
  const recent = Hyper.heard.filter(x => performance.now() - x.at < 16000); if (!recent.length) { toast(LANG === 'es' ? 'Aún no llega nada de la TR-8: pon su MIDI OUT a mandar notas (TX) y tócala' : 'Nothing from the TR-8 yet: set it to transmit its notes (MIDI TX) and play it'); return; }
  const kick = new Set(), snare = new Set(), hat = new Set();
  for (const x of recent) { if (x.n === 35 || x.n === 36) kick.add(x.st); else if ([38, 40, 39].includes(x.n)) snare.add(x.st); else if ([42, 44, 46].includes(x.n)) hat.add(x.st); }
  startPreview(tr('GHOST GROOVE'));
  const b = UI.pats[UI.cur], free = t => PARAMS[TXID(t, XT_ROUTE)] === 0, r = RNG(genSeed());
  if (free(12)) for (const s of snare) { const g = (s + 15) % 16; if (!snare.has(g)) setStep(b, 12, g, { vel: 28 + r.int(14) }); }
  if (free(13)) for (let s = 0; s < 16; s++) if (s % 2 === 1 && !hat.has(s) && r() < .8) setStep(b, 13, s, { vel: 40 + r.int(40), mic: r.int(10) - 5 });
  if (free(8)) for (const s of kick) { const a = (s + 3) % 16; if (!kick.has(a) && r() < .6) setStep(b, 8, a, { vel: 60 + r.int(40), pit: r.pick([0, 5, 7]) }); }
  if (free(7)) for (let s = 12; s < 16; s++) setStep(b, 7, s, { vel: 60 + (s - 12) * 15, rat: s > 13 ? 2 : 1 });
  pushPat(UI.cur); renderRows(); toast(tr('GHOST GROOVE') + ' · ' + recent.length + ' TR-8 hits');
}
Hyper.tick = function (tele) {   // the bar clock for SCATTER AUTO
  Hyper.tele = tele; const step = tele[4] | 0, bar = Math.floor(step / 16), playing = tele[0] > .5;
  if (!playing) { Hyper.lastBar = -1; return; }
  if ((step & 15) === 15 && Hyper.lastBar !== step) { Hyper.lastBar = step; Hyper.barCount++;
    const s = Hyper.st; if (s.on && s.scAuto) { const go = Hyper.barCount % s.scEvery === 0;
      if (go && !Hyper.scOn) { sendCC(68, Math.round((s.scType - 1) * 127 / 9), true); sendCC(69, s.scDepth, true); sendCC(70, 127, true); Hyper.scOn = true; }
      else if (Hyper.scOn) { sendCC(70, 0, true); Hyper.scOn = false; } } }
  void bar;
};
Hyper.status = () => !Hyper.st.on ? tr('PULSAR only') : performance.now() - Hyper.heardAt < 4000 ? tr('TR-8 heard over MIDI') : tr('MIDI only (nothing heard from the TR-8 yet)');

Hyper.render = function (v) {
  const s = Hyper.st, sec = (title, cls, ...kids) => h('section', { class: 'lsec ' + (cls || '') }, h('h3', {}, tr(title)), ...kids);
  const btn = (label, on, fn, cls = '') => { const b = h('button', { class: (on ? 'on ' : '') + cls }, label); b.onclick = fn; return b; };
  const num = (val, min, max, set, w = 56) => { const i = h('input', { type: 'number', value: val, min, max, style: `width:${w}px` }); i.onchange = () => { set(Math.max(min, Math.min(max, +i.value || min))); }; return i; };
  const status = h('span', { class: 'hlstat ' + (s.on ? 'on' : '') }, '● ' + Hyper.status());
  const conn = h('div', { class: 'lrow' }, btn(s.on ? tr('ON') : tr('OFF'), s.on, () => { s.on = !s.on; hyperPush(); Lab.render(); }, 'big'), status,
    h('label', {}, tr('CHANNEL')), num(s.ch, 1, 16, x => { s.ch = x; hyperPush(); }),
    btn(tr('TEST NOTE'), false, () => { const ch = s.ch - 1; if (Bridge.kind === 'plugin') Bridge.post({ t: 'hwtest', note: 36 }); else { hwSendNow([0x90 | ch, 36, 100]); setTimeout(() => hwSendNow([0x80 | ch, 36, 0]), 80); } monitor('out', [0x90 | ch, 36, 100]); }),
    btn(tr('SEND CLOCK'), s.clock, () => { s.clock = !s.clock; hyperPush(); Lab.render(); }),
    h('label', {}, tr('OFFSET')), num(s.off, 0, 80, x => { s.off = x; hyperPush(); }), h('span', { class: 'ldesc' }, 'ms'),
    btn('⛔ ' + tr('PANIC'), false, () => { const ch = s.ch - 1; Bridge.post({ t: 'panicHw' }); hwSendNow([0xb0 | ch, 123, 0]); hwSendNow([0xb0 | ch, 120, 0]); }));
  if (Bridge.kind !== 'plugin' && Hyper.access) { const outs = [...Hyper.access.outputs.values()], ins = [...Hyper.access.inputs.values()];
    const sel = (list, cur, set, label) => { const x = h('select', {}); x.append(h('option', { value: '' }, tr('none'))); list.forEach(p => x.append(h('option', { value: p.id }, p.name))); x.value = cur || ''; x.onchange = () => { set(x.value); hyperSave(); hyperWebMidi(); }; return [h('label', {}, tr(label)), x]; };
    conn.append(...sel(outs, Hyper.webOut && Hyper.webOut.id, x => (s.out = x), 'MIDI OUT'), ...sel(ins, Hyper.webIn && Hyper.webIn.id, x => (s.in = x), 'MIDI IN')); }
  const guide = h('p', { class: 'ldesc' }, LANG === 'es'
    ? (Bridge.kind === 'plugin' ? 'Ableton: crea una pista MIDI → MIDI From: PULSAR, MIDI To: TR-8 (canal 10). Para oír la TR-8 dentro de la mezcla: su audio USB o sus salidas a tu interfaz, en una pista de audio. Para GHOST GROOVE: otra pista MIDI con MIDI From: TR-8 → MIDI To: PULSAR (en la TR-8, que transmita sus notas). ' : 'Elige la TR-8 en SALIDA MIDI (y ENTRADA MIDI para GHOST GROOVE). El audio de la TR-8 suena por sus propias salidas: el navegador no lo mezcla. ') + 'Si suena doble: no actives el reloj aquí y en el DAW a la vez, y en la matriz usa BOTH solo donde quieras capas.'
    : (Bridge.kind === 'plugin' ? 'Ableton: make a MIDI track → MIDI From: PULSAR, MIDI To: TR-8 (channel 10). To hear the TR-8 in the mix: its USB audio or its outputs into your interface, on an audio track. For GHOST GROOVE: another MIDI track, MIDI From: TR-8 → MIDI To: PULSAR (set the TR-8 to transmit its notes). ' : 'Pick the TR-8 as MIDI OUT (and MIDI IN for GHOST GROOVE). The TR-8 sounds from its own outputs: the browser does not mix it. ') + 'If it doubles: never clock it from here and from the DAW at once, and use BOTH in the matrix only where you want layers.');
  if (!s.clock) guide.append(h('br'), h('b', {}, tr('Clock is off: start the TR-8 yourself, or let the DAW send it clock — never both')));
  // the matrix
  const mx = h('div', { class: 'hlmx' });
  for (let t = 0; t < NT; t++) { const r = PARAMS[TXID(t, XT_ROUTE)] | 0, note = PARAMS[TXID(t, XT_HWNOTE)] || tr8Voice(t);
    const row = h('div', { class: 'hlrow' }, h('b', { style: 'color:' + stepColor(t) }, (t + 1) + ' ' + (UI.kit[t] ? UI.kit[t].n : '')));
    const ch = h('div', { class: 'chips' }); ROUTES.forEach((n, i) => ch.append(btn(n, r === i, () => { setP(TXID(t, XT_ROUTE), i); if (!PARAMS[TXID(t, XT_HWNOTE)]) setP(TXID(t, XT_HWNOTE), tr8Voice(t)); Lab.render(); }, 'r' + i)));
    const vs = h('select', {}); TR8_VOICES.forEach(([n, nn]) => vs.append(h('option', { value: nn }, n + (nn ? ' ' + nn : '')))); vs.value = String(note); vs.disabled = r === 0 || r === 4;
    vs.onchange = () => setP(TXID(t, XT_HWNOTE), +vs.value);
    row.append(ch, vs); mx.append(row); }
  const pre = h('div', { class: 'chips' }); ['PULSAR ONLY', 'TR-8 DRUMS · PULSAR BREAKS', 'LAYER THE KICK', 'CALL & RESPONSE'].forEach(n => pre.append(btn(tr(n), false, () => routePreset(n))));
  // Scatter
  const sc = h('div', { class: 'lrow' }, h('label', {}, tr('TYPE')), num(s.scType, 1, 10, x => { s.scType = x; hyperSave(); }), h('label', {}, tr('DEPTH')), num(s.scDepth, 0, 127, x => { s.scDepth = x; hyperSave(); }),
    btn('▶ ' + tr('SCATTER NOW'), false, () => { sendCC(68, Math.round((s.scType - 1) * 127 / 9), true); sendCC(69, s.scDepth, true); sendCC(70, 127, true); setTimeout(() => sendCC(70, 0, true), Math.max(500, 60 / Math.max(40, PARAMS[G.BPM]) * 4000)); }, 'big'),
    btn(tr('AUTO'), s.scAuto, () => { s.scAuto = !s.scAuto; hyperSave(); Lab.render(); }), h('label', {}, tr('EVERY')), num(s.scEvery, 2, 16, x => { s.scEvery = x; hyperSave(); }), h('span', { class: 'ldesc' }, tr('bars, for one bar')));
  const gg = h('div', { class: 'lrow' }, btn('✎ ' + tr('WRITE THE ANSWER'), false, ghostGroove, 'big'), h('span', { class: 'ldesc' }, (LANG === 'es' ? 'golpes de la TR-8 escuchados: ' : 'TR-8 hits heard: ') + Hyper.heard.filter(x => performance.now() - x.at < 16000).length));
  const mon = h('pre', { class: 'hlmon', id: 'hlMon' }); Hyper.paintMon(mon);
  v.append(sec('HYPERLINK · TR-8', 'hyper', conn, guide, h('h3', { class: 'sub' }, tr('KIT MATRIX')), pre, mx,
    h('h3', { class: 'sub' }, tr('SCATTER DIRECTOR')), sc, h('p', { class: 'ldesc' }, LANG === 'es' ? 'CC 68 tipo · CC 69 profundidad · CC 70 encendido, en el siguiente compás; AUTO lo enciende cada N compases durante uno y regresa. La TR-8 recibe estos CC; no los manda.' : 'CC 68 type · CC 69 depth · CC 70 on, on the next bar; AUTO turns it on every N bars for one and back. The TR-8 receives these CCs; it does not send them.'),
    h('h3', { class: 'sub' }, tr('GHOST GROOVE')), gg, h('h3', { class: 'sub' }, tr('MIDI MONITOR')), mon));
};
Hyper.boot = function () {
  hyperPush(); hyperWebMidi();
  Bridge.onHwIn = list => Hyper.hear(list); Bridge.onHw = d => Hyper.onHw(d);
  const r0 = Lab.render; Lab.render = function () { r0(); const v = $('#labV'); if (v && UI.view === 'LAB') Hyper.render(v); };
  const t0 = Lab.tele; Lab.tele = function (tele) { t0(tele); Hyper.tick(tele); const st = $('.hlstat'); if (st) st.textContent = '● ' + Hyper.status(); };
  if (UI.view === 'LAB') Lab.render();
};
window.Hyper = Hyper;
