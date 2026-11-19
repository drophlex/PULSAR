/* app.js — PULSAR interface */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v; else if (k.startsWith('on')) e[k] = v; else e.setAttribute(k, v); } for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k)); return e; };
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ------------------------------------------------------------------ language (English by default, Spanish on the EN · ES button)
const ES = { 'a drum machine for broken beats': 'una caja de ritmos para beats rotos', 'PATTERN': 'PATRÓN', 'COMPLEX': 'COMPLEJO', 'GENERATE': '⚡ GENERAR', 'VARY': 'VARIAR',
  'BUILD TRACK': 'ARMAR TEMA', 'SAVE': 'GUARDAR', 'OPEN': 'ABRIR', 'DONATE': 'DONAR', 'START': 'EMPEZAR', 'created at': 'creado en', 'free and open source': 'gratis y de código abierto', 'design': 'diseño', 'built at': 'construido en',
  'SOUND': 'SONIDO', 'MIX': 'MEZCLA', 'STEP': 'PASO', 'TRACK': 'PISTA', 'SONG': 'CANCIÓN', 'MASTER': 'MASTER', 'Sound': 'Sonido', 'Mixer': 'Mezcla', 'Step': 'Paso',
  'TUNE': 'AFINAR', 'DECAY': 'CAÍDA', 'TONE': 'TONO', 'SNAP': 'GOLPE', 'ATTACK': 'ATAQUE', 'START POINT': 'INICIO', 'DRIVE': 'SATURAR', 'CUTOFF': 'CORTE', 'RESO': 'RESO',
  'LEVEL': 'NIVEL', 'PAN': 'PANEO', 'REVERB': 'REVERB', 'DELAY': 'DELAY', 'DUCK': 'DUCK', 'SWING': 'SWING', 'VELOCITY': 'VELOCIDAD', 'CHANCE': 'PROBAB.', 'MICRO': 'MICRO',
  'PITCH': 'TONO', 'SLICE': 'CORTE', 'ROLL': 'REDOBLE', 'ROLL CHANCE': 'PROB. REDOBLE', 'CONDITION': 'CONDICIÓN', 'LENGTH': 'LARGO', 'SPEED': 'VELOCIDAD', 'DIRECTION': 'DIRECCIÓN',
  'SAMPLER ERA': 'ÉPOCA DEL SAMPLER', 'STRETCH TO TEMPO': 'AJUSTAR AL TEMPO', 'REPITCH': 'RE-AFINAR', 'REVERSE': 'REVERSA', 'FILTER': 'FILTRO', 'CHOKE': 'CORTE MUTUO',
  'LOAD YOUR SAMPLE': 'CARGA TU SAMPLE', 'ROLE': 'PAPEL', 'EUCLID': 'EUCLIDIANO', 'CLEAR': 'BORRAR', 'COPY': 'COPIAR', 'PASTE': 'PEGAR', 'SHIFT ←': 'MOVER ←', 'SHIFT →': 'MOVER →',
  'RANDOM': 'AZAR', 'COMP': 'COMP', 'HUMAN': 'HUMANO', 'REV SIZE': 'TAMAÑO REV', 'DLY TIME': 'TIEMPO DLY', 'DLY FB': 'REPETIC.', 'VOLUME': 'VOLUMEN',
  'CLEAR MOTION': 'BORRAR MOVIMIENTOS', 'Pick a step (right click or long press) to edit it.': 'Elige un paso (clic derecho o mantener) para editarlo.',
  'kit': 'kit', 'saved': 'guardado', 'Recording motion: knobs, pads and FX go into the pattern': 'Grabando: perillas, pads y efectos entran al patrón',
  'Generated': 'Generado', 'Variation': 'Variación', 'A whole track in the song': 'Un tema completo en la canción', 'MIDI saved': 'MIDI guardado', 'Recording audio…': 'Grabando audio…',
  'WAV saved': 'WAV guardado', 'Sample loaded': 'Sample cargado', 'Copied': 'Copiado', 'Pasted': 'Pegado', 'ADD': 'AÑADIR', 'SONG MODE': 'MODO CANCIÓN', 'repeats': 'veces',
  'PATTERN LENGTH': 'LARGO DEL PATRÓN', 'PATTERN SWING': 'SWING DEL PATRÓN', 'sounds': 'sonidos', 'YOUR SAMPLES': 'TUS SAMPLES', 'SYNTH MODEL': 'MODELO', 'FOLLOW': 'SEGUIR' };
let LANG = LS.get('pulsar.lang') === 'es' ? 'es' : 'en';
const tr = s => LANG === 'es' && ES[s] ? ES[s] : s;
function applyLang() { $$('[data-i]').forEach(e => { e.textContent = tr(e.dataset.i); }); $('#langBtn').innerHTML = LANG === 'es' ? 'EN · <b>ES</b>' : '<b>EN</b> · ES'; }

// ------------------------------------------------------------------ state
const UI = { view: LS.get('pulsar.view') || 'LAB', cur: 0, sel: 0, selStep: -1, page: 0, tab: 'SOUND', playing: false, rec: false, fx: 0, fillHold: false, songOn: false, song: [[0, 1]],
  style: 'BIG BEAT', cplx: 0.5, seed: 1, pats: [], kit: [], tele: null, clip: null, dirty: -1, sounds: [], soundIdx: {}, userSamples: [], wavRec: false };
const PARAMS = new Float32Array(P_COUNT);
PARAMS[XGID(XG.VELSENS)] = 1;
Object.entries({ BPM: 120, SWING: 0, MASTER: .8, REVSIZE: .5, REVTONE: .6, DLYTIME: 3, DLYFB: .4, DLYTONE: .6, COMP: .3, DRIVE: .1, DUCKSRC: 0, DUCKTIME: .35, STUTLEN: 1, HUMAN: 0, WIDTH: 1 }).forEach(([k, v]) => (PARAMS[G[k]] = v));
for (let p = 0; p < NPAT; p++) UI.pats[p] = patNew();

function setP(id, v, send = true) { PARAMS[id] = v; if (send && Bridge.ready) Bridge.param(id, v); if (window.Undo) Undo.touch(); }
const tp = (t, k) => PARAMS[TPID(t, k)];
const setTP = (t, k, v) => setP(TPID(t, k), v);
const pushPat = p => { if (window.Undo) Undo.touch(); return Bridge.ready && Bridge.setPat(p, UI.pats[p]); };
function pushAll() { for (let p = 0; p < NPAT; p++) pushPat(p); Bridge.params([...PARAMS].map((v, i) => [i, v])); pushSong(); }
function pushSong() { const b = new Uint8Array(128); UI.song.forEach(([p, r], i) => { b[i * 2] = p; b[i * 2 + 1] = r; }); Bridge.post({ t: 'song', bytes: b, n: UI.song.length, on: UI.songOn }); }
function toast(m) { const t = $('#toast'); t.textContent = m; t.style.opacity = 1; clearTimeout(toast.t); toast.t = setTimeout(() => (t.style.opacity = 0), 1600); }

// ------------------------------------------------------------------ sounds: decode the library once, give each its engine slot
async function loadSounds() {
  if (Bridge.kind === 'plugin') { SOUNDS.forEach((s, i) => { UI.soundIdx[s.id] = i; UI.sounds.push({ id: s.id, group: s.group, name: s.name, cat: s.cat, idx: i, bpm: s.bpm || 0 }); }); return; }
  const ctx = Bridge.ctx;
  for (const s of SOUNDS) {
    const bytes = Uint8Array.from(atob(s.b64), c => c.charCodeAt(0));
    let buf; try { buf = await (Bridge.kind === 'plugin' ? decodeOffline(bytes) : ctx.decodeAudioData(bytes.buffer)); } catch (e) { continue; }
    let d = buf.getChannelData(0); const sr = buf.sampleRate;
    let st = 0; for (let i = 0; i < Math.min(d.length, 4000); i++) if (Math.abs(d[i]) > 0.02) { st = Math.max(0, i - 8); break; }   // the codec's lead-in out
    d = d.subarray(st);
    if (s.bpm) d = d.subarray(0, Math.min(d.length, Math.round(s.bars * 4 * 60 / s.bpm * sr)));                                 // a loop: exactly its bars
    const idx = await Bridge.addSample(Float32Array.from(d), sr, s.bpm || 0, s.slices || 16);
    UI.soundIdx[s.id] = idx; UI.sounds.push({ id: s.id, group: s.group, name: s.name, cat: s.cat, idx, bpm: s.bpm || 0 });
  }
}
let offCtx = null;
function decodeOffline(bytes) { offCtx = offCtx || new OfflineAudioContext(1, 1, 48000); return offCtx.decodeAudioData(bytes.buffer); }

