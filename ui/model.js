/* model.js — PULSAR data: parameters, pattern bytes, kits, the style generators and MIDI export */
const NT = 16, NS = 64, NPAT = 16;
const G = { BPM: 0, SWING: 1, MASTER: 2, REVSIZE: 3, REVTONE: 4, DLYTIME: 5, DLYFB: 6, DLYTONE: 7, COMP: 8, DRIVE: 9, DUCKSRC: 10, DUCKTIME: 11, STUTLEN: 12, HUMAN: 13, WIDTH: 14 };
const NGLOBAL = 16, NTP = 24;
const T = { MODE: 0, SYN: 1, SMP: 2, TUNE: 3, DECAY: 4, TONE: 5, SNAP: 6, DRIVE: 7, ERA: 8, STRETCH: 9, START: 10, REV: 11, CUT: 12, RES: 13, FTYPE: 14,
  LEVEL: 15, PAN: 16, SENDR: 17, SENDD: 18, CHOKE: 19, DUCK: 20, SWING: 21, ROLE: 22, ATK: 23 };
const TPID = (t, k) => NGLOBAL + t * NTP + k;
// PULSAR 2: parameters appended after the original 400 (older projects keep their numbers)
const X_BASE = NGLOBAL + NT * NTP, NXG = 8, NXT = 8;
const XG = { XYON: 0, XYX: 1, XYY: 2, REPEAT: 3, VELSENS: 4 };
const XT = { PUNCH: 0, COMP: 1, LOW: 2, HIGH: 3, OUT: 4, LOCK: 5 };
const XGID = k => X_BASE + k, TXID = (t, k) => X_BASE + NXG + t * NXT + k;
const P_COUNT = X_BASE + NXG + NT * NXT;
const REPEATS = ['OFF', '1/8', '1/16', '1/32', '1/16T'];
const MODES = ['SYNTH', 'SAMPLE', 'BREAK'];
const SYNS = ['KICK', 'BOOM', 'HARD KICK', 'SNARE', 'CLAP', 'HAT', 'OPEN HAT', 'RIDE', 'TOM', 'RIM', 'COWBELL', 'FM PERC', 'ZAP', 'NOISE'];
const SYN = Object.fromEntries(SYNS.map((n, i) => [n, i]));
const ERAS = ['CLEAN', '12-BIT 26K', '12-BIT 40K', '8-BIT 28K', '16-BIT PUNCH'];
const ROLES = ['KICK', 'SNARE', 'HAT', 'PERC', 'BREAK', 'CYMBAL'];
const PERF = ['STUTTER', 'ROLL', 'DRILL', 'GLITCH', 'REVERSE', 'TAPE STOP', 'CRUSH', 'FILTER', 'RISE', 'HALF', 'DOUBLE', 'GATE', 'DUB', 'WARP', 'DROP', 'FILL'];
const SPEEDS = ['1/8', '1/16', '1/32', '1/16T', '1/8T', '1/64'];
const DIRS = ['FWD', 'BACK', 'PING', 'RANDOM'];
const CONDS = ['ALWAYS', '1:2', '2:2', '1:3', '2:3', '3:3', '1:4', '2:4', '3:4', '4:4', 'FILL', 'NOT FILL', 'FIRST', 'NOT FIRST'];
const RATMODES = ['EVEN', 'CRESC', 'DECRESC', 'PITCH UP', 'PITCH DOWN', 'ACCEL'];
const DLYDIVS = ['1/64', '1/32', '3/64', '1/16', '3/32', '1/8', '3/16', '1/4'];

// ------------------------------------------------------------------ pattern bytes (same layout as the C++ struct)
const PAT = { HDR: 8, TRK: 520, STEP: 8 };
PAT.PERF = PAT.HDR + NT * PAT.TRK; PAT.LANES = PAT.PERF + NS * 2; PAT.LANE = 68; PAT.SIZE = PAT.LANES + 12 * PAT.LANE;
function patNew() { const b = new Uint8Array(PAT.SIZE); b[0] = 16; for (let t = 0; t < NT; t++) { const o = PAT.HDR + t * PAT.TRK; b[o] = 16; b[o + 1] = 1; for (let s = 0; s < NS; s++) { const so = o + 8 + s * 8; b[so + 1] = 100; b[so + 2] = 1; b[so + 3] = 100; b[so + 7] = 255; } }
  for (let l = 0; l < 12; l++) { const o = PAT.LANES + l * PAT.LANE; for (let s = 0; s < NS; s++) b[o + 4 + s] = 255; } return b; }
const so = (t, s) => PAT.HDR + t * PAT.TRK + 8 + s * 8;
const to = t => PAT.HDR + t * PAT.TRK;
function getStep(b, t, s) { const o = so(t, s); const i8 = x => x > 127 ? x - 256 : x;
  return { vel: i8(b[o]), prob: b[o + 1], rat: b[o + 2] & 15, rmode: b[o + 2] >> 4, rprob: b[o + 3], mic: i8(b[o + 4]), pit: i8(b[o + 5]), cond: b[o + 6], slice: b[o + 7] }; }
