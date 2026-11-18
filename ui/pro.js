/* pro.js — PULSAR 2: undo / redo, the performance pad and note repeat, PUNCH / COMP / EQ and the outputs, locks, dice and
   mutate, drag-out MIDI, MIDI learn, drop-in samples and resampling. Loaded after app.js; app.js calls Pro.* where these live. */
Object.assign(ES, {
  'UNDO': 'DESHACER', 'REDO': 'REHACER', 'Undone': 'Deshecho', 'Redone': 'Rehecho', 'PUNCH': 'GOLPE+', 'GLUE': 'COMPRESIÓN', 'LOW': 'GRAVES', 'HIGH': 'AGUDOS',
  'PUNCH & EQ': 'GOLPE Y ECUALIZADOR', 'OUTPUT': 'SALIDA', 'MAIN': 'PRINCIPAL', 'LOCK': 'CANDADO', 'LOCKED': 'CON CANDADO', 'DICE': 'DADO', 'MUTATE': 'MUTAR',
  'DRAG MIDI': 'ARRASTRAR MIDI', 'RESAMPLE': 'RESAMPLEAR', 'NOTE REPEAT': 'REPETIR NOTA', 'VELOCITY': 'VELOCIDAD', 'XY PAD': 'PAD XY',
  'FILTER ◀ ▶ · SPACE ▲': 'FILTRO ◀ ▶ · ESPACIO ▲', 'HOLD': 'FIJAR', 'MIDI LEARN': 'APRENDER MIDI', 'FORGET MIDI': 'OLVIDAR MIDI', 'Move a knob or fader on your controller': 'Mueve una perilla o fader de tu controlador',
  'Learned': 'Aprendido', 'Resampling one loop…': 'Resampleando un loop…', 'Resampled into the track': 'Resampleado en la pista', 'Dropped on': 'Soltado en',
  'GENERATOR': 'GENERADOR', 'Locked tracks keep their sound and steps': 'Las pistas con candado conservan su sonido y sus pasos'
});

// ------------------------------------------------------------------ undo / redo: every change, grouped while you keep moving
const Undo = {
  stack: [], redo: [], last: null, timer: 0, quiet: false,
  snap() { const params = PARAMS.slice(); params[XGID(XG.XYON)] = params[XGID(XG.XYX)] = params[XGID(XG.XYY)] = 0;   // the pad's position is a gesture, not an edit
    return { pats: UI.pats.map(b => b.slice()), params, song: JSON.parse(JSON.stringify(UI.song)), songOn: UI.songOn, kit: JSON.parse(JSON.stringify(UI.kit)) }; },
  start() { this.last = this.snap(); this.stack = []; this.redo = []; this.paint(); },
  touch() { if (this.quiet || !this.last) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.commit(), 450); },
  commit() { if (!this.last) return; const now = this.snap(); if (this.same(now, this.last)) return; this.stack.push(this.last); if (this.stack.length > 60) this.stack.shift(); this.redo = []; this.last = now; this.paint(); },
  same(a, b) { if (a.params.some((v, i) => v !== b.params[i])) return false; for (let p = 0; p < NPAT; p++) { const x = a.pats[p], y = b.pats[p]; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false; } return JSON.stringify(a.song) === JSON.stringify(b.song) && a.songOn === b.songOn; },
  apply(s) { this.quiet = true; const xy = [XG.XYON, XG.XYX, XG.XYY].map(k => PARAMS[XGID(k)]); UI.pats = s.pats.map(b => b.slice()); PARAMS.set(s.params); [XG.XYON, XG.XYX, XG.XYY].forEach((k, i) => (PARAMS[XGID(k)] = xy[i])); UI.song = JSON.parse(JSON.stringify(s.song)); UI.songOn = s.songOn; UI.kit = JSON.parse(JSON.stringify(s.kit));
    pushAll(); renderAll(); this.quiet = false; this.last = this.snap(); this.paint(); },
  undo() { clearTimeout(this.timer); this.commit(); if (!this.stack.length) return; this.redo.push(this.snap()); this.apply(this.stack.pop()); toast(tr('Undone')); },
  again() { if (!this.redo.length) return; this.stack.push(this.snap()); this.apply(this.redo.pop()); toast(tr('Redone')); },
  paint() { const u = $('#undoBtn'), r = $('#redoBtn'); if (u) u.disabled = !this.stack.length && !this.timer; if (r) r.disabled = !this.redo.length; }
};
window.Undo = Undo;

