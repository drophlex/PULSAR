/* lab.js — PULSAR 3 · DFD LIVE LAB: a third view (LAB) beside LIVE and GRID. It has the six families and their 36 starting
   patterns (preview, commit, cancel), nine macros with RECOVER, the DIRTY VOLTAGE module with its meter, RAVE BUILDER,
   DNA MORPH A/B, FUSION MORPH, 16 editable scenes launched on the bar, MIDI file import (SMF 0/1) and controller profiles
   (FM-1, Arturia KeyLab). Loaded after pro.js. Everything here writes the same patterns and parameters as the rest of
   PULSAR, so undo, save, MIDI export, the plug-in's automation and the multi-out all keep working. */
Object.assign(ES, {
  'LAB': 'LAB', 'QUICK START': 'INICIO RÁPIDO', 'FAMILY': 'FAMILIA', 'DENSITY': 'DENSIDAD', 'KIT': 'KIT', 'PATTERNS': 'PATRONES',
  'PREVIEW': 'ESCUCHAR', 'COMMIT': 'CONFIRMAR', 'CANCEL': 'CANCELAR', 'Previewing — COMMIT keeps it, CANCEL brings everything back': 'Escuchando — CONFIRMAR lo deja, CANCELAR regresa todo',
  'Kept': 'Confirmado', 'Back as it was': 'De regreso como estaba', 'MACROS': 'MACROS', 'PUMP': 'BOMBEO', 'GLITCH': 'GLITCH', 'TENSION': 'TENSIÓN', 'DROP': 'DROP',
  'RECOVER': 'RECUPERAR', 'Back to the groove': 'De vuelta al groove', 'DIRTY VOLTAGE': 'VOLTAJE SUCIO', 'AMOUNT': 'CANTIDAD', 'LIMITER': 'LIMITADOR',
  'level': 'nivel', 'limiter': 'limitador', 'loudness match': 'igualación de volumen', 'latency': 'latencia', 'RAVE BUILDER': 'RAVE BUILDER', 'BARS': 'COMPASES',
  'BUILD': 'CONSTRUIR', 'DROP NOW': 'DROP YA', 'Build-up': 'Subida', 'DNA MORPH': 'MORPH DE ADN', 'SOURCE A': 'FUENTE A', 'SOURCE B': 'FUENTE B', 'MORPH': 'MORPH',
  'SEED': 'SEMILLA', 'LOCK KICK': 'FIJAR BOMBO', 'LOCK SNARE': 'FIJAR CAJA', 'FUSION MORPH': 'FUSIÓN', 'RHYTHM A/B': 'RITMO A/B', 'TIMBRE A/B': 'TIMBRE A/B', 'ENERGY': 'ENERGÍA',
  'COMPLEXITY': 'COMPLEJIDAD', 'SCENES': 'ESCENAS', 'double-click a name to rename it': 'doble clic en un nombre para renombrarlo', 'Scene': 'Escena', 'on the next bar': 'en el siguiente compás',
  'IMPORT MIDI': 'IMPORTAR MIDI', 'MIDI imported': 'MIDI importado', 'CONTROLLER': 'CONTROLADOR', 'NONE': 'NINGUNO', 'Profile': 'Perfil', 'pattern': 'patrón', 'into': 'en',
  'morph is a step blend (notes, velocity, chance, rolls, timing), not an audio crossfade': 'el morph mezcla pasos (notas, velocidad, probabilidad, redobles, tiempo), no es un crossfade de audio',
  'MIDI DIN / USB': 'MIDI DIN / USB', 'Rename the scene': 'Renombra la escena', 'empty slot': 'espacio vacío'
});

const Lab = {
  fam: 'DIRTY VOLTAGE', kit: 'DIRTY VOLTAGE', density: .5, preview: null, mac: null, macVal: {}, bars: 4, build: null,
  morph: { a: 0, b: 1, amt: .5, seed: 1, lockK: true, lockS: false }, fusion: { a: 'ROBOT DISCO', b: 'DIRTY VOLTAGE', rhythm: .5, timbre: .5, energy: .6, cplx: .5, seed: 7, lockK: true },
  scenes: null, sceneSlot: 10, pendingScene: null, profile: LS.get('pulsar.ctl') || 'NONE', keylab: LS.get('pulsar.keylab') || 'ESSENTIAL',
};
PARAMS[XGID(6)] = .6; PARAMS[XGID(7)] = 1;   // PULSAR 3 defaults: DIRTY VOLTAGE tone, the safety limiter on (older projects keep what they saved)
const PREVIEW_SLOT = 15, MORPH_SLOT = 14, BUILD_SLOT = 13;
const XGL = { DV: 5, DVTONE: 6, LIMIT: 7 };
// the 16 scenes: names from the Polaris community (editable), each a family pattern, a tempo and an energy
const SCENE_DEFAULT = [
  ['DFD CORE', 'DIRTY VOLTAGE', 0, .6], ['POLARIS LAB', 'FRACTAL RHYTHM', 2, .45], ['CHEMBECH', 'CHEMICAL PRESSURE', 1, .7], ['PETER PALM', 'ROBOT DISCO', 0, .55],
  ['DEEP ARCHIE', 'FRACTAL RHYTHM', 0, .35], ['QUESA DJ', 'ROBOT DISCO', 2, .65], ['TERE', 'CHEMICAL PRESSURE', 0, .5], ['GAMBU GALU', 'HYPERBREAK', 1, .7],
  ['KARL COTBRUM', 'RIOT MACHINE', 2, .75], ['MANU', 'HYPERBREAK', 0, .55], ['MENI', 'ROBOT DISCO', 3, .6], ['RUFI', 'RIOT MACHINE', 0, .6],
  ['BARRY SOUND', 'CHEMICAL PRESSURE', 3, .8], ['ALEX 413X', 'DIRTY VOLTAGE', 3, .85], ['OSCAR', 'HYPERBREAK', 4, .9], ['RADIO POLARIS', 'DIRTY VOLTAGE', 1, .5]];