function setStep(b, t, s, st) { const o = so(t, s); const u8 = x => (x + 256) & 255;
  if (st.vel !== undefined) b[o] = u8(Math.max(0, Math.min(127, st.vel | 0)));
  if (st.prob !== undefined) b[o + 1] = Math.max(0, Math.min(100, st.prob | 0));
  if (st.rat !== undefined || st.rmode !== undefined) { const r = st.rat !== undefined ? st.rat : b[o + 2] & 15, m = st.rmode !== undefined ? st.rmode : b[o + 2] >> 4; b[o + 2] = (Math.max(1, Math.min(8, r)) & 15) | ((m & 15) << 4); }
  if (st.rprob !== undefined) b[o + 3] = Math.max(0, Math.min(100, st.rprob | 0));
  if (st.mic !== undefined) b[o + 4] = u8(Math.max(-50, Math.min(50, st.mic | 0)));
  if (st.pit !== undefined) b[o + 5] = u8(Math.max(-24, Math.min(24, st.pit | 0)));
  if (st.cond !== undefined) b[o + 6] = st.cond;
  if (st.slice !== undefined) b[o + 7] = st.slice; }
function clearStep(b, t, s) { const o = so(t, s); b[o] = 0; b[o + 1] = 100; b[o + 2] = 1; b[o + 3] = 100; b[o + 4] = 0; b[o + 5] = 0; b[o + 6] = 0; b[o + 7] = 255; }
const trkLen = (b, t) => b[to(t)] || 16, setTrkLen = (b, t, n) => (b[to(t)] = Math.max(1, Math.min(64, n)));
const trkSpeed = (b, t) => b[to(t) + 1], setTrkSpeed = (b, t, v) => (b[to(t) + 1] = v);
const trkDir = (b, t) => b[to(t) + 2], setTrkDir = (b, t, v) => (b[to(t) + 2] = v);
const trkMute = (b, t) => b[to(t) + 3], setTrkMute = (b, t, v) => (b[to(t) + 3] = v ? 1 : 0);
const perfAt = (b, s) => b[PAT.PERF + s * 2] | (b[PAT.PERF + s * 2 + 1] << 8);
function laneInfo(b) { const out = []; for (let l = 0; l < 12; l++) { const o = PAT.LANES + l * PAT.LANE; if (b[o + 2]) out.push({ l, track: b[o], param: b[o + 1] }); } return out; }
function clearMotion(b) { for (let l = 0; l < 12; l++) { const o = PAT.LANES + l * PAT.LANE; b[o + 2] = 0; for (let s = 0; s < NS; s++) b[o + 4 + s] = 255; } for (let s = 0; s < NS * 2; s++) b[PAT.PERF + s] = 0; }

// ------------------------------------------------------------------ randomness that can be repeated (a seed per idea)
function RNG(seed) { let s = seed >>> 0 || 1; const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  r.int = n => Math.floor(r() * n); r.pick = a => a[Math.floor(r() * a.length)]; r.chance = p => r() < p; return r; }