// ------------------------------------------------------------------ MIDI learn: the plug-in's parameter IDs (what the DAW shows), the page's knobs
const TK_KEYS = { [T.LEVEL]: 'lvl', [T.PAN]: 'pan', [T.TUNE]: 'tune', [T.DECAY]: 'dec', [T.CUT]: 'cut', [T.RES]: 'res', [T.DRIVE]: 'drv', [T.SENDR]: 'rev', [T.SENDD]: 'dly' };
const XT_KEYS = { [XT.PUNCH]: 'punch', [XT.COMP]: 'comp', [XT.LOW]: 'low', [XT.HIGH]: 'high' };
const G_KEYS = { [G.MASTER]: 'master', [G.DRIVE]: 'drive', [G.COMP]: 'comp', [G.SWING]: 'swing', [G.HUMAN]: 'human', [G.WIDTH]: 'width', [G.REVSIZE]: 'revsize', [G.REVTONE]: 'revtone',
  [G.DLYTIME]: 'dlytime', [G.DLYFB]: 'dlyfb', [G.DLYTONE]: 'dlytone', [G.DUCKTIME]: 'ducktime', [G.STUTLEN]: 'stutlen', [XGID(XG.XYON)]: 'xyon', [XGID(XG.XYX)]: 'xyx', [XGID(XG.XYY)]: 'xyy', [XGID(XG.REPEAT)]: 'repeat' };