function loadScenes() { try { const s = JSON.parse(LS.get('pulsar.scenes') || 'null'); if (Array.isArray(s) && s.length === 16) return s; } catch (e) {} return SCENE_DEFAULT.map(x => ({ name: x[0], fam: x[1], pat: x[2], energy: x[3] })); }
function saveScenes() { LS.set('pulsar.scenes', JSON.stringify(Lab.scenes)); }

// ------------------------------------------------------------------ applying a family: kit, tempo, feel, DIRTY VOLTAGE and the pump
function applyFamily(fam, kit, bpm) {
  const st = STYLES[fam];
  applyKit(kit || fam);
  setP(G.BPM, bpm); setP(G.SWING, st.swing); setP(G.DRIVE, st.drive); setP(G.COMP, st.comp); setP(G.HUMAN, st.human);
  setP(XGID(XGL.DV), st.dv || 0); setP(XGID(XGL.LIMIT), 1);
  if (st.duck) for (const t of [3, 4, 5, 6, 10, 13, 15]) setTP(t, T.DUCK, st.duck);
  UI.style = fam; if ($('#style')) $('#style').value = fam;
}
function pushAndPlay(slots) { slots.forEach(p => pushPat(p)); Bridge.params([...PARAMS].map((v, i) => [i, v])); renderRows(); renderPanel(); renderMacros(); if (!UI.playing) togglePlay(); }

// preview: the change is made (so you hear it at once) and a snapshot is kept; COMMIT forgets the snapshot, CANCEL restores it
function startPreview(label) { if (!Lab.preview) Lab.preview = { snap: Undo.snap(), cur: UI.cur, label }; else Lab.preview.label = label; Lab.render(); toast(label + ' · ' + tr('Previewing — COMMIT keeps it, CANCEL brings everything back')); }
function commitPreview() { if (!Lab.preview) return; Undo.stack.push(Lab.preview.snap); Undo.last = Undo.snap(); Undo.paint(); Lab.preview = null; Lab.render(); toast(tr('Kept')); }
function cancelPreview() { if (!Lab.preview) return; const p = Lab.preview; Lab.preview = null; Undo.apply(p.snap); UI.cur = p.cur; Bridge.post({ t: 'select', p: UI.cur, bar: true }); renderPats(); Lab.render(); toast(tr('Back as it was')); }

function loadFamilyPattern(fam, i) {
  startPreview(fam + ' · ' + FAM_PATTERNS[fam][i][0]);
  const { A, B, F } = famPatternSet(fam, i), c = UI.cur;
  applyFamily(fam, Lab.kit && (Lab.kit === fam || HYBRID_KITS.includes(Lab.kit)) ? Lab.kit : fam, famPatternBPM(fam, i));
  UI.pats[c] = A; UI.pats[(c + 1) % NPAT] = B; UI.pats[(c + 2) % NPAT] = F;
  pushAndPlay([c, (c + 1) % NPAT, (c + 2) % NPAT]);
}
function quickGenerate() {
  const fam = Lab.fam, st = STYLES[fam], seed = genSeed(), r = RNG(seed);
  startPreview(tr('GENERATE') + ' · ' + tr(fam));
  applyFamily(fam, Lab.kit, Math.round(PARAMS[G.BPM] && Lab.keepBpm ? PARAMS[G.BPM] : st.bpm[0] + r() * (st.bpm[1] - st.bpm[0])));
  UI.cplx = Lab.density; UI.pats[UI.cur] = generate(fam, seed, Lab.density); pushAndPlay([UI.cur]);
}

// ------------------------------------------------------------------ the macros: musical results on top of a snapshot; RECOVER returns to it
const MACROS = [['DRIVE', 0], ['PUMP', 0], ['GLITCH', 0], ['FILTER', .5], ['TENSION', 0], ['DENSITY', 1], ['HUMAN', 0]];
function macroBase() {
  if (Lab.mac) return Lab.mac;
  const b = UI.pats[UI.cur]; Lab.mac = { params: PARAMS.slice(), fx: UI.fx, mutes: [...Array(NT)].map((_, t) => trkMute(b, t)), pat: UI.cur };
  Lab.macVal.HUMAN = PARAMS[G.HUMAN] / .6; return Lab.mac;
}
function macroFX() { const v = Lab.macVal; let m = 0;
  if ((v.GLITCH || 0) > .3) m |= 1 << 3; if ((v.GLITCH || 0) > .65) m |= 1 << 0; if ((v.GLITCH || 0) > .9) m |= 1 << 6;
  if ((v.TENSION || 0) > .5) m |= 1 << 8; if (Lab.dropHeld) m |= 1 << 14; return m; }