// ------------------------------------------------------------------ sounds of a track
// {n: label, m: 'syn'|'smp'|'brk', s: synth name or sound id, role, p: {param: value}}
const SND = (n, m, s, role, p = {}) => ({ n, m, s, role, p });
const KITS = {
  'BIG BEAT': [SND('KICK', 'smp', 'designed/kick big beat', 'KICK'), SND('SNARE', 'smp', 'designed/snare big beat', 'SNARE', { SENDR: .12 }),
    SND('CLAP', 'smp', 'designed/clap stack', 'SNARE', { SENDR: .15 }), SND('HAT', 'smp', 'big kit/hat closed', 'HAT', { CHOKE: 1, LEVEL: .6 }),
    SND('OPEN', 'smp', 'big kit/hat open', 'CYMBAL', { CHOKE: 1, LEVEL: .55, DECAY: .6 }), SND('BREAK A', 'brk', 'breaks hifi/brk big 120', 'BREAK', { DECAY: .35, DRIVE: .25 }),
    SND('BREAK B', 'brk', 'breaks hifi/brk heavy 108', 'BREAK', { DECAY: .3, ERA: 4 }), SND('RIM', 'smp', 'big kit/rimshot', 'PERC', { LEVEL: .6 }),
    SND('TOM', 'smp', 'big kit/tom floor', 'PERC', { SENDR: .15 }), SND('CRASH', 'smp', 'big kit/crash', 'CYMBAL', { LEVEL: .5 }),
    SND('SUB', 'smp', 'designed/kick boom', 'KICK', { LEVEL: .55, TUNE: -2 }), SND('ZAP', 'smp', 'designed/zap', 'PERC', { LEVEL: .5, SENDD: .3 }),
    SND('GHOST', 'smp', 'studio kit/snare soft', 'SNARE', { LEVEL: .45 }), SND('TAMB', 'smp', 'snares/tambourine', 'HAT', { LEVEL: .45 }),
    SND('RISER', 'smp', 'designed/noise riser', 'PERC', { LEVEL: .45, SENDR: .3 }), SND('RIDE', 'smp', 'big kit/ride', 'CYMBAL', { LEVEL: .4 })],
  'BRAINDANCE': [SND('KICK', 'smp', 'designed/kick electro', 'KICK'), SND('SNARE', 'smp', 'odd kit/snare 13', 'SNARE', { SENDR: .1 }),
    SND('SNARE 2', 'smp', 'snares/snare 10 piccolo', 'SNARE', { TUNE: 5 }), SND('HAT', 'smp', 'designed/hat metal closed', 'HAT', { CHOKE: 1, LEVEL: .5 }),
    SND('OPEN', 'smp', 'designed/hat metal open', 'CYMBAL', { CHOKE: 1, LEVEL: .4 }), SND('BREAK A', 'brk', 'breaks hifi/brk tight 132', 'BREAK', { DECAY: .15 }),
    SND('BREAK B', 'brk', 'breaks/brk ghost 88', 'BREAK', { DECAY: .2, ERA: 2 }), SND('FM BLIP', 'smp', 'designed/fm blip', 'PERC', { PAN: -.4 }),
    SND('FM WOOD', 'smp', 'designed/fm wood', 'PERC', { TUNE: 7, PAN: .4 }), SND('BLOCK', 'smp', 'odd kit/block', 'PERC', { LEVEL: .55, SENDD: .25 }),
    SND('SUB', 'smp', 'designed/kick boom', 'KICK', { LEVEL: .6 }), SND('ZAP', 'smp', 'designed/zap', 'PERC', { LEVEL: .45 }),
    SND('ODD HAT', 'smp', 'odd kit/hat', 'PERC', { LEVEL: .5 }), SND('SIDESTICK', 'smp', 'studio kit/sidestick', 'PERC', { LEVEL: .5, SENDD: .3 }),
    SND('NOISE', 'syn', 'NOISE', 'PERC', { DECAY: .1, TONE: .9, LEVEL: .35 }), SND('REV SNR', 'smp', 'snares/snare 14 brass', 'SNARE', { REV: 1, LEVEL: .45, SENDR: .4 })],
  'DRILL N BASS': [SND('KICK', 'smp', 'studio kit/kick', 'KICK'), SND('SNARE', 'smp', 'designed/snare jungle', 'SNARE', { SENDR: .08 }),
    SND('SNARE HI', 'smp', 'snares/snare 10 piccolo', 'SNARE', { TUNE: 5, LEVEL: .6 }), SND('HAT', 'smp', 'studio kit/hat tight', 'HAT', { CHOKE: 1, LEVEL: .5 }),
    SND('OPEN', 'smp', 'studio kit/hat open', 'CYMBAL', { CHOKE: 1, LEVEL: .45, DECAY: .5 }), SND('BREAK A', 'brk', 'breaks hifi/brk tight 132', 'BREAK', { DECAY: .2 }),
    SND('BREAK B', 'brk', 'breaks/brk rush 140', 'BREAK', { DECAY: .15, TUNE: 3 }), SND('GHOST', 'smp', 'snares/snare 12 ghost', 'SNARE', { LEVEL: .5 }),
    SND('TOM', 'smp', 'studio kit/tom mid', 'PERC', { LEVEL: .55 }), SND('RIDE', 'smp', 'studio kit/ride', 'CYMBAL', { LEVEL: .35 }),
    SND('SUB', 'smp', 'designed/kick boom', 'KICK', { LEVEL: .7, TUNE: -3 }), SND('RIM', 'smp', 'snares/rimshot 13', 'PERC', { LEVEL: .5 }),
    SND('SNR ROLL', 'smp', 'snares/snare 12 tight', 'SNARE', { LEVEL: .5, TUNE: 2 }), SND('FM', 'smp', 'designed/fm blip', 'PERC', { LEVEL: .4 }),
    SND('NOISE', 'syn', 'NOISE', 'PERC', { DECAY: .05, LEVEL: .3 }), SND('CLAP', 'smp', 'snares/hand clap', 'SNARE', { LEVEL: .45 })],
};
const swap = (kit, ch) => kit.map((x, i) => ch[i] || x);
KITS['JUNGLE'] = swap(KITS['DRILL N BASS'], { 5: SND('BREAK A', 'brk', 'breaks/brk funky 101', 'BREAK', { DECAY: .3 }), 6: SND('BREAK B', 'brk', 'breaks/brk riot 136', 'BREAK', { DECAY: .25, ERA: 2 }) });
KITS['BREAKBEAT'] = swap(KITS['BIG BEAT'], { 0: SND('KICK', 'smp', 'big kit/kick', 'KICK'), 1: SND('SNARE', 'smp', 'snares/snare 14 maple', 'SNARE', { SENDR: .12 }), 5: SND('BREAK A', 'brk', 'breaks hifi/brk shuffle 96', 'BREAK', { DECAY: .3 }) });
KITS['ACID TECHNO'] = swap(KITS['BIG BEAT'], { 0: SND('KICK', 'smp', 'designed/kick rave', 'KICK'), 2: SND('CLAP', 'smp', 'designed/clap stack', 'SNARE', { SENDR: .2 }), 3: SND('HAT', 'smp', 'designed/hat metal closed', 'HAT', { CHOKE: 1, LEVEL: .5 }), 4: SND('OPEN', 'smp', 'designed/hat metal open', 'CYMBAL', { CHOKE: 1, LEVEL: .45 }) });
KITS['ELECTRO'] = swap(KITS['BRAINDANCE'], { 0: SND('KICK', 'smp', 'designed/kick electro', 'KICK'), 1: SND('SNARE', 'smp', 'designed/snare electro', 'SNARE'), 2: SND('CLAP', 'smp', 'designed/clap stack', 'SNARE', { SENDR: .25 }), 12: SND('COWBELL', 'syn', 'COWBELL', 'PERC', { LEVEL: .4 }) });
KITS['BREAKCORE'] = swap(KITS['DRILL N BASS'], { 0: SND('GABBA', 'smp', 'designed/kick gabber', 'KICK'), 5: SND('BREAK A', 'brk', 'breaks hifi/brk tight 132', 'BREAK', { DRIVE: .45, DECAY: .15, ERA: 1 }) });
KITS['RAVE 92'] = swap(KITS['BIG BEAT'], { 0: SND('KICK', 'smp', 'designed/kick rave', 'KICK'), 5: SND('BREAK A', 'brk', 'breaks/brk riot 136', 'BREAK', { DECAY: .35, ERA: 1 }), 6: SND('BREAK B', 'brk', 'breaks/brk funky 101', 'BREAK', { DECAY: .3 }) });
KITS['TRIP HOP'] = swap(KITS['BREAKBEAT'], { 0: SND('KICK', 'smp', '70s kit/kick', 'KICK'), 1: SND('SNARE', 'smp', '70s kit/snare', 'SNARE', { SENDR: .3 }), 5: SND('BREAK A', 'brk', 'breaks/brk crate 92', 'BREAK', { DECAY: .5, ERA: 1, CUT: .7 }) });
KITS['HALFTIME'] = KITS['DRILL N BASS'];
KITS['IDM GLITCH'] = KITS['BRAINDANCE'];
KITS['VINTAGE BOX'] = [SND('KICK', 'smp', 'rhythm box/kick', 'KICK'), SND('SNARE', 'smp', 'rhythm box/snare', 'SNARE'), SND('ACCENT', 'smp', 'rhythm box/snare accent', 'SNARE'),
  SND('HAT', 'smp', 'rhythm box/hat', 'HAT', { CHOKE: 1 }), SND('METAL', 'smp', 'rhythm box/hat metal', 'CYMBAL', { CHOKE: 1 }), SND('BREAK A', 'brk', 'breaks/brk drummer 98', 'BREAK'),
  SND('BREAK B', 'brk', 'breaks/brk crate 92', 'BREAK'), SND('RIM', 'smp', 'rhythm box/rim', 'PERC'), SND('BONGO', 'smp', 'rhythm box/bongo high', 'PERC'),
  SND('CYMBAL', 'smp', 'rhythm box/cymbal', 'CYMBAL'), SND('CONGA', 'smp', 'rhythm box/conga', 'PERC'), SND('GUIRO', 'smp', 'rhythm box/guiro', 'PERC'),
  SND('COWBELL', 'smp', 'rhythm box/cowbell', 'PERC'), SND('TAMB', 'smp', 'rhythm box/tambourine', 'HAT'), SND('LM KICK', 'smp', '80s studio/kick', 'KICK'), SND('LM CLAP', 'smp', '80s studio/clap', 'SNARE')];