// ------------------------------------------------------------------ kits
const DEF = { MODE: 0, SYN: 0, SMP: -1, TUNE: 0, DECAY: .5, TONE: .5, SNAP: .5, DRIVE: 0, ERA: 0, STRETCH: 1, START: 0, REV: 0, CUT: 1, RES: .1, FTYPE: 0, LEVEL: .72, PAN: 0, SENDR: 0, SENDD: 0, CHOKE: 0, DUCK: 0, SWING: 0, ROLE: 3, ATK: 0 };
function applySound(t, spec) {
  const p = Object.assign({}, DEF);
  p.MODE = spec.m === 'syn' ? 0 : spec.m === 'smp' ? 1 : 2; p.ROLE = ROLES.indexOf(spec.role); if (p.ROLE < 0) p.ROLE = 3;
  if (spec.m === 'syn') p.SYN = SYN[spec.s] || 0; else { p.SMP = UI.soundIdx[spec.s] ?? -1; p.DECAY = spec.m === 'brk' ? .35 : 1; }
  if (p.ROLE === 4) p.DUCK = .25;
  const pans = { 3: -.18, 4: .2, 7: -.3, 8: .3, 9: .25, 11: -.2, 13: .35, 15: -.35 }; if (pans[t]) p.PAN = pans[t];
  Object.assign(p, spec.p || {});
  for (const [k, v] of Object.entries(p)) PARAMS[TPID(t, T[k])] = v;
  UI.kit[t] = { n: spec.n, m: spec.m, s: spec.s };
}
function applyKit(name) { (KITS[name] || KITS['BIG BEAT']).forEach((s, t) => applySound(t, s)); if (Bridge.ready) Bridge.params([...PARAMS].map((v, i) => [i, v])); renderRows(); renderPanel(); }

// ------------------------------------------------------------------ the sequencer grid
function stepColor(t) { const r = tp(t, T.ROLE); return ['#ff5a36', '#46e0ff', '#c6ff3d', '#a77bff', '#ffc54d', '#ff7ad9'][r | 0] || '#46e0ff'; }
function renderRows() {
  const box = $('#rows'); box.innerHTML = '';
  for (let t = 0; t < NT; t++) {
    const row = h('div', { class: 'row' + (t === UI.sel ? ' sel' : ''), 'data-t': t });
    const mb = h('button', { class: 'mb', title: 'Mute' }, 'M'); mb.onclick = () => { setTrkMute(UI.pats[UI.cur], t, !trkMute(UI.pats[UI.cur], t)); pushPat(UI.cur); renderGrid(); };
    const sb = h('button', { class: 'sb', title: 'Solo' }, 'S'); sb.onclick = () => solo(t);
    const nm = h('div', { class: 'nm' }, h('i', {}, UI.kit[t] ? UI.kit[t].n : 'T' + (t + 1)), h('em', {}, ['SYN', 'SMP', 'BRK'][tp(t, T.MODE) | 0]), h('div', { class: 'mt' }));
    nm.onpointerup = nm.onpointercancel = () => Bridge.post({ t: 'padUp', t2: t });
    nm.onpointerdown = e => { UI.sel = t; Bridge.post({ t: 'pad', t2: t, vel: 110 }); $$('.row').forEach((r, i) => r.classList.toggle('sel', i === t)); renderPanel(); };
    const steps = h('div', { class: 'steps' });
    for (let i = 0; i < 16; i++) {
      const c = h('div', { class: 'st' }); c.dataset.s = i; steps.append(c);
      let drag = null, lp = null;
      c.onpointerdown = e => { e.preventDefault(); const s = UI.page * 16 + i, b = UI.pats[UI.cur]; if (s >= trkLen(b, t)) return;
        if (e.button === 2 || e.shiftKey) { selectStep(t, s); return; }
        const st = getStep(b, t, s); drag = { y: e.clientY, v: st.vel, was: st.vel, moved: false }; c.setPointerCapture(e.pointerId);
        lp = setTimeout(() => { if (drag && !drag.moved) { selectStep(t, s); drag = null; } }, 450); };
      c.onpointermove = e => { if (!drag) return; const dy = drag.y - e.clientY; if (Math.abs(dy) > 4 && drag.was) { drag.moved = true; clearTimeout(lp); const s = UI.page * 16 + i; setStep(UI.pats[UI.cur], t, s, { vel: clamp(drag.v + dy, 1, 127) }); pushPat(UI.cur); paintStep(t, i); } };
      c.onpointerup = () => { clearTimeout(lp); if (!drag) return; const s = UI.page * 16 + i, b = UI.pats[UI.cur];
        if (!drag.moved) { if (drag.was) clearStep(b, t, s); else setStep(b, t, s, { vel: 100 }); pushPat(UI.cur); paintStep(t, i); if (UI.selStep >= 0 && UI.sel === t && UI.selStep === s) renderPanel(); } drag = null; };
      c.oncontextmenu = e => e.preventDefault();
    }
    const ln = h('div', { class: 'ln' }, h('span', { title: tr('LENGTH') }, String(trkLen(UI.pats[UI.cur], t))));
    dragNum(ln.firstChild, () => trkLen(UI.pats[UI.cur], t), v => { setTrkLen(UI.pats[UI.cur], t, v); pushPat(UI.cur); renderGrid(); }, 1, 64);
    row.append(mb, sb, nm, steps, ln); box.append(row);
  }
  renderGrid();
}
let soloT = -1;
function solo(t) { const b = UI.pats[UI.cur]; soloT = soloT === t ? -1 : t; for (let u = 0; u < NT; u++) setTrkMute(b, u, soloT >= 0 && u !== soloT); pushPat(UI.cur); renderGrid(); }
function paintStep(t, i) {
  const row = $$('.row')[t]; if (!row) return; const c = row.querySelectorAll('.st')[i], b = UI.pats[UI.cur], s = UI.page * 16 + i, L = trkLen(b, t);
  const st = getStep(b, t, s); c.className = 'st' + (s >= L ? ' off' : '') + (st.vel ? ' on' : '') + (st.vel && st.prob < 100 ? ' prob' : '') + (UI.sel === t && UI.selStep === s ? ' sel' : '');
  c.style.setProperty('--c', stepColor(t)); c.style.setProperty('--v', (st.vel / 127).toFixed(2)); c.innerHTML = '';
  if (st.vel && st.rat > 1) c.append(h('b', {}, '×' + st.rat)); if (st.vel && st.cond) c.append(h('s', {}, CONDS[st.cond].replace('NOT ', '!').slice(0, 4)));
}
function renderGrid() {
  const b = UI.pats[UI.cur]; if (UI.view === 'LIVE') renderLive();
  for (let t = 0; t < NT; t++) { for (let i = 0; i < 16; i++) paintStep(t, i); const row = $$('.row')[t]; if (!row) continue;
    row.querySelector('.mb').classList.toggle('on', !!trkMute(b, t)); row.querySelector('.sb').classList.toggle('on', soloT === t); row.querySelector('.ln span').textContent = trkLen(b, t) + (trkSpeed(b, t) !== 1 ? ' ' + SPEEDS[trkSpeed(b, t)] : ''); }
  const maxL = Math.max(...Array.from({ length: NT }, (_, t) => trkLen(b, t)), b[0]); const pages = Math.ceil(maxL / 16);
  const pb = $('#pageBar'); pb.innerHTML = ''; if (UI.page >= pages) UI.page = 0;
  for (let p = 0; p < Math.max(1, pages); p++) { const x = h('button', { class: p === UI.page ? 'on' : '' }, `${p * 16 + 1}-${p * 16 + 16}`); x.onclick = () => { UI.page = p; renderGrid(); }; pb.append(x); }
  pb.append(h('span', { class: 'lbl', style: 'margin-left:10px' }, tr('Pick a step (right click or long press) to edit it.')));
  renderPats();
}
function selectStep(t, s) { UI.sel = t; UI.selStep = s; UI.tab = 'STEP'; $$('.row').forEach((r, i) => r.classList.toggle('sel', i === t)); renderGrid(); renderPanel(); openSide(); }
function renderPats() {
  const box = $('#pats'); box.innerHTML = '';
  for (let p = 0; p < NPAT; p++) { const has = UI.pats[p].some((v, i) => i >= 8 && i < PAT.PERF && (i - 8) % 520 >= 8 && ((i - 8) % 520 - 8) % 8 === 0 && v);
    const q = UI.tele && UI.tele[3] === p; const x = h('button', { class: (p === UI.cur ? 'cur' : '') + (has ? ' has' : '') + (q ? ' q' : '') }, String(p + 1));
    x.onclick = e => { if (e.shiftKey) { UI.pats[p] = UI.pats[UI.cur].slice(); pushPat(p); toast(tr('Copied') + ' ' + (UI.cur + 1) + ' → ' + (p + 1)); renderPats(); return; }
      Bridge.post({ t: 'select', p, now: !UI.playing }); if (!UI.playing) { UI.cur = p; renderGrid(); renderPanel(); } };
    box.append(x); }
  $('#songBtn').classList.toggle('on', UI.songOn);
}