function hostKey(pid) {
  pid = +pid; if (G_KEYS[pid]) return G_KEYS[pid];
  if (pid >= NGLOBAL && pid < X_BASE) { const t = Math.floor((pid - NGLOBAL) / NTP), k = (pid - NGLOBAL) % NTP; return TK_KEYS[k] ? 't' + (t + 1) + TK_KEYS[k] : null; }
  if (pid >= X_BASE + NXG) { const t = Math.floor((pid - X_BASE - NXG) / NXT), k = (pid - X_BASE - NXG) % NXT; return XT_KEYS[k] ? 't' + (t + 1) + XT_KEYS[k] : null; }
  return null;
}
const pidOfKey = key => { for (let pid = 0; pid < P_COUNT; pid++) if (hostKey(pid) === key) return pid; return -1; };
const RANGES = {};   // what a CC's 0..127 covers on the page (the web's own learn; the plug-in uses its parameter ranges)
function rangeOf(pid) {
  pid = +pid; if (RANGES[pid]) return RANGES[pid];
  if (pid >= NGLOBAL && pid < X_BASE) { const k = (pid - NGLOBAL) % NTP; return k === T.TUNE ? [-24, 24] : k === T.PAN ? [-1, 1] : [0, 1]; }
  if (pid >= X_BASE + NXG) { const k = (pid - X_BASE - NXG) % NXT; return k === XT.LOW || k === XT.HIGH ? [-1, 1] : [0, 1]; }
  return { [G.SWING]: [0, .6], [G.WIDTH]: [0, 1.5], [G.DLYTIME]: [0, 7], [G.DLYFB]: [0, .95], [G.DUCKTIME]: [.02, 1], [G.STUTLEN]: [0, 3], [XGID(XG.XYX)]: [-1, 1], [XGID(XG.REPEAT)]: [0, 4] }[pid] || [0, 1];
}
const Learn = {
  armKey: null, web: JSON.parse(LS.get('pulsar.learn') || '{}'),        // web: {cc: key}
  menu(e, key, label) {
    e.preventDefault(); Learn.close();
    const m = h('div', { class: 'ctx', style: `left:${Math.min(e.clientX, innerWidth - 190)}px;top:${Math.min(e.clientY, innerHeight - 80)}px` });
    const cc = Learn.ccOf(key);
    const a = h('button', {}, '🎛 ' + tr('MIDI LEARN') + (cc !== null ? ` (CC ${cc})` : '')); a.onclick = () => { Learn.arm(key, label); Learn.close(); };
    m.append(h('div', { class: 'ctxT' }, label), a);
    if (cc !== null) { const f = h('button', {}, '✕ ' + tr('FORGET MIDI')); f.onclick = () => { Learn.forget(key); Learn.close(); }; m.append(f); }
    document.body.append(m); setTimeout(() => document.addEventListener('pointerdown', Learn.close, { once: true }), 0);
  },
  close() { $$('.ctx').forEach(x => x.remove()); },
  ccOf(key) { if (Bridge.kind === 'plugin') { const c = (UI.learn || {})[key]; return c === undefined ? null : c; } for (const [c, k] of Object.entries(Learn.web)) if (k === key) return +c; return null; },
  arm(key, label) { Learn.armKey = key; Learn.armLabel = label; toast('🎛 ' + label + ' · ' + tr('Move a knob or fader on your controller')); if (Bridge.kind === 'plugin') Bridge.post({ t: 'learn', key }); },
  forget(key) { if (Bridge.kind === 'plugin') { Bridge.post({ t: 'learn', key: 'forget:' + key }); if (UI.learn) delete UI.learn[key]; } else { for (const c of Object.keys(Learn.web)) if (Learn.web[c] === key) delete Learn.web[c]; LS.set('pulsar.learn', JSON.stringify(Learn.web)); } },
  learned(cc) { if (!Learn.armKey) return; if (Bridge.kind === 'plugin') { UI.learn = UI.learn || {}; for (const k of Object.keys(UI.learn)) if (UI.learn[k] === cc) delete UI.learn[k]; UI.learn[Learn.armKey] = cc; }
    else { Learn.web[cc] = Learn.armKey; LS.set('pulsar.learn', JSON.stringify(Learn.web)); }
    toast(tr('Learned') + ': CC ' + cc + ' → ' + Learn.armLabel); Learn.armKey = null; },
  webCC(cc, v) {      // the web version: CC messages from WebMIDI
    if (Learn.armKey) { Learn.learned(cc); }
    const key = Learn.web[cc]; if (!key) return; const u = v / 127;
    if (key.startsWith('fx')) { const i = +key.slice(2); setFX(u >= .5 ? UI.fx | (1 << i) : UI.fx & ~(1 << i)); return; }
    const pid = pidOfKey(key); if (pid < 0) return; const [lo, hi] = rangeOf(pid); let x = lo + (hi - lo) * u; if (pid === XGID(XG.REPEAT) || pid === G.DLYTIME || pid === G.STUTLEN) x = Math.round(x);
    setP(pid, x); redrawPid(pid);
  },
  moved(d) {          // the plug-in: a learned CC moved something
    if (d.id >= 0) { PARAMS[d.id] = d.v; redrawPid(d.id); } else if (d.id <= -1 && d.id > -100) { UI.fx = d.fx; $$('.fx').forEach((b, i) => b.classList.toggle('on', !!((UI.fx >> i) & 1))); }
  }
};
function redrawPid(pid) { $$(`[data-pid="${pid}"]`).forEach(el => el.redraw && el.redraw()); if (pid === XGID(XG.XYX) || pid === XGID(XG.XYY) || pid === XGID(XG.XYON)) XY.draw(); if (pid === XGID(XG.REPEAT)) Pro.renderPerf(); }