// PULSAR 3.1: the styles' master drive is scaled down: the sounds already carry their own character, and the drive on the
// whole mix stacked distortion on top of it (2.5-6 % THD on the kick at the old 30 %)
const DRIVE_SCALE = 0.3;
const STYLES = {    // bpm range, swing, the master feel, and which generator writes each role
  'BIG BEAT':     { bpm: [126, 138], swing: .06, drive: .35, comp: .55, human: .15, desc: ['Breakbeats with a heavy kick, distorted and loud.', 'Breaks con bombo pesado, distorsionados y fuertes.'] },
  'BRAINDANCE':   { bpm: [118, 160], swing: .0, drive: .1, comp: .35, human: .05, desc: ['Twisted, playful, odd lengths, drills and glitches.', 'Retorcido, juguetón, largos impares, ráfagas y glitches.'] },
  'DRILL N BASS': { bpm: [165, 185], swing: .0, drive: .2, comp: .45, human: .05, desc: ['Breaks chopped at speed, pitched rolls, deep sub.', 'Breaks picados a toda velocidad, redobles afinados, sub grave.'] },
  'JUNGLE':       { bpm: [160, 172], swing: .04, drive: .2, comp: .45, human: .1, desc: ['Rolling chopped breaks over a sub.', 'Breaks picados rodando sobre un sub.'] },
  'BREAKBEAT':    { bpm: [125, 134], swing: .08, drive: .2, comp: .4, human: .2, desc: ['Funky breaks, solid kick and snare.', 'Breaks funky, bombo y caja sólidos.'] },
  'ACID TECHNO':  { bpm: [135, 145], swing: .02, drive: .3, comp: .5, human: .0, desc: ['Four to the floor, hard and hypnotic.', 'Cuatro por cuatro, duro e hipnótico.'] },
  'ELECTRO':      { bpm: [118, 130], swing: .05, drive: .1, comp: .3, human: .0, desc: ['Syncopated boom, zaps and claps.', 'Boom sincopado, zaps y palmas.'] },
  'BREAKCORE':    { bpm: [180, 210], swing: .0, drive: .55, comp: .6, human: .05, desc: ['Mangled breaks and distorted kicks.', 'Breaks destrozados y bombos distorsionados.'] },
  'RAVE 92':      { bpm: [140, 150], swing: .0, drive: .25, comp: .5, human: .05, desc: ['Early rave hardcore: breaks on a stomp.', 'Hardcore rave temprano: breaks sobre un pisotón.'] },
  'TRIP HOP':     { bpm: [84, 96], swing: .14, drive: .15, comp: .4, human: .25, desc: ['Slow, dusty, heavy breaks.', 'Lento, polvoso, breaks pesados.'] },
  'HALFTIME':     { bpm: [168, 176], swing: .0, drive: .2, comp: .5, human: .05, desc: ['Half-time weight at drum and bass tempo.', 'Peso a medio tiempo, a tempo de drum and bass.'] },
  'IDM GLITCH':   { bpm: [96, 124], swing: .0, drive: .05, comp: .3, human: .1, desc: ['Micro sounds, probabilities, tiny details.', 'Microsonidos, probabilidades, detalles mínimos.'] },
  'VINTAGE BOX':  { bpm: [96, 118], swing: .1, drive: .05, comp: .3, human: .1, desc: ['An old rhythm box with real breaks.', 'Una caja de ritmos vieja con breaks reales.'] },
};
const STYLE_KIT = { 'HALFTIME': 'DRILL N BASS', 'IDM GLITCH': 'BRAINDANCE' };