// ------------------------------------------------------------------ LIVE view: a strip per instrument (like the hardware boxes), and a step row for the chosen one
function setView(v) { UI.view = v; LS.set('pulsar.view', v); $('#vLive').classList.toggle('on', v === 'LIVE'); $('#vGrid').classList.toggle('on', v === 'GRID');
  $('#live').classList.toggle('show', v === 'LIVE'); $('#gridV').style.display = v === 'LIVE' ? 'none' : ''; if (v === 'LIVE') renderLive(); else renderGrid(); }
function renderLive() {
  const box = $('#strips'); if (!box) return; box.innerHTML = ''; const b = UI.pats[UI.cur];
  for (let t = 0; t < NT; t++) {
    const col = stepColor(t), st = h('div', { class: 'strip' + (t === UI.sel ? ' sel' : ''), style: '--c:' + col });
    const nm = h('div', { class: 'sn', title: UI.kit[t] ? UI.kit[t].s : '' }, UI.kit[t] ? UI.kit[t].n : 'T' + (t + 1));
    nm.onclick = () => { UI.sel = t; $$('.strip').forEach((x, i) => x.classList.toggle('sel', i === t)); renderTR8(); renderPanel(); };
    const fad = h('input', { type: 'range', class: 'fad', min: 0, max: 100, value: Math.round(tp(t, T.LEVEL) * 100), title: tr('LEVEL') });
    fad.oninput = () => setTP(t, T.LEVEL, fad.value / 100);
    const pad = h('div', { class: 'pad', title: 'PLAY' });
    pad.onpointerup = pad.onpointercancel = pad.onpointerleave = () => Bridge.post({ t: 'padUp', t2: t });
    pad.onpointerdown = e => { e.preventDefault(); pad.setPointerCapture(e.pointerId); const r = pad.getBoundingClientRect(); const v = Math.round(60 + 67 * (1 - (e.clientY - r.top) / r.height)); Bridge.post({ t: 'pad', t2: t, vel: clamp(v, 1, 127) }); if (UI.sel !== t) { UI.sel = t; $$('.strip').forEach((x, i) => x.classList.toggle('sel', i === t)); renderTR8(); renderPanel(); } };
    const mute = h('button', { class: 'mute' + (trkMute(b, t) ? ' on' : '') }, 'MUTE'); mute.onclick = () => { setTrkMute(UI.pats[UI.cur], t, !trkMute(UI.pats[UI.cur], t)); pushPat(UI.cur); mute.classList.toggle('on', !!trkMute(UI.pats[UI.cur], t)); };
    st.append(nm, tk(t, T.TUNE, 'TUNE', -24, 24, v => (v > 0 ? '+' : '') + v.toFixed(0), 0), tk(t, T.DECAY, 'DECAY', 0, 1, pct, tp(t, T.MODE) ? 1 : .5),
      knob('COLOR', () => tp(t, T.FTYPE) === 1 ? 1 - tp(t, T.CUT) : tp(t, T.CUT) - 1, v => { if (v >= 0) { setTP(t, T.FTYPE, 1); setTP(t, T.CUT, 1 - v); } else { setTP(t, T.FTYPE, 0); setTP(t, T.CUT, 1 + v); } }, -1, 1, v => Math.abs(v) < .02 ? '—' : v < 0 ? 'LP' : 'HP', 0),
      tk(t, T.SENDD, 'FX', 0, 1, pct, 0), fad, pad, mute);
    box.append(st);
  }
  renderTR8();
}
function renderTR8() {
  const row = $('#tr8'); if (!row) return; row.innerHTML = ''; const t = UI.sel, b = UI.pats[UI.cur], L = trkLen(b, t), col = stepColor(t);
  row.append(h('div', { class: 'lab', style: 'color:' + col }, (UI.kit[t] ? UI.kit[t].n : '') + (L > 16 ? ` ${UI.page * 16 + 1}-${UI.page * 16 + 16}` : '')));
  for (let i = 0; i < 16; i++) { const s = UI.page * 16 + i, stp = getStep(b, t, s);
    const c = h('div', { class: 'sb8' + (stp.vel ? ' on' : ''), style: '--c:' + col + (s >= L ? ';opacity:.25' : '') }, h('small', {}, String(s + 1)));
    c.onpointerdown = e => { e.preventDefault(); if (s >= L) return; if (e.button === 2) { selectStep(t, s); return; } if (getStep(b, t, s).vel) clearStep(b, t, s); else setStep(b, t, s, { vel: 100 }); pushPat(UI.cur); renderTR8(); paintStep(t, i); };
    c.oncontextmenu = e => e.preventDefault(); row.append(c); }
}

// ------------------------------------------------------------------ knobs
function knob(label, get, set, min, max, fmt = v => v.toFixed(2), def) {
  const el = h('div', { class: 'knob' }), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 46 46');
  const kv = h('div', { class: 'kv' }); el.append(svg, h('div', { class: 'kl' }, tr(label)), kv);
  const draw = () => { const v = get(), u = (v - min) / (max - min), a0 = -225, a = a0 + u * 270, rad = d => d * Math.PI / 180, R = 17, c = 23;
    const pt = d => [c + R * Math.cos(rad(d)), c + R * Math.sin(rad(d))], [x0, y0] = pt(a0), [x1, y1] = pt(a0 + 270), [xa, ya] = pt(a);
    svg.innerHTML = `<path d="M${x0} ${y0} A${R} ${R} 0 1 1 ${x1} ${y1}" fill="none" stroke="#232835" stroke-width="4" stroke-linecap="round"/>` +
      (u > 0.001 ? `<path d="M${x0} ${y0} A${R} ${R} 0 ${u * 270 > 180 ? 1 : 0} 1 ${xa} ${ya}" fill="none" stroke="#46e0ff" stroke-width="4" stroke-linecap="round"/>` : '') +
      `<circle cx="23" cy="23" r="11" fill="#1a1e28" stroke="#2e3546"/><line x1="23" y1="23" x2="${23 + 9 * Math.cos(rad(a))}" y2="${23 + 9 * Math.sin(rad(a))}" stroke="#e8ecf3" stroke-width="2" stroke-linecap="round"/>`;
    kv.textContent = fmt(v); };
  let st = null;
  el.onpointerdown = e => { st = { y: e.clientY, v: get() }; el.setPointerCapture(e.pointerId); };
  el.onpointermove = e => { if (!st) return; const fine = e.shiftKey ? 0.2 : 1; set(clamp(st.v + (st.y - e.clientY) / 160 * (max - min) * fine, min, max)); draw(); };
  el.onpointerup = () => (st = null);
  el.ondblclick = () => { if (def !== undefined) { set(def); draw(); } };
  el.onwheel = e => { e.preventDefault(); set(clamp(get() - Math.sign(e.deltaY) * (max - min) / 50, min, max)); draw(); };
  el.redraw = draw; draw(); return el;
}
function dragNum(el, get, set, min, max) { let st = null; el.onpointerdown = e => { st = { y: e.clientY, v: get() }; el.setPointerCapture(e.pointerId); };
  el.onpointermove = e => { if (!st) return; const v = clamp(Math.round(st.v + (st.y - e.clientY) / 8), min, max); if (v !== get()) set(v); }; el.onpointerup = () => (st = null); }
const tk = (t, k, label, min = 0, max = 1, fmt, def) => { const el = knob(label, () => tp(t, k), v => setTP(t, k, v), min, max, fmt, def); el.dataset.pid = TPID(t, k); return el; };
const gknob = (k, label, min, max, fmt, def) => { const el = knob(label, () => PARAMS[k], v => setP(k, v), min, max, fmt, def); el.dataset.pid = k; return el; };
const pct = v => Math.round(v * 100) + '%';
function chips(list, cur, onPick, cls = '') { const box = h('div', { class: 'chips ' + cls }); list.forEach((n, i) => { const b = h('button', { class: i === cur ? 'on' : '' }, tr(n)); b.onclick = () => onPick(i); box.append(b); }); return box; }