function setMacro(name, v) {
  const base = macroBase(), P0 = base.params; Lab.macVal[name] = v;
  switch (name) {
    case 'DRIVE': setP(G.DRIVE, P0[G.DRIVE] + (1 - P0[G.DRIVE]) * v * .7); setP(XGID(XGL.DV), Math.max(P0[XGID(XGL.DV)], v * .85)); setP(XGID(XGL.LIMIT), 1); break;
    case 'PUMP': for (let t = 1; t < NT; t++) if (tp(t, T.ROLE) !== 0 || t === 10) setTP(t, T.DUCK, P0[TPID(t, T.DUCK)] + (.85 - P0[TPID(t, T.DUCK)]) * v); setP(G.DUCKTIME, .25 + .35 * v); break;
    case 'FILTER': { const on = Math.abs(v - .5) > .03; setP(XGID(XG.XYON), on ? 1 : P0[XGID(XG.XYON)]); setP(XGID(XG.XYX), on ? (v - .5) * 2 : P0[XGID(XG.XYX)]); break; }
    case 'TENSION': setP(XGID(XG.XYON), 1); setP(XGID(XG.XYY), v * .6); break;
    case 'HUMAN': setP(G.HUMAN, v * .6); break;
    case 'DENSITY': { const b = UI.pats[base.pat], hits = [...Array(NT)].map((_, t) => { let n = 0; for (let s = 0; s < trkLen(b, t); s++) if (getStep(b, t, s).vel) n++; return [t, n]; });
      const order = hits.filter(([t, n]) => n && t > 1).sort((x, y) => x[1] - y[1]).map(x => x[0]);   // the sparsest parts go first; kick and snare stay
      const cut = Math.round((1 - v) * order.length); order.forEach((t, i) => setTrkMute(b, t, i < cut ? 1 : base.mutes[t])); pushPat(base.pat); renderRows(); break; }
  }
  setFX((base.fx & ~((1 << 3) | (1 << 0) | (1 << 6) | (1 << 8) | (1 << 14))) | macroFX());
  if (name === 'GLITCH' || name === 'TENSION') {}
}
function recover() {
  const base = Lab.mac; Lab.dropHeld = false; if (!base) { Lab.macVal = {}; Lab.render(); return; }
  const keep = [XGID(XG.XYON), XGID(XG.XYX), XGID(XG.XYY), G.DRIVE, G.HUMAN, G.DUCKTIME, XGID(XGL.DV), XGID(XGL.LIMIT)];
  keep.forEach(id => setP(id, base.params[id])); for (let t = 0; t < NT; t++) setTP(t, T.DUCK, base.params[TPID(t, T.DUCK)]);
  const b = UI.pats[base.pat]; base.mutes.forEach((m, t) => setTrkMute(b, t, m)); pushPat(base.pat);
  setFX(base.fx); Lab.mac = null; Lab.macVal = {}; renderRows(); renderMacros(); Lab.render(); toast('↺ ' + tr('Back to the groove'));
}

// ------------------------------------------------------------------ RAVE BUILDER: a build-up of 1-16 bars, then the drop back into the groove on the bar
function raveBuild(bars) {
  startPreview(tr('RAVE BUILDER') + ' · ' + bars + ' ' + tr('BARS'));
  const src = UI.pats[UI.cur], b = src.slice(), L = Math.min(bars, 4) * 16, rep = bars > 4 ? bars / 4 : 1, back = UI.cur;
  b[0] = L; for (let t = 0; t < NT; t++) setTrkLen(b, t, Math.min(64, Math.max(trkLen(src, t), 16)));
  // copy the groove across the bars, then: snare from quarters to 8ths to 16ths to rolls, hats rising, the sub and kick out in the last bar
  for (let t = 0; t < NT; t++) { const l0 = trkLen(src, t); for (let s = l0; s < L; s++) { const x = getStep(src, t, s % l0); clearStep(b, t, s); if (x.vel) setStep(b, t, s, x); } }
  for (let t = 0; t < NT; t++) setTrkLen(b, t, L);
  const snare = 1, hat = 3;
  for (let s = 0; s < L; s++) { const ph = s / L, last = s >= L - 16;
    const every = ph < .25 ? 4 : ph < .5 ? 2 : 1;
    clearStep(b, snare, s); if (s % every === 0) setStep(b, snare, s, { vel: Math.round(60 + 60 * ph), rat: ph > .85 ? 4 : ph > .7 ? 2 : 1, rmode: 1 });
    if (getStep(b, hat, s).vel || s % 2 === 0) setStep(b, hat, s, { vel: Math.round(40 + 80 * ph) });
    if (last) { clearStep(b, 0, s); clearStep(b, 10, s); }
    // the performance lane: RISE in the second half, FILTER (low-pass) in the last beat before the drop
    const o = PAT.PERF + s * 2; let m = b[o] | (b[o + 1] << 8); if (ph >= .5) m |= 1 << 8; if (s >= L - 4) m |= 1 << 7; b[o] = m & 255; b[o + 1] = m >> 8; }
  if (getStep(b, 14, 0) !== undefined) { clearStep(b, 14, Math.max(0, L - 16)); setStep(b, 14, Math.max(0, L - 16), { vel: 100 }); }
  UI.pats[BUILD_SLOT] = b; pushPat(BUILD_SLOT);
  Lab.build = { back, rep, seen: 0, cur: -1 };
  Bridge.post({ t: 'select', p: BUILD_SLOT, bar: true }); if (!UI.playing) togglePlay();
  toast(tr('Build-up') + ' · ' + bars + ' ' + tr('BARS') + ' → ' + tr('DROP'));
}
function dropNow() { const back = Lab.build ? Lab.build.back : UI.cur; Lab.build = null; Bridge.post({ t: 'select', p: back, bar: true }); UI.cur = back; renderPats(); }