// ------------------------------------------------------------------ the generators: they write patterns like a drummer of each style would
function g16(str) { return [...str].map(c => c === '.' ? 0 : c === 'X' ? 120 : c === 'x' ? 96 : c === 'o' ? 64 : 34); }
const BREAK_ORDERS = {   // ways producers re-arranged break slices (32 slices = 2 bars of 16ths)
  straight: s => s,
  jungle: s => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 12, 13, 4, 5][s % 16] + (s >= 16 ? 16 : 0),
  roll: s => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 4, 4, 4, 5][s % 16],
  stab: s => [0, 0, 2, 3, 4, 0, 6, 7, 8, 9, 4, 4, 12, 13, 4, 15][s % 16],
  think: s => [0, 1, 2, 3, 12, 13, 6, 7, 0, 1, 10, 11, 4, 5, 12, 13][s % 16],
};

function generate(style, seed, complexity, bytes) {
  const r = RNG(seed), c = complexity, S = STYLES[style];
  const b = bytes || patNew(); const put = (t, s, vel, extra = {}) => setStep(b, t, s, Object.assign({ vel }, extra));
  for (let t = 0; t < NT; t++) for (let s = 0; s < NS; s++) clearStep(b, t, s);
  for (let t = 0; t < NT; t++) { setTrkLen(b, t, 16); setTrkSpeed(b, t, 1); setTrkDir(b, t, 0); }
  b[0] = 16; b[1] = 0;
  const line = (t, str, v = {}) => g16(str).forEach((vel, s) => vel && put(t, s, vel, v));
  const ghost = (t, p) => { for (let s = 0; s < 16; s++) if (r.chance(p) && getStep(b, t, s).vel === 0 && s % 4 !== 0) put(t, s, 22 + r.int(20)); };
  const brk = (t, order, ratP = 0, slices = 32) => { const ord = BREAK_ORDERS[order];
    for (let s = 0; s < 16; s++) { let sl = ord(s); if (r.chance(c * 0.35)) sl = r.int(slices); const rat = r.chance(ratP) ? r.pick([2, 3, 4, 6]) : 1;
      put(t, s, 92 + r.int(30), { slice: sl % slices, rat, rmode: rat > 1 ? r.pick([0, 1, 3]) : 0, rprob: 100 }); } };
  const pick = (a) => r.pick(a);
  switch (style) {
    case 'BIG BEAT': case 'BREAKBEAT': case 'RAVE 92': {
      line(0, pick(['X.....X...X.....', 'X.........X..X..', 'X..X......X.....', 'X.....X.X.....X.']));
      line(1, '....X.......X...'); if (style === 'BIG BEAT') line(2, '....X.......X...', { prob: 100 });
      line(3, pick(['x.x.x.x.x.x.x.x.', 'xoxoxoxoxoxoxoxo', '.x.x.x.x.x.x.x.x'])); if (r.chance(.6)) line(4, '..............o.');
      brk(5, pick(style === 'RAVE 92' ? ['straight', 'roll', 'jungle'] : ['straight', 'stab', 'think']), c * .25);
      if (c > .4) { for (let s = 0; s < 16; s++) if (r.chance(.3)) put(6, s, 80 + r.int(30), { slice: r.int(32) }); }
      ghost(12, .15 + c * .2); if (r.chance(.5)) line(13, 'o.o.o.o.o.o.o.o.');
      if (r.chance(.3 + c * .3)) put(11, pick([7, 11, 15]), 90); line(9, 'x...............', { cond: 6 });
      line(10, pick(['X.........X.....', 'X.....X.........'])); if (c > .6) put(1, 15, 70, { rat: 4, rmode: 1 }); break; }
    case 'BRAINDANCE': case 'IDM GLITCH': {
      const glitch = style === 'IDM GLITCH';
      for (let s = 0; s < 16; s++) if (s === 0 || r.chance(.12 + c * .15)) put(0, s, 90 + r.int(37), { mic: r.chance(.4) ? r.int(30) - 15 : 0, prob: s === 0 ? 100 : 60 + r.int(40) });
      line(1, glitch ? '........X.......' : '....X.......X...');
      for (let s = 0; s < 16; s++) if (r.chance(.12 + c * .2)) put(2, s, 60 + r.int(60), { rat: r.pick([1, 2, 3, 4, 6, 8]), rmode: r.pick([0, 1, 2, 3, 4, 5]), rprob: 40 + r.int(60), pit: r.pick([0, 0, 3, 5, 7, 12, -5]) });
      setTrkLen(b, 3, pick([7, 9, 11, 13, 15])); for (let s = 0; s < 16; s++) if (r.chance(.55)) put(3, s, 40 + r.int(70), { prob: 60 + r.int(40), mic: r.int(20) - 10 });
      setTrkLen(b, 7, pick([5, 7, 10])); for (let s = 0; s < 10; s++) if (r.chance(.4)) put(7, s, 50 + r.int(70), { pit: r.pick([0, 2, 5, 7, 12, 14]) });
      setTrkLen(b, 8, pick([12, 6, 9])); setTrkSpeed(b, 8, pick([1, 3, 2])); for (let s = 0; s < 12; s++) if (r.chance(.3)) put(8, s, 50 + r.int(60), { pit: r.int(13) - 6 });
      setTrkDir(b, 9, 3); for (let s = 0; s < 16; s++) if (r.chance(.25)) put(9, s, 40 + r.int(60), { rat: r.pick([1, 1, 2, 3]) });
      if (!glitch) brk(5, 'think', .2 + c * .3); else for (let s = 0; s < 16; s++) if (r.chance(.35)) put(5, s, 70 + r.int(50), { slice: r.int(32), rat: r.pick([1, 1, 2, 4]) });
      for (let s = 0; s < 16; s++) if (r.chance(.15 * c)) put(11, s, 60 + r.int(60), { prob: 50 });
      for (let s = 0; s < 16; s++) if (r.chance(.2)) put(12, s, 40 + r.int(60), { pit: r.int(25) - 12, mic: r.int(40) - 20 });
      line(10, pick(['X.......X.......', 'X..........X....', 'X.....X....X....']));
      for (let s = 0; s < 16; s++) if (r.chance(.12)) put(14, s, 50, { rat: 8, rmode: 5, rprob: 60 }); if (r.chance(.5)) put(15, pick([3, 11, 14]), 70, { cond: pick([6, 7, 8]) }); break; }
    case 'DRILL N BASS': case 'JUNGLE': case 'BREAKCORE': case 'HALFTIME': {
      const half = style === 'HALFTIME', core = style === 'BREAKCORE', dnb = style === 'DRILL N BASS';
      line(0, half ? 'X.........X.....' : pick(['X.........X.....', 'X.....X...X.....', 'X..X......X..X..']));
      line(1, half ? '........X.......' : '....X.......X...');
      brk(5, pick(dnb ? ['jungle', 'think', 'roll'] : ['jungle', 'straight', 'think']), dnb ? .25 + c * .4 : core ? .4 : .1 + c * .15);
      if (dnb || core) { for (let s = 0; s < 16; s++) if (r.chance(.25 + c * .3)) put(6, s, 80 + r.int(40), { slice: r.int(32), rat: r.pick([1, 2, 3, 4, 6, 8]), rmode: r.pick([0, 1, 3, 4]), rprob: 50 + r.int(50), pit: r.pick([0, 0, 2, 5, 7, -3]) }); }
      for (let s = 0; s < 16; s++) if (r.chance(dnb ? .25 + c * .25 : .1)) put(2, s, 60 + r.int(60), { rat: dnb ? r.pick([2, 3, 4, 6, 8]) : 1, rmode: r.pick([1, 3, 5]), pit: r.pick([0, 2, 4, 7, 12]) });
      setTrkSpeed(b, 3, dnb && r.chance(.4) ? 2 : 1); for (let s = 0; s < 16; s++) if (r.chance(.4 + c * .2)) put(3, s, 40 + r.int(60));
      ghost(7, .25 + c * .2); line(10, half ? 'X.........X.....' : pick(['X.......X.......', 'X.........X.....', 'X..........X....']));
      line(9, pick(['x.x.x.x.x.x.x.x.', '................']), { prob: 70 });
      if (c > .5) { put(12, 14, 80, { rat: 6, rmode: 1 }); put(12, 15, 90, { rat: 8, rmode: 3 }); }
      if (core) { for (let s = 0; s < 16; s += 2) if (r.chance(.35)) put(0, s, 110, { rat: r.pick([1, 2, 4]) }); }
      if (half) { setTrkSpeed(b, 5, 0); setTrkLen(b, 5, 16); }
      break; }
    case 'ACID TECHNO': {
      line(0, 'X...X...X...X...'); line(2, '....X.......X...'); line(3, pick(['..x...x...x...x.', 'x.x.x.x.x.x.x.x.']));
      line(4, '..o...o...o...o.'); ghost(13, .3); if (c > .3) for (let s = 0; s < 16; s++) if (r.chance(.25)) put(7, s, 60 + r.int(50), { prob: 70 });
      setTrkLen(b, 8, pick([3, 5, 7])); put(8, 0, 80); if (r.chance(.5)) put(8, 2, 60);
      line(9, 'x...............', { cond: 6 }); if (c > .5) brk(6, 'straight', .1); break; }
    case 'ELECTRO': {
      line(0, pick(['X......X..X.....', 'X.....X...X..X..', 'X......X.X......'])); line(2, '....X.......X...');
      line(1, '....X.......X...', { prob: 50 }); line(3, 'x.x.x.x.x.x.x.x.'); line(4, '..............x.');
      for (let s = 0; s < 16; s++) if (r.chance(.15 + c * .2)) put(11, s, 70 + r.int(50), { pit: r.int(12) });
      line(12, pick(['..x..x....x..x..', '...x..x....x..x.'])); for (let s = 0; s < 16; s++) if (r.chance(.2)) put(7, s, 60 + r.int(40));
      setTrkLen(b, 8, 12); for (let s = 0; s < 12; s++) if (r.chance(.25)) put(8, s, 60, { pit: r.int(8) }); break; }
    case 'TRIP HOP': case 'VINTAGE BOX': {
      line(0, pick(['X......X..X.....', 'X.........X.....', 'X..X.......X....'])); line(1, '....X.......X...');
      brk(5, 'straight', .05); ghost(12, .2); line(3, 'x.x.x.x.x.x.x.x.', { prob: 90 });
      if (style === 'VINTAGE BOX') { line(7, '..x...x...x...x.'); line(10, 'x..x..x.x..x..x.', { prob: 80 }); line(13, 'oooooooooooooooo'); }
      if (r.chance(.4)) line(9, 'x...............'); break; }
  }
  // complexity adds life everywhere: probability, ghost notes, micro timing, the odd roll
  if (c > .2) for (let t = 0; t < NT; t++) for (let s = 0; s < 16; s++) { const st = getStep(b, t, s); if (!st.vel) continue;
    if (t !== 0 && t !== 1 && r.chance(c * .15)) setStep(b, t, s, { prob: 55 + r.int(40) });
    if ((t === 3 || t === 12) && r.chance(c * .2)) setStep(b, t, s, { mic: r.int(16) - 8 }); }
  return b;
}