// ------------------------------------------------------------------ side panel
function renderPanel() {
  const tabs = $('#tabs'); tabs.innerHTML = '';
  for (const n of ['SOUND', 'MIX', 'STEP', 'TRACK', 'SONG', 'MASTER']) { const b = h('button', { class: UI.tab === n ? 'on' : '' }, tr(n)); b.onclick = () => { UI.tab = n; renderPanel(); }; tabs.append(b); }
  const P = $('#panel'); P.innerHTML = ''; const t = UI.sel, k = UI.kit[t] || { n: 'T' + (t + 1) };
  const head = h('div', {}, h('div', { class: 'ttl' }, `${t + 1} · ${k.n}`), h('div', { class: 'sub' }, `${ROLES[tp(t, T.ROLE) | 0]} · ${MODES[tp(t, T.MODE) | 0]}${tp(t, T.MODE) ? ' · ' + (soundName(tp(t, T.SMP)) || '') : ' · ' + SYNS[tp(t, T.SYN) | 0]}`));
  P.append(head);
  if (UI.tab === 'SOUND') {
    P.append(chips(MODES, tp(t, T.MODE) | 0, i => { setTP(t, T.MODE, i); if (i && tp(t, T.SMP) < 0) setTP(t, T.SMP, UI.sounds[0].idx); refreshTrack(t); }));
    if ((tp(t, T.MODE) | 0) === 0) { P.append(h('div', { class: 'sec' }, tr('SYNTH MODEL')), chips(SYNS, tp(t, T.SYN) | 0, i => { setTP(t, T.SYN, i); Bridge.post({ t: 'pad', t2: t, vel: 110 }); refreshTrack(t); }));
      P.append(h('div', { class: 'knobs' }, tk(t, T.TUNE, 'TUNE', -24, 24, v => (v > 0 ? '+' : '') + v.toFixed(1), 0), tk(t, T.DECAY, 'DECAY', 0, 1, pct, .5), tk(t, T.TONE, 'TONE', 0, 1, pct, .5), tk(t, T.SNAP, 'SNAP', 0, 1, pct, .5), tk(t, T.ATK, 'ATTACK', 0, 1, pct, 0), tk(t, T.DRIVE, 'DRIVE', 0, 1, pct, 0))); }
    else { const sel = h('select', { class: 'full' }); let grp = null;
      for (const s of UI.sounds) { if (!grp || grp.label !== s.group) { grp = h('optgroup', { label: s.group === 'user' ? tr('YOUR SAMPLES') : s.group.toUpperCase() }); sel.append(grp); } const o = h('option', { value: s.idx }, s.name + (s.bpm ? ` · ${s.bpm} bpm` : '')); if (s.idx === (tp(t, T.SMP) | 0)) o.selected = true; grp.append(o); }
      sel.onchange = () => { setTP(t, T.SMP, +sel.value); const s = UI.sounds.find(x => x.idx === +sel.value); if (s) { UI.kit[t].n = s.name.toUpperCase().slice(0, 12); if (s.bpm && (tp(t, T.MODE) | 0) === 1) setTP(t, T.MODE, 2); } Bridge.post({ t: 'pad', t2: t, vel: 110 }); refreshTrack(t); };
      const prev = h('button', {}, '◀'), next = h('button', {}, '▶');
      const step = d => { const i = UI.sounds.findIndex(x => x.idx === (tp(t, T.SMP) | 0)); const n = UI.sounds[(i + d + UI.sounds.length) % UI.sounds.length]; sel.value = n.idx; sel.onchange(); };
      prev.onclick = () => step(-1); next.onclick = () => step(1);
      P.append(h('div', { style: 'display:flex;gap:4px' }, prev, sel, next));
      const up = h('button', { class: 'full', style: 'margin-top:6px' }, '⤒ ' + tr('LOAD YOUR SAMPLE')); up.onclick = () => Bridge.kind === 'plugin' ? Bridge._call('openSample', []).then(r => r ? userSampleIn(r.name, r.idx, r.bpm, r.bars) : toast('✕')) : $('#smpIn').click(); P.append(up);
      P.append(h('div', { class: 'knobs' }, tk(t, T.TUNE, 'TUNE', -24, 24, v => (v > 0 ? '+' : '') + v.toFixed(1), 0), tk(t, T.DECAY, 'DECAY', 0, 1, pct, 1), tk(t, T.START, 'START POINT', 0, 1, pct, 0), tk(t, T.ATK, 'ATTACK', 0, 1, pct, 0), tk(t, T.DRIVE, 'DRIVE', 0, 1, pct, 0)));
      if (window.Pro) Pro.soundExtras(P, t);
      if ((tp(t, T.MODE) | 0) === 2) P.append(chips(['REPITCH', 'STRETCH TO TEMPO'], tp(t, T.STRETCH) | 0, i => { setTP(t, T.STRETCH, i); renderPanel(); }));
      P.append(chips(['REVERSE'], tp(t, T.REV) > .5 ? 0 : -1, () => { setTP(t, T.REV, tp(t, T.REV) > .5 ? 0 : 1); renderPanel(); }));
    }
    P.append(h('div', { class: 'sec' }, tr('SAMPLER ERA')), chips(ERAS, tp(t, T.ERA) | 0, i => { setTP(t, T.ERA, i); renderPanel(); }));
    P.append(h('div', { class: 'hint' }, LANG === 'es' ? 'La época del sampler cambia la resolución y la frecuencia como las máquinas de los 80 y 90: 12 bits a 26 kHz es granuloso, 8 bits a 28 kHz es sucio, 16 bits PUNCH aprieta.' : 'The sampler era changes bits and rate like the 80s and 90s boxes did: 12-bit 26 kHz is gritty, 8-bit 28 kHz is dirty, 16-bit PUNCH squeezes.'));
    P.append(h('div', { class: 'sec' }, tr('ROLE')), chips(ROLES, tp(t, T.ROLE) | 0, i => { setTP(t, T.ROLE, i); renderGrid(); renderPanel(); }));
  } else if (UI.tab === 'MIX') {
    P.append(h('div', { class: 'knobs' }, tk(t, T.LEVEL, 'LEVEL', 0, 1, pct, .72), tk(t, T.PAN, 'PAN', -1, 1, v => v < -.02 ? 'L' + Math.round(-v * 100) : v > .02 ? 'R' + Math.round(v * 100) : 'C', 0), tk(t, T.SENDR, 'REVERB', 0, 1, pct, 0), tk(t, T.SENDD, 'DELAY', 0, 1, pct, 0),
      tk(t, T.CUT, 'CUTOFF', 0, 1, pct, 1), tk(t, T.RES, 'RESO', 0, 1, pct, .1), tk(t, T.DRIVE, 'DRIVE', 0, 1, pct, 0), tk(t, T.DUCK, 'DUCK', 0, 1, pct, 0), tk(t, T.SWING, 'SWING', -.5, .5, pct, 0)));
    P.append(h('div', { class: 'sec' }, tr('FILTER')), chips(['LOW PASS', 'HIGH PASS', 'BAND PASS'], tp(t, T.FTYPE) | 0, i => { setTP(t, T.FTYPE, i); renderPanel(); }));
    P.append(h('div', { class: 'sec' }, tr('CHOKE')), chips(['—', 'A', 'B', 'C', 'D'], tp(t, T.CHOKE) | 0, i => { setTP(t, T.CHOKE, i); renderPanel(); }));
    if (window.Pro) Pro.mixExtras(P, t);
    P.append(h('div', { class: 'hint' }, LANG === 'es' ? 'DUCK baja este canal cada vez que suena el bombo (sidechain). CORTE MUTUO: los sonidos del mismo grupo se cortan entre sí, como el hi-hat abierto y cerrado.' : 'DUCK dips this channel every time the kick hits (sidechain). CHOKE: sounds in the same group cut each other, like open and closed hats.'));
  } else if (UI.tab === 'STEP') {
    const s = UI.selStep, b = UI.pats[UI.cur];
    if (s < 0 || s >= trkLen(b, t)) { P.append(h('p', { class: 'hint' }, tr('Pick a step (right click or long press) to edit it.'))); }
    else { const st = getStep(b, t, s); const set = o => { setStep(b, t, s, o); pushPat(UI.cur); paintStep(t, s % 16); };
      if (!st.vel) set({ vel: 100 });
      P.append(h('div', { class: 'sub' }, `${tr('STEP')} ${s + 1}`));
      const sk = (label, key, min, max, fmt, def) => knob(label, () => getStep(b, t, s)[key], v => set({ [key]: Math.round(v) }), min, max, fmt || (v => String(Math.round(v))), def);
      P.append(h('div', { class: 'knobs' }, sk('VELOCITY', 'vel', 1, 127, null, 100), sk('CHANCE', 'prob', 0, 100, v => Math.round(v) + '%', 100), sk('MICRO', 'mic', -50, 50, v => (v > 0 ? '+' : '') + Math.round(v) + '%', 0), sk('PITCH', 'pit', -24, 24, v => (v > 0 ? '+' : '') + Math.round(v), 0),
        sk('ROLL', 'rat', 1, 8, v => '×' + Math.round(v), 1), sk('ROLL CHANCE', 'rprob', 0, 100, v => Math.round(v) + '%', 100),
        knob('SLICE', () => { const v = getStep(b, t, s).slice; return v === 255 ? -1 : v; }, v => set({ slice: Math.round(v) < 0 ? 255 : Math.round(v) }), -1, 31, v => Math.round(v) < 0 ? tr('FOLLOW') : String(Math.round(v) + 1), -1)));
      P.append(h('div', { class: 'sec' }, tr('ROLL')), chips(RATMODES, getStep(b, t, s).rmode, i => { set({ rmode: i }); renderPanel(); }));
      P.append(h('div', { class: 'sec' }, tr('CONDITION')), chips(CONDS, getStep(b, t, s).cond, i => { set({ cond: i }); renderPanel(); }));
      P.append(h('div', { class: 'hint' }, LANG === 'es' ? 'CONDICIÓN: 1:4 suena en la primera de cada 4 vueltas; FILL solo con el botón FILL. REDOBLE: repite el golpe dentro del paso (×2 a ×8), con crescendo, tono que sube o que acelera, y puede pasar solo a veces.' : 'CONDITION: 1:4 plays on the first of every 4 loops; FILL only while FILL is on. ROLL repeats the hit inside the step (×2 to ×8): crescendo, rising pitch or accelerating, and it can happen only sometimes.'));
      const del = h('button', { class: 'full', style: 'margin-top:10px' }, tr('CLEAR')); del.onclick = () => { clearStep(b, t, s); pushPat(UI.cur); paintStep(t, s % 16); renderPanel(); }; P.append(del); }
  } else if (UI.tab === 'TRACK') {
    const b = UI.pats[UI.cur];
    P.append(h('div', { class: 'sec' }, tr('LENGTH')), h('div', { class: 'knobs' }, knob('LENGTH', () => trkLen(b, t), v => { setTrkLen(b, t, Math.round(v)); pushPat(UI.cur); renderGrid(); }, 1, 64, v => String(Math.round(v)), 16)));
    P.append(h('div', { class: 'sec' }, tr('SPEED')), chips(SPEEDS, trkSpeed(b, t), i => { setTrkSpeed(b, t, i); pushPat(UI.cur); renderGrid(); renderPanel(); }));
    P.append(h('div', { class: 'sec' }, tr('DIRECTION')), chips(DIRS, trkDir(b, t), i => { setTrkDir(b, t, i); pushPat(UI.cur); renderPanel(); }));
    P.append(h('div', { class: 'sec' }, tr('EUCLID')));
    let eh = 5, es = Math.min(16, trkLen(b, t)), er = 0;
    const euc = () => { const L = es; for (let s = 0; s < 64; s++) clearStep(b, t, s); setTrkLen(b, t, L); for (let s = 0; s < L; s++) if (Math.floor((s + er) * eh / L) !== Math.floor((s + er - 1) * eh / L)) setStep(b, t, s, { vel: 100 }); pushPat(UI.cur); renderGrid(); };
    P.append(h('div', { class: 'knobs' }, knob('HITS', () => eh, v => { eh = Math.round(v); euc(); }, 1, 16, v => String(Math.round(v))), knob('STEPS', () => es, v => { es = Math.round(v); euc(); }, 2, 32, v => String(Math.round(v))), knob('ROTATE', () => er, v => { er = Math.round(v); euc(); }, 0, 16, v => String(Math.round(v)))));
    const ops = h('div', { class: 'chips' });
    [['SHIFT ←', -1], ['SHIFT →', 1]].forEach(([n, d]) => { const x = h('button', {}, tr(n)); x.onclick = () => { const L = trkLen(b, t), copy = Array.from({ length: L }, (_, s) => b.slice(so(t, s), so(t, s) + 8)); for (let s = 0; s < L; s++) b.set(copy[(s - d + L) % L], so(t, s)); pushPat(UI.cur); renderGrid(); }; ops.append(x); });
    const rnd = h('button', {}, tr('RANDOM')); rnd.onclick = () => { const r = RNG(Date.now()); for (let s = 0; s < trkLen(b, t); s++) if (r.chance(.3)) setStep(b, t, s, { vel: 60 + r.int(67), slice: tp(t, T.MODE) === 2 ? r.int(32) : 255 }); else clearStep(b, t, s); pushPat(UI.cur); renderGrid(); };
    const cl = h('button', {}, tr('CLEAR')); cl.onclick = () => { for (let s = 0; s < 64; s++) clearStep(b, t, s); pushPat(UI.cur); renderGrid(); };
    const cp = h('button', {}, tr('COPY')); cp.onclick = () => { UI.clip = b.slice(to(t), to(t) + PAT.TRK); toast(tr('Copied')); };
    const pa = h('button', {}, tr('PASTE')); pa.onclick = () => { if (UI.clip) { b.set(UI.clip, to(t)); pushPat(UI.cur); renderGrid(); toast(tr('Pasted')); } };
    ops.append(rnd, cl, cp, pa); P.append(ops);
    if (window.Pro) Pro.trackExtras(P, t);
    P.append(h('div', { class: 'hint' }, LANG === 'es' ? 'Cada pista tiene su propio largo y velocidad (polirritmo): un hi-hat de 7 pasos sobre un bombo de 16 nunca se repite igual. 1/16T son tresillos.' : 'Every track has its own length and speed (polymeter): a 7-step hat over a 16-step kick never repeats the same way. 1/16T are triplets.'));
  } else if (UI.tab === 'SONG') {
    const b = UI.pats[UI.cur];
    P.append(h('div', { class: 'sec' }, tr('PATTERN')), h('div', { class: 'knobs' }, knob('PATTERN LENGTH', () => b[0], v => { b[0] = Math.round(v); pushPat(UI.cur); renderGrid(); }, 1, 64, v => String(Math.round(v)), 16), knob('PATTERN SWING', () => b[1], v => { b[1] = Math.round(v); pushPat(UI.cur); }, 0, 60, v => Math.round(v) + '%', 0)));
    P.append(h('div', { class: 'sec' }, tr('SONG MODE')), chips(['OFF', 'ON'], UI.songOn ? 1 : 0, i => { UI.songOn = !!i; pushSong(); renderPanel(); renderPats(); }));
    const list = h('div', {});
    UI.song.forEach(([p, r], i) => { const row = h('div', { style: 'display:flex;gap:4px;align-items:center;margin:3px 0' }, h('b', { style: 'width:22px;color:var(--dim)' }, String(i + 1)));
      const ps = h('select', {}); for (let k = 0; k < NPAT; k++) ps.append(h('option', { value: k }, tr('PATTERN') + ' ' + (k + 1))); ps.value = p; ps.onchange = () => { UI.song[i][0] = +ps.value; pushSong(); };
      const rs = h('select', {}); for (let k = 1; k <= 16; k++) rs.append(h('option', { value: k }, '×' + k)); rs.value = r; rs.onchange = () => { UI.song[i][1] = +rs.value; pushSong(); };
      const x = h('button', {}, '✕'); x.onclick = () => { UI.song.splice(i, 1); if (!UI.song.length) UI.song.push([0, 1]); pushSong(); renderPanel(); };
      row.append(ps, rs, x); list.append(row); });
    const add = h('button', { class: 'full' }, '+ ' + tr('ADD')); add.onclick = () => { UI.song.push([UI.cur, 2]); pushSong(); renderPanel(); };
    P.append(list, add);
    P.append(h('div', { class: 'hint', style: 'margin-top:8px' }, LANG === 'es' ? 'ARMAR TEMA escribe 8 patrones (intro, groove, variaciones, break, remates) y la canción completa en el estilo elegido. Shift+clic en un número de patrón copia el actual ahí.' : 'BUILD TRACK writes 8 patterns (intro, groove, variations, break, fills) and the whole song in the chosen style. Shift-click a pattern number copies the current one there.'));
  } else if (UI.tab === 'MASTER') {
    const gk = gknob;
    P.append(h('div', { class: 'knobs' }, gk(G.MASTER, 'VOLUME', 0, 1, pct, .8), gk(G.DRIVE, 'DRIVE', 0, 1, pct, .1), gk(G.COMP, 'COMP', 0, 1, pct, .3), gk(G.SWING, 'SWING', 0, .6, pct, 0),
      gk(G.REVSIZE, 'REV SIZE', 0, 1, pct, .5), gk(G.REVTONE, 'TONE', 0, 1, pct, .6), gk(G.DLYTIME, 'DLY TIME', 0, 7, v => DLYDIVS[Math.round(v)], 3), gk(G.DLYFB, 'DLY FB', 0, .95, pct, .4),
      gk(G.HUMAN, 'HUMAN', 0, 1, pct, 0), gk(G.DUCKTIME, 'DUCK', 0.02, 1, v => Math.round(v * 1000) + 'ms', .35), gk(G.WIDTH, 'WIDTH', 0, 1.5, pct, 1), gk(G.STUTLEN, 'STUTTER', 0, 3, v => ['1/8', '1/16', '1/32', '1/48'][Math.round(v)], 1)));
    const cm = h('button', { class: 'full' }, tr('CLEAR MOTION')); cm.onclick = () => { clearMotion(UI.pats[UI.cur]); pushPat(UI.cur); renderFX(); }; P.append(cm);
  }
}
function soundName(idx) { const s = UI.sounds.find(x => x.idx === (idx | 0)); return s ? s.name : ''; }
function refreshTrack(t) { const row = $$('.row')[t]; if (row) { row.querySelector('em').textContent = ['SYN', 'SMP', 'BRK'][tp(t, T.MODE) | 0]; row.querySelector('i').textContent = UI.kit[t].n; } renderPanel(); }