// ------------------------------------------------------------------ DNA MORPH A/B: a step blend, reproducible with the seed; A and B are never changed
function morphPatterns(A, B, amt, seed, lockK, lockS) {
  const r = RNG(seed), out = A.slice();
  for (let t = 0; t < NT; t++) { if ((lockK && t === 0) || (lockS && t === 1)) continue;
    const L = Math.max(trkLen(A, t), trkLen(B, t)); setTrkLen(out, t, r() < amt ? trkLen(B, t) : trkLen(A, t));
    for (let s = 0; s < L; s++) { const a = getStep(A, t, s), b = getStep(B, t, s), take = r() < amt;
      if (!a.vel && !b.vel) { clearStep(out, t, s); continue; }
      const src = take ? b : a, oth = take ? a : b;
      if (!src.vel) { clearStep(out, t, s); continue; }
      const mix = (x, y) => Math.round(x + (y - x) * amt);
      setStep(out, t, s, { vel: oth.vel ? mix(a.vel || 0, b.vel || 0) : src.vel, prob: oth.vel ? mix(a.prob, b.prob) : src.prob, rat: src.rat, rmode: src.rmode, rprob: src.rprob,
        mic: oth.vel ? mix(a.mic, b.mic) : src.mic, pit: src.pit, cond: src.cond, slice: src.slice }); } }
  return out;
}
function doMorph() { const m = Lab.morph; startPreview(tr('DNA MORPH') + ' ' + (m.a + 1) + '·' + (m.b + 1) + ' ' + Math.round(m.amt * 100) + '%');
  UI.pats[MORPH_SLOT] = morphPatterns(UI.pats[m.a], UI.pats[m.b], m.amt, m.seed, m.lockK, m.lockS); pushPat(MORPH_SLOT); UI.cur = MORPH_SLOT; Bridge.post({ t: 'select', p: MORPH_SLOT, bar: true }); renderPats(); if (!UI.playing) togglePlay(); }
// FUSION MORPH: the rhythm of two families blended track by track, the timbre (kit) taken track by track from one or the other
function doFusion() { const f = Lab.fusion; startPreview(tr('FUSION MORPH') + ' · ' + tr(f.a) + ' × ' + tr(f.b));
  const A = generate(f.a, f.seed, f.cplx), B = generate(f.b, f.seed + 11, f.cplx), out = morphPatterns(A, B, f.rhythm, f.seed, f.lockK, false);
  for (let t = 0; t < NT; t++) for (let s = 0; s < NS; s++) { const x = getStep(out, t, s); if (x.vel) setStep(out, t, s, { vel: Math.max(1, Math.min(127, Math.round(x.vel * (.6 + .6 * f.energy)))) }); }
  const r = RNG(f.seed * 31 + 1), kit = KITS[f.a].map((x, t) => (t === 0 && f.lockK) ? x : (r() < f.timbre ? KITS[f.b][t] : x));
  kit.forEach((s, t) => applySound(t, s));
  const sa = STYLES[f.a], sb = STYLES[f.b], mixv = (x, y) => x + (y - x) * f.rhythm;
  setP(G.BPM, Math.round(mixv((sa.bpm[0] + sa.bpm[1]) / 2, (sb.bpm[0] + sb.bpm[1]) / 2))); setP(G.SWING, mixv(sa.swing, sb.swing));
  setP(G.DRIVE, mixv(sa.drive, sb.drive) * (.6 + .6 * f.energy)); setP(XGID(XGL.DV), mixv(sa.dv, sb.dv) * (.5 + f.energy)); setP(XGID(XGL.LIMIT), 1);
  UI.pats[UI.cur] = out; pushAndPlay([UI.cur]); }

// ------------------------------------------------------------------ scenes: the pattern goes to a free slot, the switch happens on the bar, the kit with it
function launchScene(i) {
  const sc = Lab.scenes[i], fam = FAMILIES.includes(sc.fam) ? sc.fam : 'DIRTY VOLTAGE', k = Math.max(0, Math.min(5, sc.pat | 0));
  const slot = Lab.sceneSlot = Lab.sceneSlot === 10 ? 11 : 10;
  const set = famPatternSet(fam, k); const A = sc.energy > .75 ? vary(set.A, k + 99, (sc.energy - .75) * 2) : set.A;
  for (let t = 0; t < NT; t++) for (let s = 0; s < NS; s++) { const x = getStep(A, t, s); if (x.vel) setStep(A, t, s, { vel: Math.max(1, Math.min(127, Math.round(x.vel * (.7 + .45 * sc.energy)))) }); }
  UI.pats[slot] = A; pushPat(slot);
  if (!UI.playing) { applyFamily(fam, fam, famPatternBPM(fam, k)); UI.cur = slot; Bridge.post({ t: 'select', p: slot, now: true }); pushAndPlay([slot]); }
  else { Lab.pendingScene = { slot, fam, bpm: famPatternBPM(fam, k) }; Bridge.post({ t: 'select', p: slot, bar: true }); }
  Lab.lastScene = i; Lab.render(); toast(tr('Scene') + ' · ' + sc.name + (UI.playing ? ' · ' + tr('on the next bar') : ''));
}