// a variation keeps the groove and moves a few things (like a drummer playing it again)
function vary(bytes, seed, amount) {
  const r = RNG(seed), b = bytes.slice();
  for (let t = 0; t < NT; t++) { const L = trkLen(b, t);
    for (let s = 0; s < L; s++) { const st = getStep(b, t, s);
      if (st.vel && t !== 0 && t !== 1 && r.chance(amount * .25)) { clearStep(b, t, s); continue; }
      if (st.vel && st.slice !== 255 && r.chance(amount * .4)) setStep(b, t, s, { slice: r.int(32) });
      if (st.vel && r.chance(amount * .12)) setStep(b, t, s, { rat: r.pick([2, 3, 4]), rmode: r.pick([0, 1, 3]) });
      if (!st.vel && t > 1 && r.chance(amount * .06)) { const n = (s + L - 1) % L, p = getStep(b, t, n); if (p.vel) setStep(b, t, s, { vel: Math.max(25, p.vel - 40), slice: p.slice === 255 ? 255 : (p.slice + 1) % 32 }); } } }
  return b;
}
// a fill: the last beat turns into a roll
function makeFill(bytes, seed) {
  const r = RNG(seed), b = bytes.slice();
  for (let s = 12; s < 16; s++) { setStep(b, 1, s, { vel: 60 + (s - 12) * 18, rat: r.pick([1, 2, 2, 4]), rmode: 1 }); }
  for (let s = 12; s < 16; s++) if (getStep(b, 5, s).vel) setStep(b, 5, s, { slice: r.int(32), rat: r.pick([1, 2, 3, 4]) });
  setStep(b, 8, 13, { vel: 90 }); setStep(b, 8, 15, { vel: 100, pit: -5 }); setStep(b, 9, 15, { vel: 0 });
  return b;
}
function strip(bytes, keep) { const b = bytes.slice(); for (let t = 0; t < NT; t++) if (!keep.includes(t)) for (let s = 0; s < NS; s++) clearStep(b, t, s); return b; }