// ------------------------------------------------------------------ the performance pad: X sweeps a DJ filter, Y throws everything into reverb and delay
const XY = {
  hold: false, el: null,
  build() {
    const box = h('div', { class: 'xy', title: 'XY' }); const cv = h('canvas', { width: 220, height: 92 }); box.append(cv, h('div', { class: 'xyL' }, tr('FILTER ◀ ▶ · SPACE ▲')));
    this.el = cv; let down = false;
    const set = e => { const r = cv.getBoundingClientRect(); const x = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1), y = clamp(1 - (e.clientY - r.top) / r.height, 0, 1);
      setP(XGID(XG.XYX), Math.abs(x) < .06 ? 0 : x); setP(XGID(XG.XYY), y < .05 ? 0 : y); this.draw(); };
    cv.onpointerdown = e => { e.preventDefault(); down = true; cv.setPointerCapture(e.pointerId); setP(XGID(XG.XYON), 1); set(e); };
    cv.onpointermove = e => { if (down) set(e); };
    cv.onpointerup = cv.onpointercancel = () => { down = false; if (!this.hold) { setP(XGID(XG.XYON), 0); setP(XGID(XG.XYX), 0); setP(XGID(XG.XYY), 0); } this.draw(); };
    cv.oncontextmenu = e => { if (Bridge.kind === 'plugin' || navigator.requestMIDIAccess) { const r = cv.getBoundingClientRect(); const xs = (e.clientX - r.left) < r.width / 2; Learn.menu(e, xs ? 'xyx' : 'xyy', 'XY ' + (xs ? 'X (FILTER)' : 'Y (SPACE)')); } else e.preventDefault(); };
    const hb = h('button', { class: 'xyH' + (this.hold ? ' on' : '') }, tr('HOLD')); hb.onclick = () => { this.hold = !this.hold; hb.classList.toggle('on', this.hold); if (!this.hold) { setP(XGID(XG.XYON), 0); setP(XGID(XG.XYX), 0); setP(XGID(XG.XYY), 0); this.draw(); } };
    box.append(hb); this.draw(); return box;
  },
  draw() {
    const cv = this.el; if (!cv) return; const g = cv.getContext('2d'), W = cv.width, H = cv.height, on = PARAMS[XGID(XG.XYON)] > .5;
    g.clearRect(0, 0, W, H); g.fillStyle = '#0c0f15'; g.fillRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(70,224,255,.22)'); gr.addColorStop(.5, 'rgba(70,224,255,0)'); gr.addColorStop(1, 'rgba(255,90,54,.22)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#232835'; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.moveTo(0, H - 1); g.lineTo(W, H - 1); g.stroke();
    g.fillStyle = '#4c5466'; g.font = '700 9px ui-monospace,monospace'; g.fillText('LP', 6, H - 6); g.fillText('HP', W - 20, H - 6);
    if (on) { const x = (PARAMS[XGID(XG.XYX)] + 1) / 2 * W, y = (1 - PARAMS[XGID(XG.XYY)]) * H;
      const rg = g.createRadialGradient(x, y, 0, x, y, 26); rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(.3, 'rgba(70,224,255,.8)'); rg.addColorStop(1, 'rgba(70,224,255,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, 26, 0, 7); g.fill(); }
  }
};

// ------------------------------------------------------------------ locks: Generate, Vary, Build, Dice and kits leave a locked track alone
const isLocked = t => PARAMS[TXID(t, XT.LOCK)] > .5;
function keepLocked(fn) {
  const locked = []; for (let t = 0; t < NT; t++) if (isLocked(t)) locked.push(t);
  if (!locked.length) return fn();
  const pats = UI.pats.map(b => b.slice()), snd = locked.map(t => ({ t, p: Array.from({ length: NTP }, (_, k) => PARAMS[TPID(t, k)]), x: Array.from({ length: NXT }, (_, k) => PARAMS[TXID(t, k)]), kit: UI.kit[t] }));
  const r = fn();
  for (const s of snd) { s.p.forEach((v, k) => (PARAMS[TPID(s.t, k)] = v)); s.x.forEach((v, k) => (PARAMS[TXID(s.t, k)] = v)); UI.kit[s.t] = s.kit; }
  for (let p = 0; p < NPAT; p++) for (const t of locked) UI.pats[p].set(pats[p].subarray(to(t), to(t) + PAT.TRK), to(t));
  pushAll(); renderRows(); renderPanel(); return r;
}
const _gen = doGenerate, _vary = doVary, _build = doBuild;
doGenerate = () => keepLocked(_gen); doVary = () => keepLocked(_vary); doBuild = () => keepLocked(_build);
function diceTrack(t) {      // a new part for this track only, in the style, at the complexity
  const b = UI.pats[UI.cur], g = generate(UI.style, genSeed(), UI.cplx);
  const role = tp(t, T.ROLE) | 0; let src = t; for (let u = 0; u < NT; u++) if ((PARAMS[TPID(u, T.ROLE)] | 0) === role && getStep(g, u, 0) !== undefined && Array.from({ length: 16 }, (_, s) => getStep(g, u, s).vel).some(v => v)) { src = u; if (u === t) break; }
  const before = b.slice(to(t), to(t) + PAT.TRK).join();
  b.set(g.subarray(to(src), to(src) + PAT.TRK), to(t));
  if (b.slice(to(t), to(t) + PAT.TRK).join() === before) { for (let k = 0; k < 8 && b.slice(to(t), to(t) + PAT.TRK).join() === before; k++) mutateTrack(t, true); }   // the style's part was this one: move it
  pushPat(UI.cur); renderGrid(); toast(tr('DICE') + ' · ' + (UI.kit[t] ? UI.kit[t].n : t + 1));
}
function mutateTrack(t, quiet) {    // the same idea, moved: a few hits shift, ghost notes come and go, a roll appears
  const b = UI.pats[UI.cur], r = RNG(genSeed()), L = trkLen(b, t);
  for (let s = 0; s < L; s++) { const st = getStep(b, t, s);
    if (st.vel && s % 4 !== 0 && r.chance(.18)) { const d = r.chance(.5) ? 1 : -1, n = (s + d + L) % L; if (!getStep(b, t, n).vel) { b.set(b.slice(so(t, s), so(t, s) + 8), so(t, n)); clearStep(b, t, s); } }
    else if (!st.vel && r.chance(.08)) setStep(b, t, s, { vel: 26 + r.int(30) });
    else if (st.vel && st.vel < 60 && r.chance(.3)) clearStep(b, t, s);
    else if (st.vel && r.chance(.06)) setStep(b, t, s, { rat: 2 + r.int(3), rmode: r.int(2) }); }
  if (quiet) return; pushPat(UI.cur); renderGrid(); toast(tr('MUTATE') + ' · ' + (UI.kit[t] ? UI.kit[t].n : t + 1));
}

// ------------------------------------------------------------------ MIDI out of the plug-in: drag the pattern (or a track) onto a DAW track
function midiBytes(only) { const list = UI.songOn ? UI.song.map(([p, r]) => ({ bytes: UI.pats[p], rep: r })) : [{ bytes: UI.pats[UI.cur], rep: 1 }];
  return midiFile(list, PARAMS[G.BPM], UI.kit.map(k => k.n), true, only); }
function midiName(only) { return `PULSAR ${UI.songOn ? 'song' : 'pattern ' + (UI.cur + 1)}${only !== undefined ? ' ' + (UI.kit[only] ? UI.kit[only].n : 'T' + (only + 1)) : ''} ${Math.round(PARAMS[G.BPM])}bpm.mid`.replace(/[\/:]/g, '-'); }
function dragMidiEl(el, only) {
  if (Bridge.kind === 'plugin') { el.onpointerdown = e => { e.preventDefault(); Bridge._call('dragMidi', [midiName(only), b64(midiBytes(only))]); }; el.title = 'Drag onto a MIDI track in your DAW'; return el; }
  el.draggable = true; el.title = 'Drag onto your desktop or DAW (Chrome), or click to save';
  el.ondragstart = e => { const u = URL.createObjectURL(new Blob([midiBytes(only)], { type: 'audio/midi' })); e.dataTransfer.setData('DownloadURL', 'audio/midi:' + midiName(only) + ':' + u); };
  el.onclick = () => download(midiName(only), midiBytes(only), 'audio/midi'); return el;
}

// ------------------------------------------------------------------ resample: one loop of what plays now becomes a sample on the chosen track
function resample(t) {
  const b = UI.pats[UI.cur], steps = UI.songOn ? 0 : (b[0] || 16); if (!steps) { toast('SONG OFF'); return; }
  const len = Math.round(steps * 60 / PARAMS[G.BPM] / 4 * Bridge.sampleRate); UI.rsTrack = t;
  if (!UI.playing) togglePlay();
  Bridge.post({ t: 'resample', len }); toast('⏺ ' + tr('Resampling one loop…'));
}
async function resampledWeb(data) {
  const t = UI.rsTrack ?? UI.sel, bpm = PARAMS[G.BPM], bars = Math.max(1, Math.round(data.length / Bridge.sampleRate * bpm / 240)), name = 'RESAMPLE ' + (UI.sounds.filter(s => s.group === 'user').length + 1);
  const idx = await Bridge.addSample(data, Bridge.sampleRate, bpm, bars * 16, name); resampledIn({ name, idx, bpm, bars }, t);
}
function resampledIn(r, t) { if (r.idx < 0) { toast('memory full'); return; } userSampleIn(r.name, r.idx, r.bpm, r.bars, t ?? UI.rsTrack ?? UI.sel); setTP(UI.sel, T.STRETCH, 1); if (UI.view === 'LIVE') renderLive(); toast('⏺ ' + tr('Resampled into the track') + ' ' + (UI.sel + 1)); }

// ------------------------------------------------------------------ the panels' new parts
const Pro = {
  mixExtras(P, t) {
    P.append(h('div', { class: 'sec' }, tr('PUNCH & EQ')), h('div', { class: 'knobs' },
      tx(t, XT.PUNCH, 'PUNCH', 0, 1, pct, 0), tx(t, XT.COMP, 'GLUE', 0, 1, pct, 0), tx(t, XT.LOW, 'LOW', -1, 1, v => (v > 0 ? '+' : '') + (v * 12).toFixed(1) + 'dB', 0), tx(t, XT.HIGH, 'HIGH', -1, 1, v => (v > 0 ? '+' : '') + (v * 12).toFixed(1) + 'dB', 0)));
    if (Bridge.kind === 'plugin') {
      P.append(h('div', { class: 'sec' }, tr('OUTPUT')), chips(['MAIN', '1', '2', '3', '4', '5', '6', '7', '8'], PARAMS[TXID(t, XT.OUT)] | 0, i => { setP(TXID(t, XT.OUT), i); renderPanel(); }));
      P.append(h('div', { class: 'hint' }, LANG === 'es' ? 'SALIDA: en Ableton activa las salidas extra de PULSAR (en el canal de otra pista: Audio From → PULSAR → Bus 1…8) y cada pista va sola a su canal para mezclarla aparte. Su reverb y delay se quedan en la principal.' : 'OUTPUT: in Ableton, on another track pick Audio From → PULSAR → Bus 1…8 and this track plays there alone, to mix it on its own channel. Its reverb and delay sends stay on the main output.'));
    }
  },
  trackExtras(P, t) {
    P.append(h('div', { class: 'sec' }, tr('GENERATOR')));
    const ops = h('div', { class: 'chips' });
    const lk = h('button', { class: isLocked(t) ? 'on' : '' }, (isLocked(t) ? '🔒 ' : '🔓 ') + tr('LOCK')); lk.onclick = () => { setP(TXID(t, XT.LOCK), isLocked(t) ? 0 : 1); renderRows(); renderPanel(); };
    const dc = h('button', {}, '🎲 ' + tr('DICE')); dc.onclick = () => diceTrack(t);
    const mu = h('button', {}, '🧬 ' + tr('MUTATE')); mu.onclick = () => mutateTrack(t);
    const dm = dragMidiEl(h('button', {}, '⇱ ' + tr('DRAG MIDI')), t);
    const rs = h('button', { class: 'hot' }, '⏺ ' + tr('RESAMPLE')); rs.onclick = () => resample(t);
    ops.append(lk, dc, mu, dm, rs); P.append(ops);
    P.append(h('div', { class: 'hint' }, LANG === 'es' ? 'CANDADO: GENERAR, VARIAR, ARMAR TEMA y los kits no tocan esta pista. DADO: una parte nueva solo para ella. MUTAR: la misma idea, movida. ARRASTRAR MIDI: lleva solo esta pista a tu DAW. RESAMPLEAR: un loop de lo que suena se vuelve sample en esta pista (luego puedes picarlo).' : 'LOCK: GENERATE, VARY, BUILD TRACK and kits leave this track alone. DICE: a new part for it only. MUTATE: the same idea, moved. DRAG MIDI: only this track, into your DAW. RESAMPLE: one loop of what plays becomes a sample on this track (then chop it).'));
  },
  soundExtras() {},
  renderPerf() {
    let box = $('#perf2'); if (!box) { box = h('div', { id: 'perf2' }); $('#perf').insertBefore(box, $('#macros')); }
    box.innerHTML = ''; box.append(XY.build());
    const rp = h('div', { class: 'rpt' }, h('div', { class: 'lbl' }, tr('NOTE REPEAT')));
    const cur = PARAMS[XGID(XG.REPEAT)] | 0;
    REPEATS.forEach((n, i) => { const b = h('button', { class: i === cur ? 'on' : '' }, n); b.onclick = () => { setP(XGID(XG.REPEAT), i); Pro.renderPerf(); }; b.dataset.key = 'repeat'; rp.append(b); });
    const vs = h('button', { class: PARAMS[XGID(XG.VELSENS)] > .5 ? 'on' : '' }, tr('VELOCITY')); vs.onclick = () => { setP(XGID(XG.VELSENS), PARAMS[XGID(XG.VELSENS)] > .5 ? 0 : 1); Pro.renderPerf(); };
    rp.append(vs); box.append(rp);
  },
  topBar() {
    if ($('#undoBtn')) return;
    const u = h('button', { id: 'undoBtn', title: 'Undo (Cmd/Ctrl+Z)' }, '↶'), r = h('button', { id: 'redoBtn', title: 'Redo (Shift+Cmd/Ctrl+Z)' }, '↷');
    u.onclick = () => Undo.undo(); r.onclick = () => Undo.again();
    const dm = dragMidiEl(h('button', { id: 'dragMidi', class: 'drag' }, '⇱ MIDI'));
    $('#play').before(u, r); $('#midiBtn').after(dm);
  },
  boot() {
    Pro.topBar(); Pro.renderPerf(); Undo.start();
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) Undo.again(); else Undo.undo(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); Undo.again(); }
    }, true);
    // MIDI learn: right click a knob, an FX button or the pad
    document.addEventListener('contextmenu', e => {
      const k = e.target.closest('[data-pid]'), f = e.target.closest('.fx');
      if (k) { const key = hostKey(k.dataset.pid); if (key && (Bridge.kind === 'plugin' || navigator.requestMIDIAccess)) Learn.menu(e, key, (k.querySelector('.kl') || {}).textContent || key); }
      else if (f) { const i = $$('.fx').indexOf(f); if (i >= 0) Learn.menu(e, 'fx' + i, PERF[i]); }
    });
    Bridge.onLearned = d => Learn.learned(d.cc); Bridge.onCcMoved = d => Learn.moved(d);
    Bridge.onResampled = d => resampledWeb(d); Bridge.onResampledPlugin = r => resampledIn(r);
    if (Bridge.kind === 'web' && navigator.requestMIDIAccess) navigator.requestMIDIAccess().then(m => { const bind = () => m.inputs.forEach(i => i.addEventListener('midimessage', ev => {
      const [s, n, v] = ev.data; if ((s & 0xf0) === 0xb0) Learn.webCC(n, v); else if (((s & 0xf0) === 0x80 || ((s & 0xf0) === 0x90 && v === 0)) && n >= 36 && n < 52) Bridge.post({ t: 'padUp', t2: n - 36 }); })); bind(); m.onstatechange = bind; }).catch(() => {});
    // drop your samples on a track (a row in GRID, a strip in LIVE)
    const drop = (el, t) => { el.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); el.classList.add('dropping'); } });
      el.addEventListener('dragleave', () => el.classList.remove('dropping'));
      el.addEventListener('drop', async e => { e.preventDefault(); el.classList.remove('dropping'); const f = e.dataTransfer.files[0]; if (!f) return; UI.sel = t; try { await addUserSample(f); if (UI.view === 'LIVE') renderLive(); toast(tr('Dropped on') + ' ' + (t + 1) + ' · ' + f.name); } catch (er) { toast('✕ ' + er.message); } }); };
    const hookDrops = () => { $$('.row').forEach((r, t) => { if (!r.dataset.drop) { r.dataset.drop = 1; drop(r, t); } }); $$('.strip').forEach((r, t) => { if (!r.dataset.drop) { r.dataset.drop = 1; drop(r, t); } }); };
    new MutationObserver(hookDrops).observe($('#seq'), { childList: true, subtree: true }); hookDrops();
    // a lock shows on its row
    new MutationObserver(() => $$('.row').forEach((r, t) => r.classList.toggle('locked', isLocked(t)))).observe($('#rows'), { childList: true });
    $$('.row').forEach((r, t) => r.classList.toggle('locked', isLocked(t)));
    // FX buttons: their learn key
    renderHelp2();
  }
};
window.Pro = Pro;
const tx = (t, k, label, min, max, fmt, def) => { const el = knob(label, () => PARAMS[TXID(t, k)], v => setP(TXID(t, k), v), min, max, fmt, def); el.dataset.pid = TXID(t, k); return el; };