// ------------------------------------------------------------------ perform: 16 one-button tricks (tap = latch, hold = momentary), recordable
const FXKEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'z', 'x', 'c', 'v', 'b', 'n'];
function renderFX() {
  const g = $('#fxGrid'); g.innerHTML = '';
  const rec = UI.pats[UI.cur]; let recorded = 0; for (let s = 0; s < NS; s++) recorded |= perfAt(rec, s);
  PERF.forEach((n, i) => { const b = h('div', { class: 'fx' + (i === 15 ? ' fill' : '') + ((UI.fx >> i) & 1 ? ' on' : '') + ((recorded >> i) & 1 ? ' rec' : '') }, n, h('small', {}, FXKEYS[i].toUpperCase()));
    b.onpointerdown = e => { e.preventDefault(); fxDown(i); b.setPointerCapture(e.pointerId); }; b.onpointerup = () => fxUp(i); b.onpointercancel = () => fxUp(i); g.append(b); });
}
const fxPress = {};
function fxDown(i) { const was = (UI.fx >> i) & 1; fxPress[i] = { t: performance.now(), was }; setFX(was ? UI.fx & ~(1 << i) : UI.fx | (1 << i)); }
function fxUp(i) { const p = fxPress[i]; if (!p) return; delete fxPress[i]; if (!p.was && performance.now() - p.t > 350) setFX(UI.fx & ~(1 << i)); }
function setFX(m) { UI.fx = m; Bridge.post({ t: 'fx', mask: m }); $$('.fx').forEach((b, i) => b.classList.toggle('on', !!((m >> i) & 1))); }