// a whole track: intro, groove, variations, a break, fills and the drop
function buildSong(style, seed, complexity) {
  const r = RNG(seed), pats = [], A = generate(style, seed, complexity), B = generate(style, seed + 7, Math.min(1, complexity + .25));
  pats[0] = strip(A, [3, 5, 9, 13]);                   // intro: hats and the break
  pats[1] = A; pats[2] = vary(A, seed + 1, .5); pats[3] = makeFill(vary(A, seed + 2, .3), seed + 3);
  pats[4] = B; pats[5] = vary(B, seed + 4, .6); pats[6] = strip(B, [5, 6, 7, 14, 15]);    // the break (no kick)
  pats[7] = makeFill(B, seed + 5);
  for (let i = 8; i < 16; i++) pats[i] = patNew();
  const song = [[0, 2], [1, 3], [3, 1], [2, 3], [3, 1], [4, 3], [7, 1], [6, 2], [7, 1], [5, 3], [3, 1], [1, 2], [0, 1]];
  return { pats, song };
}

// ------------------------------------------------------------------ MIDI export (one track, one channel: channel 1; General MIDI notes, or PULSAR's own 36 + track)
const GM = { KICK: 36, SNARE: 38, HAT: 42, PERC: 39, BREAK: 40, CYMBAL: 46 };
const TRACK_NOTES = [36, 38, 39, 42, 46, 40, 41, 37, 45, 51, 35, 56, 62, 54, 49, 75];
function midiFile(patList, bpm, names, own, only) {   // patList: [{bytes, rep}]; own: PULSAR's own notes (36 + track), only: one track
  const PPQ = 96, perStep = PPQ / 4, ev = [];
  let t0 = 0; const sm = [2, 1, .5, 2 / 3, 4 / 3, .25];
  for (const { bytes, rep } of patList) {
    const plen = bytes[0] || 16;
    for (let k = 0; k < (rep || 1); k++) {
      for (let t = 0; t < NT; t++) { if (only !== undefined && t !== only) continue; if (trkMute(bytes, t)) continue; const note = own ? 36 + t : TRACK_NOTES[t]; const L = trkLen(bytes, t), spd = sm[trkSpeed(bytes, t)] || 1, stepT = perStep * spd, total = plen * perStep;
        for (let i = 0; i * stepT < total; i++) { const st = getStep(bytes, t, i % L); if (!st.vel) continue;
          const n = Math.max(1, st.rat); for (let j = 0; j < n; j++) { const at = t0 + i * stepT + st.mic / 100 * stepT * 0.5 + j * stepT / n; const v = Math.max(1, Math.min(127, st.vel * (st.rmode === 1 ? .35 + .65 * (j + 1) / n : 1)));
            ev.push([Math.max(0, Math.round(at)), 0x90, note, Math.round(v)], [Math.round(at + Math.max(2, stepT / n * .8)), 0x80, note, 0]); } } }
      t0 += plen * perStep;
    }
  }
  ev.sort((a, b) => a[0] - b[0] || (a[1] === 0x80 ? -1 : 1));
  const vlq = n => { const out = [n & 0x7f]; while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80); return out; };
  const tr = [0, 0xff, 0x51, 3, ...[16, 8, 0].map(sh => (Math.round(60000000 / bpm) >> sh) & 255)];
  const name = 'PULSAR'; tr.push(0, 0xff, 0x03, name.length, ...[...name].map(c => c.charCodeAt(0)));
  let last = 0; for (const e of ev) { tr.push(...vlq(e[0] - last), e[1], e[2], e[3]); last = e[0]; }
  tr.push(0, 0xff, 0x2f, 0);
  const u32 = n => [(n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
  return new Uint8Array([0x4d, 0x54, 0x68, 0x64, ...u32(6), 0, 0, 0, 1, (PPQ >> 8) & 255, PPQ & 255, 0x4d, 0x54, 0x72, 0x6b, ...u32(tr.length), ...tr]);
}