// ------------------------------------------------------------------ MIDI file import: SMF 0 / 1, running status, meta and SysEx skipped, any PPQ
function parseSMF(bytes) {
  const d = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); let p = 0;
  const u32 = () => (d[p++] << 24 | d[p++] << 16 | d[p++] << 8 | d[p++]) >>> 0, u16 = () => (d[p++] << 8 | d[p++]);
  const vlq = () => { let v = 0, b, n = 0; do { if (p >= d.length || ++n > 4) throw new Error('bad variable length'); b = d[p++]; v = (v << 7) | (b & 127); } while (b & 128); return v; };
  if (d.length < 14 || String.fromCharCode(...d.slice(0, 4)) !== 'MThd') throw new Error('not a MIDI file (no MThd)');
  p = 4; const hl = u32(), fmt = u16(), ntr = u16(), div = u16(); p = 8 + hl;
  if (fmt > 1) throw new Error('MIDI format ' + fmt + ' is not supported (0 and 1 are)');
  if (div & 0x8000) throw new Error('SMPTE time is not supported (PPQ files are)');
  const ppq = div || 96, notes = []; let tempo = 0;
  for (let k = 0; k < ntr && p + 8 <= d.length; k++) {
    if (String.fromCharCode(...d.slice(p, p + 4)) !== 'MTrk') { p += 8 + ((d[p + 4] << 24 | d[p + 5] << 16 | d[p + 6] << 8 | d[p + 7]) >>> 0); continue; }
    p += 4; const len = u32(), end = Math.min(d.length, p + len); let tick = 0, run = 0;
    while (p < end) { tick += vlq(); let st = d[p];
      if (st === 0xff) { p++; const type = d[p++], l = vlq(); if (type === 0x51 && l === 3 && !tempo) tempo = 60000000 / (d[p] << 16 | d[p + 1] << 8 | d[p + 2]); if (type === 0x2f) { p += l; break; } p += l; continue; }
      if (st === 0xf0 || st === 0xf7) { p++; const l = vlq(); p += l; continue; }   /* (not p += vlq(): p would be read before vlq moves it) */
      if (st & 0x80) { run = st; p++; } else if (!run) throw new Error('data byte without status'); else st = run;
      const hi = st & 0xf0, a = d[p++], b = (hi === 0xc0 || hi === 0xd0) ? 0 : d[p++];
      if (hi === 0x90 && b > 0) notes.push({ tick, note: a, vel: b, ch: st & 15 }); }
    p = end; }
  return { format: fmt, tracks: ntr, ppq, bpm: tempo ? Math.round(tempo * 10) / 10 : 0, notes };
}
// the drum notes (General MIDI, notes 35-81; 36-51 also as PULSAR's own pads) onto the 16 tracks, quantized to 1/16, up to 64 steps
const GM_TRACK = { 35: 0, 36: 0, 37: 7, 38: 1, 40: 1, 39: 2, 42: 3, 44: 3, 46: 4, 41: 8, 43: 8, 45: 8, 47: 8, 48: 8, 50: 8, 49: 9, 57: 9, 51: 9, 59: 9, 53: 9, 55: 9, 52: 9,
  54: 13, 69: 13, 70: 13, 56: 7, 60: 7, 61: 7, 62: 7, 63: 7, 64: 7, 75: 12, 76: 12, 77: 12, 31: 12, 81: 4 };
function midiToPattern(smf, mode = 'gm') {
  const b = patNew(), perStep = smf.ppq / 4; let maxStep = 0, used = 0, skipped = 0;
  for (let t = 0; t < NT; t++) for (let s = 0; s < NS; s++) clearStep(b, t, s);
  for (const n of smf.notes) { const t = mode === 'pads' && n.note >= 36 && n.note <= 51 ? n.note - 36 : GM_TRACK[n.note];
    if (t === undefined) { skipped++; continue; }
    const exact = n.tick / perStep, s = Math.round(exact); if (s >= NS) { skipped++; continue; }
    const mic = Math.max(-50, Math.min(50, Math.round((exact - s) * 100)));
    const old = getStep(b, t, s); if (old.vel && old.vel >= n.vel) continue;       // two notes on one step: the louder one
    setStep(b, t, s, { vel: n.vel, mic }); used++; maxStep = Math.max(maxStep, s); }
  const L = Math.min(64, Math.max(16, Math.ceil((maxStep + 1) / 16) * 16)); b[0] = L; for (let t = 0; t < NT; t++) setTrkLen(b, t, L);
  return { bytes: b, used, skipped, steps: L };
}
function importMidiFile(file) {
  file.arrayBuffer().then(buf => { let smf; try { smf = parseSMF(new Uint8Array(buf)); } catch (e) { toast('✕ MIDI: ' + e.message); return; }
    const mode = smf.notes.some(n => n.ch === 9) || smf.notes.some(n => n.note < 36 || n.note > 51) ? 'gm' : 'pads';
    const r = midiToPattern(smf, mode); if (!r.used) { toast('✕ MIDI: no drum notes (GM 35-81 or 36-51)'); return; }
    startPreview(tr('IMPORT MIDI') + ' · ' + file.name);
    UI.pats[UI.cur] = r.bytes; if (smf.bpm) setP(G.BPM, smf.bpm); pushAndPlay([UI.cur]);
    toast(`${tr('MIDI imported')}: ${r.used} notes, ${r.steps} steps${r.skipped ? `, ${r.skipped} skipped` : ''}${smf.bpm ? ', ' + smf.bpm + ' BPM' : ''}`); });
}