// ------------------------------------------------------------------ macros under the grid
function renderMacros() {
  const m = $('#macros'); m.innerHTML = '';
  const gk = gknob;
  m.append(gk(G.DRIVE, 'DRIVE', 0, 1, pct, .1), gk(G.COMP, 'COMP', 0, 1, pct, .3), gk(G.HUMAN, 'HUMAN', 0, 1, pct, 0), gk(G.MASTER, 'VOLUME', 0, 1, pct, .8));
}

// ------------------------------------------------------------------ generate, vary, build
function genSeed() { return (Date.now() ^ (Math.random() * 1e9)) >>> 0; }
function doGenerate() {
  const st = STYLES[UI.style], seed = genSeed(), r = RNG(seed);
  applyKit(STYLE_KIT[UI.style] || UI.style);
  setP(G.BPM, Math.round(st.bpm[0] + r() * (st.bpm[1] - st.bpm[0]))); setP(G.SWING, st.swing); setP(G.DRIVE, st.drive * DRIVE_SCALE); setP(G.COMP, st.comp); setP(G.HUMAN, st.human);
  UI.pats[UI.cur] = generate(UI.style, seed, UI.cplx); pushPat(UI.cur); renderRows(); renderPanel(); renderMacros(); toast(tr('Generated') + ': ' + UI.style + ' · ' + Math.round(PARAMS[G.BPM]) + ' BPM');
  if (!UI.playing) togglePlay();
}
function doVary() { UI.pats[UI.cur] = vary(UI.pats[UI.cur], genSeed(), 0.3 + UI.cplx * 0.5); pushPat(UI.cur); renderGrid(); toast(tr('Variation')); }
function doBuild() {
  const st = STYLES[UI.style], seed = genSeed(), r = RNG(seed); applyKit(STYLE_KIT[UI.style] || UI.style);
  setP(G.BPM, Math.round(st.bpm[0] + r() * (st.bpm[1] - st.bpm[0]))); setP(G.SWING, st.swing); setP(G.DRIVE, st.drive * DRIVE_SCALE); setP(G.COMP, st.comp); setP(G.HUMAN, st.human);
  const { pats, song } = buildSong(UI.style, seed, UI.cplx); UI.pats = pats; UI.song = song; UI.songOn = true; UI.cur = 0;
  for (let p = 0; p < NPAT; p++) pushPat(p); pushSong(); Bridge.post({ t: 'select', p: 0, now: true }); renderRows(); renderPanel(); renderMacros(); toast(tr('A whole track in the song') + ' · ' + UI.style);
  if (!UI.playing) togglePlay();
}

// ------------------------------------------------------------------ transport and files
function togglePlay() { UI.playing = !UI.playing; Bridge.post({ t: UI.playing ? 'play' : 'stop' }); $('#play').classList.toggle('on', UI.playing); $('#play').textContent = UI.playing ? '■ STOP' : '▶ PLAY'; }
function toggleRec() { UI.rec = !UI.rec; Bridge.post({ t: 'rec', on: UI.rec }); $('#rec').classList.toggle('on', UI.rec); if (UI.rec) toast(tr('Recording motion: knobs, pads and FX go into the pattern')); }
function download(name, data, type) {
  if (Bridge.kind === 'plugin') { const u8 = typeof data === 'string' ? new TextEncoder().encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data); Bridge._call('saveFile', [name, b64(u8)]); return; } const a = h('a', { href: URL.createObjectURL(new Blob([data], { type })), download: name }); document.body.append(a); a.click(); a.remove(); }
function exportMidi() {
  const list = UI.songOn ? UI.song.map(([p, r]) => ({ bytes: UI.pats[p], rep: r })) : [{ bytes: UI.pats[UI.cur], rep: 4 }];
  download(`PULSAR-${UI.style.replace(/ /g, '-')}-${Math.round(PARAMS[G.BPM])}bpm.mid`, midiFile(list, PARAMS[G.BPM], UI.kit.map(k => k.n)), 'audio/midi'); toast(tr('MIDI saved'));
}
function toggleWav() {
  UI.wavRec = !UI.wavRec; $('#wavBtn').classList.toggle('on', UI.wavRec);
  if (UI.wavRec) { Bridge.record(true, wavDone); toast(tr('Recording audio…')); } else Bridge.record(false, wavDone);
}
function wavDone(Ls, Rs) {
  const n = Ls.reduce((a, b) => a + b.length, 0); if (!n) return; const sr = Bridge.sampleRate, buf = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o, s) => [...s].forEach((c, i) => buf.setUint8(o + i, c.charCodeAt(0))); w(0, 'RIFF'); buf.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 2, true); buf.setUint32(24, sr, true); buf.setUint32(28, sr * 4, true); buf.setUint16(32, 4, true); buf.setUint16(34, 16, true); w(36, 'data'); buf.setUint32(40, n * 4, true);
  let o = 44; for (let k = 0; k < Ls.length; k++) for (let i = 0; i < Ls[k].length; i++) { buf.setInt16(o, clamp(Ls[k][i], -1, 1) * 32767, true); buf.setInt16(o + 2, clamp(Rs[k][i], -1, 1) * 32767, true); o += 4; }
  download(`PULSAR-${Math.round(PARAMS[G.BPM])}bpm.wav`, buf.buffer, 'audio/wav'); toast(tr('WAV saved'));
}
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
function projectJSON() { return JSON.stringify({ app: 'PULSAR', v: 2, params: [...PARAMS], pats: UI.pats.map(b64), song: UI.song, songOn: UI.songOn, kit: UI.kit, style: UI.style, cplx: UI.cplx,
  sampleIds: Array.from({ length: NT }, (_, t) => { const s = UI.sounds.find(x => x.idx === (tp(t, T.SMP) | 0)); return s ? s.id : null; }) }); }
const uiJSON = () => JSON.stringify({ kit: UI.kit, style: UI.style, cplx: UI.cplx });
function loadProject(txt) {
  const j = JSON.parse(txt); if (j.app !== 'PULSAR') throw new Error('not a PULSAR file');
  j.params.forEach((v, i) => { if (i < P_COUNT) PARAMS[i] = v; }); if (j.params.length <= X_BASE) { for (let i = X_BASE; i < P_COUNT; i++) PARAMS[i] = 0; PARAMS[XGID(XG.VELSENS)] = 1; } UI.pats = j.pats.map(unb64); UI.song = j.song; UI.songOn = j.songOn; UI.kit = j.kit; UI.style = j.style || UI.style; UI.cplx = j.cplx ?? .5;
  (j.sampleIds || []).forEach((id, t) => { if (id && UI.soundIdx[id] !== undefined) PARAMS[TPID(t, T.SMP)] = UI.soundIdx[id]; });
  pushAll(); renderAll();
}
function save() { download(`PULSAR-${UI.style.replace(/ /g, '-')}.pulsar`, projectJSON(), 'application/json'); if (Bridge.kind === 'web') LS.set('pulsar.project', projectJSON()); toast(tr('saved')); }
async function addUserSample(file) {
  const ab = await file.arrayBuffer(); const buf = await (Bridge.kind === 'plugin' ? decodeOffline(new Uint8Array(ab)) : Bridge.ctx.decodeAudioData(ab));
  const d = buf.getChannelData(0), sr = buf.sampleRate, secs = d.length / sr;
  let bpm = 0, bars = 0; if (secs > 1.2) { for (const b of [1, 2, 4, 8]) { const x = b * 240 / secs; if (x >= 80 && x <= 180) { bpm = Math.round(x * 10) / 10; bars = b; break; } } }
  const name = file.name.replace(/\.[^.]+$/, '');
  const idx = await Bridge.addSample(Float32Array.from(d), sr, bpm, bars ? bars * 16 : 16, name);
  userSampleIn(name, idx, bpm, bars);
}
function userSampleIn(name, idx, bpm, bars, track) {
  if (track !== undefined) UI.sel = track;
  if (idx < 0) { toast('memory full'); return; }
  UI.sounds.push({ id: 'user/' + name, group: 'user', name, idx, bpm }); UI.soundIdx['user/' + name] = idx;
  const t = UI.sel; setTP(t, T.MODE, bpm ? 2 : 1); setTP(t, T.SMP, idx); setTP(t, T.DECAY, bpm ? .35 : 1); UI.kit[t].n = name.toUpperCase().slice(0, 12); refreshTrack(t); toast(tr('Sample loaded') + (bpm ? ` · ${bpm} BPM, ${bars} bar(s)` : ''));
}