// ------------------------------------------------------------------ help: what is new
function renderHelp2() {
  const base = renderHelp;
  renderHelp = () => { base();
    const en = `<h3>PULSAR 2: PLAY IT LIVE</h3><p><b>XY PAD</b> (bottom): hold and move: left a low-pass sweep, right a high-pass, up throws everything into reverb and delay; let go and it snaps back (HOLD keeps it). <b>NOTE REPEAT</b> 1/8 · 1/16 · 1/32 · 1/16T: hold a pad and it repeats on the grid, like an MPC; with REC on it writes the hits. <b>VELOCITY</b> off: every pad plays full.</p>
<h3>SOUND AND MIX</h3><p>MIX › <b>PUNCH</b> brings the attack forward, <b>GLUE</b> compresses, <b>LOW / HIGH</b> shelves ±12 dB. In the plug-in, <b>OUTPUT 1…8</b> sends a track to its own channel in your DAW (multi-out).</p>
<h3>IDEAS</h3><p>TRACK › <b>🔒 LOCK</b> keeps a track through GENERATE, VARY, BUILD and kits; <b>🎲 DICE</b> writes a new part for one track; <b>🧬 MUTATE</b> moves it a little; <b>⏺ RESAMPLE</b> turns one loop of what plays into a sample on that track. Drop your own WAV / AIFF / MP3 on any track.</p>
<h3>DAW AND CONTROLLERS</h3><p><b>⇱ MIDI</b>: drag the pattern (or the song) onto a MIDI track in Ableton; it plays PULSAR (notes 36–51). <b>Right click</b> any knob, FX button or the XY pad › MIDI LEARN, then move a control on your keyboard. <kbd>Cmd</kbd>+<kbd>Z</kbd> undo, <kbd>Shift</kbd>+<kbd>Cmd</kbd>+<kbd>Z</kbd> redo.</p>`;
    const es = `<h3>PULSAR 2: PARA TOCAR EN VIVO</h3><p><b>PAD XY</b> (abajo): mantén y mueve: a la izquierda un filtro pasa-bajos, a la derecha un pasa-altos, hacia arriba todo se va a la reverb y al delay; al soltar regresa (FIJAR lo deja). <b>REPETIR NOTA</b> 1/8 · 1/16 · 1/32 · 1/16T: mantén un pad y se repite en la cuadrícula, como una MPC; con REC graba los golpes. <b>VELOCIDAD</b> apagada: todos los pads suenan fuerte.</p>
<h3>SONIDO Y MEZCLA</h3><p>MEZCLA › <b>GOLPE+</b> adelanta el ataque, <b>COMPRESIÓN</b> aprieta, <b>GRAVES / AGUDOS</b> ±12 dB. En el plugin, <b>SALIDA 1…8</b> manda una pista a su propio canal en tu DAW (multi-salida).</p>
<h3>IDEAS</h3><p>PISTA › <b>🔒 CANDADO</b> conserva una pista al GENERAR, VARIAR, ARMAR TEMA y con los kits; <b>🎲 DADO</b> escribe una parte nueva para una pista; <b>🧬 MUTAR</b> la mueve un poco; <b>⏺ RESAMPLEAR</b> convierte un loop de lo que suena en sample en esa pista. Suelta tus WAV / AIFF / MP3 en cualquier pista.</p>
<h3>DAW Y CONTROLADORES</h3><p><b>⇱ MIDI</b>: arrastra el patrón (o la canción) a una pista MIDI de Ableton; toca PULSAR (notas 36–51). <b>Clic derecho</b> en cualquier perilla, botón de efecto o el pad XY › APRENDER MIDI, y mueve un control de tu teclado. <kbd>Cmd</kbd>+<kbd>Z</kbd> deshacer, <kbd>Shift</kbd>+<kbd>Cmd</kbd>+<kbd>Z</kbd> rehacer.</p>`;
    $('#helpBox').insertAdjacentHTML('beforeend', LANG === 'es' ? es : en); };
}