// ------------------------------------------------------------------ controller profiles (written into MIDI learn: you can still change any mapping)
const PROFILES = {
  'FM-1': { info: ['M-VAVE FM-1 over USB, channel 16: notes 36-51 = the 16 pads; CC 20-23 = cutoff, decay, drive, delay send of the selected track (CC 24 picks the track in the web version).', 'M-VAVE FM-1 por USB, canal 16: notas 36-51 = los 16 pads; CC 20-23 = corte, caída, saturación y envío de delay de la pista elegida (CC 24 elige la pista en la versión web).'],
    map: () => { const t = UI.sel + 1; return { 20: `t${t}cut`, 21: `t${t}dec`, 22: `t${t}drv`, 23: `t${t}dly` }; } },
  'KEYLAB': { info: ['Arturia KeyLab (Essential, MkII or Mk3 — choose yours): set its 8 encoders to CC 21-28 and its 8 faders to CC 41-48 in Arturia MIDI Control Center. Encoders: drive, comp, swing, human, filter, space, reverb, delay; faders: levels of tracks 1-8. Pads play notes 36-51.', 'Arturia KeyLab (Essential, MkII o Mk3 — elige el tuyo): pon sus 8 encoders en CC 21-28 y sus 8 faders en CC 41-48 con Arturia MIDI Control Center. Encoders: saturación, compresión, swing, humano, filtro, espacio, reverb, delay; faders: niveles de las pistas 1-8. Los pads tocan las notas 36-51.'],
    map: () => { const m = { 21: 'drive', 22: 'comp', 23: 'swing', 24: 'human', 25: 'xyx', 26: 'xyy', 27: 'revsize', 28: 'dlyfb' }; for (let i = 0; i < 8; i++) m[41 + i] = `t${i + 1}lvl`; return m; } },
};
function applyProfile(name) {
  Lab.profile = name; LS.set('pulsar.ctl', name);
  const old = Lab.profileMap || {}; for (const cc of Object.keys(old)) { if (Bridge.kind === 'plugin') Bridge.post({ t: 'learn', key: 'forget:' + old[cc] }); else if (Learn.web[cc] === old[cc]) delete Learn.web[cc]; }
  const map = PROFILES[name] ? PROFILES[name].map() : {}; Lab.profileMap = map;
  for (const [cc, key] of Object.entries(map)) { if (Bridge.kind === 'plugin') { Bridge.post({ t: 'learnSet', key, cc: +cc }); UI.learn = UI.learn || {}; UI.learn[key] = +cc; } else Learn.web[cc] = key; }
  if (Bridge.kind !== 'plugin') LS.set('pulsar.learn', JSON.stringify(Learn.web));
  Lab.render(); if (name !== 'NONE') toast(tr('Profile') + ': ' + name);
}