// ------------------------------------------------------------------ telemetry: playheads, meters, recorded moves, the logo pulse
let lastTele = 0;
function onTele(tele, scope) {
  UI.tele = tele; lastTele = performance.now();
  if (!!tele[0] !== UI.playing) { UI.playing = !!tele[0]; $('#play').classList.toggle('on', UI.playing); $('#play').textContent = UI.playing ? '■ STOP' : '▶ PLAY'; }
  if (tele[2] !== UI.cur && UI.playing) { UI.cur = tele[2] | 0; renderGrid(); renderFX(); }
  const bt = String(Math.round(tele[1])); if ($('#bpm').textContent !== bt) $('#bpm').textContent = bt;
  if (UI.rec && tele[6] !== UI.dirty) { UI.dirty = tele[6]; Bridge.getPat(UI.cur).then(r => { UI.pats[UI.cur] = new Uint8Array(r.bytes); renderGrid(); renderFX(); }); }
  const rows = $$('.row');
  for (let t = 0; t < NT; t++) { const row = rows[t]; if (!row) continue; const s = tele[16 + t] | 0;
    row.querySelectorAll('.st.ph').forEach(c => c.classList.remove('ph'));
    if (UI.playing && s >= 0 && Math.floor(s / 16) === UI.page) row.querySelectorAll('.st')[s % 16]?.classList.add('ph');
    row.querySelector('.mt').style.width = Math.min(100, tele[32 + t] * 140) + '%'; }
  if (UI.view === 'LIVE') { const pads = $$('.pad'); for (let t = 0; t < NT; t++) if (pads[t]) pads[t].classList.toggle('hit', tele[32 + t] > 0.08);
    const sb = $$('.sb8'), s = tele[16 + UI.sel] | 0; sb.forEach((c, i) => c.classList.toggle('ph', UI.playing && UI.page * 16 + i === s)); }
  drawScope(scope); pulse = Math.max(pulse * 0.85, Math.min(1, tele[32] * 1.5));
  if ((tele[5] | 0) !== (renderFX.last | 0)) { renderFX.last = tele[5]; $$('.fx').forEach((b, i) => b.classList.toggle('on', !!(((tele[5] | 0) | UI.fx) >> i & 1))); }
}
function drawScope(sc) { const c = $('#scope'), g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.strokeStyle = '#46e0ff'; g.lineWidth = 1.5; g.beginPath();
  for (let i = 0; i < sc.length; i++) { const x = i / sc.length * c.width, y = c.height / 2 - sc[i] * c.height * 0.45; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
let pulse = 0;
function drawPulsar(cv, big) {   // a spinning neutron star: two beams, flashing on the kick
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, t = performance.now() / 1000; g.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2, R = W * .12, a = t * (big ? .6 : 1.4), p = big ? 0.6 + 0.4 * Math.sin(t * 3) : 0.35 + pulse * 0.65;
  for (const s of [1, -1]) { const grd = g.createLinearGradient(cx, cy, cx + Math.cos(a) * s * W * .5, cy + Math.sin(a) * s * H * .5); grd.addColorStop(0, `rgba(70,224,255,${0.55 * p})`); grd.addColorStop(1, 'rgba(70,224,255,0)');
    g.fillStyle = grd; g.beginPath(); g.moveTo(cx, cy); const w = .16; g.lineTo(cx + Math.cos(a - w) * s * W, cy + Math.sin(a - w) * s * H); g.lineTo(cx + Math.cos(a + w) * s * W, cy + Math.sin(a + w) * s * H); g.fill(); }
  if (big) { g.strokeStyle = 'rgba(70,224,255,.18)'; for (let k = 1; k < 6; k++) { g.beginPath(); g.ellipse(cx, cy, R * (1.4 + k * .7), R * (0.5 + k * .25), a * .2, 0, Math.PI * 2); g.stroke(); } }
  const rg = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.8); rg.addColorStop(0, '#fff'); rg.addColorStop(.35, `rgba(150,240,255,${0.7 + p * .3})`); rg.addColorStop(1, 'rgba(70,224,255,0)');
  g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, R * 1.8, 0, Math.PI * 2); g.fill();
}
function frame() { drawPulsar($('#logoC'), false); if ($('#splash')) drawPulsar($('#splashC'), true); requestAnimationFrame(frame); }

// ------------------------------------------------------------------ help
function renderHelp() {
  const en = `<h2>PULSAR</h2><p>A drum machine for broken beats: breakbeats you can chop and stretch, sixteen tracks, and the tricks of big beat, braindance and drill'n'bass on one button each.</p>
<h3>START IN 10 SECONDS</h3><p>Pick a style (top), press <b>⚡ GENERATE</b>. Press it again for another idea, <b>VARY</b> to play it again differently, <b>BUILD TRACK</b> for a whole song (intro, groove, break, fills, drop).</p>
<h3>THE GRID</h3><p>Click a step to turn it on or off. Drag up or down on a step to change its velocity. <b>Right click or long press</b> a step to edit it: chance, micro timing, pitch, slice, roll (×2…×8) and conditions (1:2, 1:4, FILL…). The number at the right of each row is its length: drag it. M = mute, S = solo. Click a track name to hear it and edit its sound.</p>
<h3>BREAKS</h3><p>BREAK tracks play one slice of a breakbeat per step (32 slices = 2 bars). STRETCH TO TEMPO keeps their pitch at any tempo; REPITCH speeds them up like a sampler did (jungle!). LOAD YOUR SAMPLE: any loop is measured and sliced automatically.</p>
<h3>PERFORM</h3><p>Sixteen tricks under the grid. <b>Tap</b> = on until you tap again; <b>hold</b> = only while held. Keys <kbd>1</kbd>…<kbd>0</kbd> <kbd>Z</kbd>…<kbd>N</kbd>. With <b>● REC</b> on, the FX you play, the knobs you turn and the pads you hit are written into the pattern (a red line marks recorded FX). MASTER › CLEAR MOTION erases the moves.</p>
<h3>KEYS</h3><p><kbd>Space</kbd> play/stop · <kbd>R</kbd> record · <kbd>G</kbd> generate · <kbd>V</kbd> vary · <kbd>↑</kbd><kbd>↓</kbd> track · tracks play on a click on their name and on MIDI notes 36–51.</p>
<h3>EXPORT</h3><p><b>⤓ MIDI</b> saves the pattern (or the whole song when SONG is on) as a MIDI file for any DAW, on one channel (1). In the plug-in, <b>⇱ MIDI</b> and <b>⇱ WAV</b> are dragged straight onto a track; drop a .mid on PULSAR and it becomes the pattern. PLAY and STOP are PULSAR's own (like XO): it plays with the DAW stopped, always at the DAW's tempo. <b>● WAV</b> records the audio. SAVE / OPEN keep your project.</p>`;
  const es = `<h2>PULSAR</h2><p>Una caja de ritmos para beats rotos: breakbeats que puedes picar y estirar, dieciséis pistas, y los trucos del big beat, el braindance y el drill'n'bass a un botón cada uno.</p>
<h3>EMPIEZA EN 10 SEGUNDOS</h3><p>Elige un estilo (arriba) y presiona <b>⚡ GENERAR</b>. Otra vez para otra idea, <b>VARIAR</b> para tocarlo distinto, <b>ARMAR TEMA</b> para una canción completa (intro, groove, break, remates, drop).</p>
<h3>LA CUADRÍCULA</h3><p>Clic en un paso lo enciende o apaga. Arrastra arriba o abajo sobre un paso para su velocidad. <b>Clic derecho o mantener</b> un paso para editarlo: probabilidad, micro tiempo, tono, corte, redoble (×2…×8) y condiciones (1:2, 1:4, FILL…). El número a la derecha de cada fila es su largo: arrástralo. M = silencio, S = solo. Clic en el nombre de una pista para oírla y editar su sonido.</p>
<h3>BREAKS</h3><p>Las pistas BREAK tocan un corte de un breakbeat por paso (32 cortes = 2 compases). AJUSTAR AL TEMPO mantiene su tono a cualquier tempo; RE-AFINAR los acelera como lo hacía un sampler (¡jungle!). CARGA TU SAMPLE: cualquier loop se mide y se corta solo.</p>
<h3>TOCAR EN VIVO</h3><p>Dieciséis trucos bajo la cuadrícula. <b>Toque</b> = encendido hasta que lo vuelvas a tocar; <b>mantener</b> = solo mientras lo sostienes. Teclas <kbd>1</kbd>…<kbd>0</kbd> <kbd>Z</kbd>…<kbd>N</kbd>. Con <b>● REC</b> encendido, los efectos, las perillas y los pads que tocas se escriben en el patrón (una línea roja marca los efectos grabados). MASTER › BORRAR MOVIMIENTOS los quita.</p>
<h3>TECLAS</h3><p><kbd>Espacio</kbd> tocar/parar · <kbd>R</kbd> grabar · <kbd>G</kbd> generar · <kbd>V</kbd> variar · las pistas suenan con clic en su nombre y con notas MIDI 36–51.</p>
<h3>EXPORTAR</h3><p><b>⤓ MIDI</b> guarda el patrón (o la canción si SONG está encendido) como archivo MIDI para cualquier DAW, en un solo canal (1). En el plug-in, <b>⇱ MIDI</b> y <b>⇱ WAV</b> se arrastran directo a una pista; suelta un .mid sobre PULSAR y se vuelve el patrón. TOCAR y DETENER son de PULSAR (como XO): suena con el DAW detenido, siempre al tempo del DAW. <b>● WAV</b> graba el audio. GUARDAR / ABRIR conservan tu proyecto.</p>`;
  const man = `<p style="margin-top:14px">📘 <a style="color:var(--beam)" target="_blank" rel="noopener" href="https://github.com/drophlex/PULSAR/raw/main/manual/PULSAR-Manual-${LANG === 'es' ? 'ES' : 'EN'}.pdf">${LANG === 'es' ? 'Manual completo (PDF)' : 'Full manual (PDF)'}</a> · <a style="color:var(--dim)" target="_blank" rel="noopener" href="https://github.com/drophlex/PULSAR">github.com/drophlex/PULSAR</a></p>`;
  $('#helpBox').innerHTML = (LANG === 'es' ? es : en) + man;
}