// ------------------------------------------------------------------ the LAB view
Lab.render = function () {
  const v = $('#labV'); if (!v || UI.view !== 'LAB') return; v.innerHTML = '';
  const sec = (title, cls, ...kids) => h('section', { class: 'lsec ' + (cls || '') }, h('h3', {}, tr(title)), ...kids);
  const btn = (label, on, fn, cls = '') => { const b = h('button', { class: (on ? 'on ' : '') + cls }, label); b.onclick = fn; return b; };
  const slider = (label, get, set, fmt = pct) => { const k = knob(label, get, x => { set(x); }, 0, 1, fmt); return k; };
  // preview bar
  if (Lab.preview) v.append(h('div', { class: 'lprev' }, h('span', {}, '◉ ' + Lab.preview.label), btn('✓ ' + tr('COMMIT'), true, commitPreview, 'ok'), btn('✕ ' + tr('CANCEL'), false, cancelPreview)));
  // quick start
  const fams = h('div', { class: 'lfams' }); FAMILIES.forEach(f => { const b = btn(tr(f), Lab.fam === f, () => { Lab.fam = f; Lab.kit = f; Lab.render(); }); b.style.setProperty('--fc', FAM_COLOR[f]); fams.append(b); });
  const kits = h('select', { class: 'lkit' }); [...FAMILIES, ...HYBRID_KITS].forEach(k => kits.append(h('option', { value: k }, tr(k)))); kits.value = Lab.kit; kits.onchange = () => { Lab.kit = kits.value; };
  const dens = slider('DENSITY', () => Lab.density, x => (Lab.density = x));
  const genL = () => '⚡ ' + tr('GENERATE').replace('⚡ ', ''); const gen = btn(genL(), false, quickGenerate, 'big');
  v.append(sec('QUICK START', 'qs', fams, h('div', { class: 'lrow' }, h('label', {}, tr('KIT')), kits, dens, gen), h('p', { class: 'ldesc' }, STYLES[Lab.fam].desc[LANG === 'es' ? 1 : 0])));
  // the bank: 6 x 6
  const bank = h('div', { class: 'lbank' });
  FAMILIES.forEach(f => { const col = h('div', { class: 'lcol', style: '--fc:' + FAM_COLOR[f] }, h('b', {}, tr(f)));
    FAM_PATTERNS[f].forEach((p, i) => { const b = btn('', false, () => loadFamilyPattern(f, i), 'lpat'); b.append(h('span', {}, p[0]), h('small', {}, tr(FAM_LEVELS[i]) + ' · ' + famPatternBPM(f, i))); col.append(b); });
    bank.append(col); });
  v.append(sec('PATTERNS', 'bank', bank, h('p', { class: 'ldesc' }, LANG === 'es' ? 'Cada uno carga A (patrón), B (variación) y un FILL en los tres espacios a partir del actual, con su kit y tempo. CANCELAR lo regresa todo.' : 'Each loads A (the pattern), B (a variation) and a FILL into three slots from the current one, with its kit and tempo. CANCEL brings everything back.')));
  // macros
  const mac = h('div', { class: 'lmacs' });
  MACROS.forEach(([n, d]) => { const k = knob(n, () => Lab.macVal[n] ?? d, x => setMacro(n, x), 0, 1, pct, d); mac.append(k); });
  const drop = h('button', { class: 'lhold' + (Lab.dropHeld ? ' on' : '') }, tr('DROP'));
  drop.onpointerdown = e => { e.preventDefault(); macroBase(); Lab.dropHeld = true; setMacro('GLITCH', Lab.macVal.GLITCH || 0); drop.classList.add('on'); };
  drop.onpointerup = drop.onpointerleave = () => { if (!Lab.dropHeld) return; Lab.dropHeld = false; setMacro('GLITCH', Lab.macVal.GLITCH || 0); drop.classList.remove('on'); };
  mac.append(drop, btn('↺ ' + tr('RECOVER'), !!Lab.mac, recover, 'rec'));
  v.append(sec('MACROS', 'macs', mac));
  // DIRTY VOLTAGE
  const dv = h('div', { class: 'lrow' }, gknob(XGID(XGL.DV), 'AMOUNT', 0, 1, pct, 0), gknob(XGID(XGL.DVTONE), 'TONE', 0, 1, pct, .6),
    btn(tr('LIMITER') + ' -1 dB', PARAMS[XGID(XGL.LIMIT)] > .5, () => { setP(XGID(XGL.LIMIT), PARAMS[XGID(XGL.LIMIT)] > .5 ? 0 : 1); Lab.render(); }),
    h('div', { class: 'lmeter', id: 'labMeter' }));
  v.append(sec('DIRTY VOLTAGE', 'dv', dv, h('p', { class: 'ldesc' }, LANG === 'es' ? 'Pasa-altos de seguridad 30 Hz → graves bajo 140 Hz en mono → dos etapas de saturación a doble frecuencia de muestreo → tono → igualación de volumen (más saturación no es simplemente más fuerte) → limitador −1 dBFS. Latencia: 0 muestras.' : 'Safety high-pass 30 Hz → lows below 140 Hz in mono → two saturation stages at twice the sample rate → tone → loudness match (more drive is not simply louder) → −1 dBFS limiter. Latency: 0 samples.')));
  // RAVE BUILDER
  const bars = h('div', { class: 'chips' }); [1, 2, 4, 8, 16].forEach(n => bars.append(btn(String(n), Lab.bars === n, () => { Lab.bars = n; Lab.render(); })));
  v.append(sec('RAVE BUILDER', 'rave', h('div', { class: 'lrow' }, h('label', {}, tr('BARS')), bars, btn('▲ ' + tr('BUILD'), false, () => raveBuild(Lab.bars), 'big'), btn('▼ ' + tr('DROP NOW'), !!Lab.build, dropNow, 'big hot'))));
  // morphs
  const m = Lab.morph, pats = (get, set) => { const s = h('select', {}); for (let i = 0; i < NPAT; i++) s.append(h('option', { value: i }, String.fromCharCode(65 + i))); s.value = get(); s.onchange = () => set(+s.value); return s; };
  v.append(sec('DNA MORPH', 'morph', h('div', { class: 'lrow' }, h('label', {}, tr('SOURCE A')), pats(() => m.a, x => (m.a = x)), h('label', {}, tr('SOURCE B')), pats(() => m.b, x => (m.b = x)),
    slider('MORPH', () => m.amt, x => (m.amt = x)), h('label', {}, tr('SEED')), (() => { const i = h('input', { type: 'number', value: m.seed, min: 1, max: 9999 }); i.onchange = () => (m.seed = +i.value || 1); return i; })(),
    btn(tr('LOCK KICK'), m.lockK, () => { m.lockK = !m.lockK; Lab.render(); }), btn(tr('LOCK SNARE'), m.lockS, () => { m.lockS = !m.lockS; Lab.render(); }), btn('◉ ' + tr('PREVIEW'), false, doMorph, 'big')),
    h('p', { class: 'ldesc' }, tr('morph is a step blend (notes, velocity, chance, rolls, timing), not an audio crossfade') + ' · ' + (LANG === 'es' ? 'suena en el patrón O' : 'it plays in pattern O'))));
  const f = Lab.fusion, famSel = (get, set) => { const s = h('select', {}); FAMILIES.forEach(x => s.append(h('option', { value: x }, tr(x)))); s.value = get(); s.onchange = () => set(s.value); return s; };
  v.append(sec('FUSION MORPH', 'fusion', h('div', { class: 'lrow' }, famSel(() => f.a, x => (f.a = x)), h('span', {}, '×'), famSel(() => f.b, x => (f.b = x)),
    slider('RHYTHM A/B', () => f.rhythm, x => (f.rhythm = x)), slider('TIMBRE A/B', () => f.timbre, x => (f.timbre = x)), slider('ENERGY', () => f.energy, x => (f.energy = x)), slider('COMPLEXITY', () => f.cplx, x => (f.cplx = x)),
    (() => { const i = h('input', { type: 'number', value: f.seed, min: 1, max: 9999 }); i.onchange = () => (f.seed = +i.value || 1); return i; })(), btn(tr('LOCK KICK'), f.lockK, () => { f.lockK = !f.lockK; Lab.render(); }), btn('⚡ ' + tr('GENERATE').replace('⚡ ', ''), false, doFusion, 'big'))));
  // scenes
  const sc = h('div', { class: 'lscenes' });
  Lab.scenes.forEach((s, i) => { const b = btn('', Lab.lastScene === i, () => launchScene(i), 'lscene'); b.style.setProperty('--fc', FAM_COLOR[s.fam] || '#46e0ff');
    b.append(h('span', {}, s.name), h('small', {}, tr(s.fam)));
    b.ondblclick = e => { e.preventDefault(); const n = prompt(tr('Rename the scene'), s.name); if (n && n.trim()) { s.name = n.trim().slice(0, 18).toUpperCase(); saveScenes(); Lab.render(); } };
    sc.append(b); });
  v.append(sec('SCENES', 'scenes', sc, h('p', { class: 'ldesc' }, tr('double-click a name to rename it') + ' · ' + tr('on the next bar'))));
  // MIDI import and controllers
  const mi = h('input', { type: 'file', accept: '.mid,.midi,audio/midi', style: 'display:none' }); mi.onchange = () => { if (mi.files[0]) importMidiFile(mi.files[0]); mi.value = ''; };
  const ctl = h('div', { class: 'chips' }); ['NONE', 'FM-1', 'KEYLAB'].forEach(n => ctl.append(btn(tr(n), Lab.profile === n, () => applyProfile(n))));
  if (Lab.profile === 'KEYLAB') ['ESSENTIAL', 'MK2', 'MK3'].forEach(g => ctl.append(btn(g, Lab.keylab === g, () => { Lab.keylab = g; LS.set('pulsar.keylab', g); Lab.render(); }, 'small')));
  v.append(sec('MIDI', 'midi', h('div', { class: 'lrow' }, btn('⤒ ' + tr('IMPORT MIDI'), false, () => mi.click()), mi, h('label', {}, tr('CONTROLLER')), ctl),
    h('p', { class: 'ldesc' }, PROFILES[Lab.profile] ? PROFILES[Lab.profile].info[LANG === 'es' ? 1 : 0] : (LANG === 'es' ? 'IMPORTAR MIDI: archivos .mid formato 0 o 1; notas de batería GM (35-81) o 36-51 a las 16 pistas, cuantizadas a 1/16 (el resto queda como micro-tiempo), hasta 64 pasos.' : 'IMPORT MIDI: .mid files, format 0 or 1; GM drum notes (35-81) or 36-51 onto the 16 tracks, quantized to 1/16 (the rest kept as micro timing), up to 64 steps.'))));
};
Lab.tele = function (tele) {
  if (Lab.pendingScene && tele[2] === Lab.pendingScene.slot) { const p = Lab.pendingScene; Lab.pendingScene = null; applyFamily(p.fam, p.fam, p.bpm); UI.cur = p.slot; Bridge.params([...PARAMS].map((v, i) => [i, v])); renderRows(); renderPats(); }
  if (Lab.build) { const cur = tele[2] | 0, loop = tele[48] | 0;
    if (cur === BUILD_SLOT) { if (loop >= Lab.build.rep - 1 && !Lab.build.queued) { Lab.build.queued = true; Bridge.post({ t: 'select', p: Lab.build.back }); } }
    else if (Lab.build.queued) { Lab.build = null; Lab.render(); } }
  const m = $('#labMeter'); if (m) { const rms = tele[50], gr = tele[51], mk = tele[52];
    m.innerHTML = `<i style="width:${Math.max(0, Math.min(100, (rms + 40) / 40 * 100))}%"></i><span>${tr('level')} ${rms > -90 ? rms.toFixed(1) : '−∞'} dBFS · ${tr('limiter')} ${gr < -0.05 ? gr.toFixed(1) + ' dB' : '0 dB'} · ${tr('loudness match')} ${(20 * Math.log10(Math.max(mk, 1e-3))).toFixed(1)} dB</span>`; }
};
Lab.boot = function () {
  Lab.scenes = loadScenes();
  const sw = $('#viewSw'); if (sw && !$('#vLab')) { const b = h('button', { id: 'vLab' }, 'LAB'); b.onclick = () => setView('LAB'); sw.append(b); }
  if (!$('#labV')) $('#seq').append(h('div', { id: 'labV' }));
  const base = setView;
  setView = function (v) { if (v === 'LAB') { UI.view = 'LAB'; LS.set('pulsar.view', 'LAB'); $('#vLive').classList.remove('on'); $('#vGrid').classList.remove('on'); $('#vLab').classList.add('on');
      $('#live').classList.remove('show'); $('#gridV').style.display = 'none'; $('#labV').style.display = ''; Lab.render(); return; }
    $('#vLab').classList.remove('on'); $('#labV').style.display = 'none'; base(v); };
  $('#vLive').onclick = () => setView('LIVE'); $('#vGrid').onclick = () => setView('GRID');
  if (UI.view === 'LAB') setView('LAB'); else $('#labV').style.display = 'none';
  const t0 = Bridge.onTele; Bridge.onTele = (tele, scope) => { t0 && t0(tele, scope); Lab.tele(tele); };
  if (Lab.profile !== 'NONE') setTimeout(() => applyProfile(Lab.profile), 400);
  // the FM-1 profile follows the selected track; the web version reads CC 24 (track) and channel 16 notes as pads
  let lastSel = UI.sel; setInterval(() => { if (Lab.profile === 'FM-1' && UI.sel !== lastSel) { lastSel = UI.sel; applyProfile('FM-1'); } }, 300);
  const cc0 = Learn.webCC; Learn.webCC = (cc, v) => { if (Lab.profile === 'FM-1' && cc === 24) { UI.sel = Math.min(15, Math.floor(v / 8)); renderRows(); renderPanel(); return; } cc0(cc, v); };
};
window.Lab = Lab;