// ------------------------------------------------------------------ wiring
function renderAll() { renderRows(); setView(UI.view); renderPanel(); renderFX(); renderMacros(); renderPats(); $('#bpm').textContent = Math.round(PARAMS[G.BPM]); $('#style').value = UI.style; $('#cplx').value = Math.round(UI.cplx * 100); applyLang(); }
function openSide() { $('#side').classList.add('open'); }
function wire() {
  const st = $('#style'); for (const n of Object.keys(STYLES)) st.append(h('option', { value: n }, n)); st.value = UI.style;
  st.onchange = () => { UI.style = st.value; toast(UI.style + ' · ' + STYLES[UI.style].desc[LANG === 'es' ? 1 : 0]); };
  $('#cplx').oninput = e => (UI.cplx = e.target.value / 100);
  $('#gen').onclick = doGenerate; $('#vary').onclick = doVary; $('#build').onclick = doBuild;
  $('#vLive').onclick = () => setView('LIVE'); $('#vGrid').onclick = () => setView('GRID');
  $('#play').onclick = togglePlay; $('#rec').onclick = toggleRec;
  dragNum($('#bpm'), () => Math.round(PARAMS[G.BPM]), v => { setP(G.BPM, v); $('#bpm').textContent = v; }, 40, 300);
  let taps = []; $('#tap').onclick = () => { const n = performance.now(); taps = taps.filter(x => n - x < 2000); taps.push(n); if (taps.length > 2) { const d = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); const b = Math.round(60000 / d); setP(G.BPM, b); $('#bpm').textContent = b; } };
  $('#songBtn').onclick = () => { UI.songOn = !UI.songOn; pushSong(); renderPats(); if (UI.tab === 'SONG') renderPanel(); };
  $('#midiBtn').onclick = exportMidi; $('#wavBtn').onclick = toggleWav; $('#saveBtn').onclick = save; $('#loadBtn').onclick = () => Bridge.kind === 'plugin' ? Bridge._call('openFile', ['*.pulsar;*.json']).then(r => { if (r) try { loadProject(r.text); toast(r.name); } catch (er) { toast('✕ ' + er.message); } }) : $('#fileIn').click();
  $('#fileIn').onchange = async e => { const f = e.target.files[0]; if (f) try { loadProject(await f.text()); toast(f.name); } catch (er) { toast('✕ ' + er.message); } e.target.value = ''; };
  $('#smpIn').onchange = async e => { const f = e.target.files[0]; if (f) try { await addUserSample(f); } catch (er) { toast('✕ ' + er.message); } e.target.value = ''; };
  $('#helpBtn').onclick = () => { renderHelp(); $('#help').style.display = 'grid'; }; $('#help').onclick = () => ($('#help').style.display = 'none');
  $('#langBtn').onclick = () => { LANG = LANG === 'es' ? 'en' : 'es'; LS.set('pulsar.lang', LANG); renderAll(); };
  $('#sideBtn').onclick = () => $('#side').classList.toggle('open');
  ['#igLink', '#ytLink'].forEach(s => { $(s).onclick = e => { if (Bridge.kind === 'plugin') { e.preventDefault(); Bridge._call('openUrl', [$(s).href]); } }; });
  $('#donBtn').onclick = e => { e.preventDefault(); const u = $('#donBtn').href; if (Bridge.kind === 'plugin') Bridge._call('openUrl', [u]); else window.open(u, '_blank', 'noopener'); };
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.repeat) return;
    const k = e.key.toLowerCase(), fi = FXKEYS.indexOf(k);
    if (fi >= 0) { fxDown(fi); return; }
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); } else if (k === 'r') toggleRec(); else if (k === 'g') doGenerate(); else if (k === 'v') doVary();
    else if (k === 'arrowup') { UI.sel = (UI.sel + NT - 1) % NT; renderRows(); renderPanel(); } else if (k === 'arrowdown') { UI.sel = (UI.sel + 1) % NT; renderRows(); renderPanel(); }
  });
  document.addEventListener('keyup', e => { const fi = FXKEYS.indexOf(e.key.toLowerCase()); if (fi >= 0) fxUp(fi); });
  if (navigator.requestMIDIAccess) navigator.requestMIDIAccess().then(m => { const bind = () => m.inputs.forEach(i => (i.onmidimessage = ev => { const [s, n, v] = ev.data; if (window.Hyper && Hyper.st.on && (s & 15) === Hyper.st.ch - 1) return; /* the TR-8's own notes: heard by HYPERLINK, never doubled */ if ((s & 0xf0) === 0x90 && v > 0 && n >= 36 && n < 52) Bridge.post({ t: 'pad', t2: n - 36, vel: v }); })); bind(); m.onstatechange = bind; }).catch(() => {});
  if (Bridge.kind === 'web') setInterval(() => LS.set('pulsar.project', projectJSON()), 15000);
  else { let last = ''; setInterval(() => { const u = uiJSON(); if (u !== last) { last = u; Bridge._call('setUi', [u]); } }, 1500); $('#wavBtn').style.display = 'none'; }
  // the plug-in: follow the DAW's transport
  if (Bridge.kind === 'web') setInterval(() => { if (UI.playing && performance.now() - lastTele > 1500 && Bridge.ctx && Bridge.ctx.state !== 'running') Bridge.ctx.resume(); }, 1000);
}

async function boot() {
  applyLang(); requestAnimationFrame(frame);
  $('#splash').onclick = async () => {
    $('#splash .go').textContent = '…';
    await Bridge.start(); Bridge.onTele = onTele;
    await loadSounds();
    let saved = Bridge.kind === 'web' ? LS.get('pulsar.project') : null;
    if (Bridge.kind === 'plugin') {
      const pr = await Bridge._call('getProject', []);
      (pr.user || []).forEach(u => { UI.sounds.push({ id: 'user/' + u.name, group: 'user', name: u.name, idx: u.idx, bpm: u.bpm }); UI.soundIdx['user/' + u.name] = u.idx; });
      if (pr.ui) saved = JSON.stringify(Object.assign({ app: 'PULSAR', v: 1, params: pr.params, pats: pr.pats, song: pr.song.length ? pr.song : [[0, 1]], songOn: pr.songOn }, JSON.parse(pr.ui)));
      UI.fx = pr.fx | 0; UI.playing = !!pr.playing; UI.learn = pr.learn || {};
    }
    wire();
    if (saved) { try { loadProject(saved); } catch (e) { applyKit('BIG BEAT'); UI.pats[0] = generate('BIG BEAT', 7, .45); pushAll(); } }
    else { applyKit('BIG BEAT'); setP(G.BPM, 132); setP(G.DRIVE, 0); setP(G.COMP, .35); UI.pats[0] = generate('BIG BEAT', 7, .45); pushAll(); }
    renderAll(); $('#splash').remove(); if (window.Pro) Pro.boot(); if (window.Lab) Lab.boot(); if (window.Hyper) Hyper.boot(); if (typeof Coach !== 'undefined') Coach.show();
  };
}
boot();
if (window.__JUCE__ && window.__JUCE__.backend) setTimeout(() => $('#splash') && $('#splash').onclick(), 400);
