/* families.js — PULSAR 3 · DFD LIVE LAB: six creative families, each with its own kit, generator, tempo, feel and six named
   starting patterns (simple / complex / extreme). Original patterns written by code; no loop, riff or recording of anyone.
   Design notes (internal): the families study the general technique of a scene, never a record:
     FRACTAL RHYTHM   – braindance: asymmetric grooves, odd lengths, micro offsets, fine probabilities, fragile vs heavy
     HYPERBREAK       – drill: chopped breaks, fast pitched ratchets, articulate sub lines, resolution changes, polymeter
     CHEMICAL PRESSURE– big beat: heavy layered breaks, accents, sweeps, tension percussion, build and drop
     RIOT MACHINE     – rave breaks: aggressive breaks, industrial kicks, stabs, risers, parallel distortion, a safe ceiling
     ROBOT DISCO      – French electro / filter house: four on the floor, elastic bass, swung hats, funk percussion, pump
     DIRTY VOLTAGE    – dark electro house: dense kicks, abrasive mono bass, short stabs, gates, dry drops, stutters
   Loaded after model.js: it adds STYLES / KITS entries and extends generate(), so VARY, BUILD TRACK, MIDI export, locks
   and DICE work on the families too. Track layout (as the other styles): 0 kick, 1 snare, 2 clap, 3 hat, 4 open hat,
   5-6 breaks, 7-9 percussion, 10 bass (pitched steps), 11 fx, 12 ghost, 13 shaker, 14 riser / drop, 15 stab (pitched). */
Object.assign(ES, {
  'FRACTAL RHYTHM': 'RITMO FRACTAL', 'HYPERBREAK': 'HYPERBREAK', 'CHEMICAL PRESSURE': 'PRESIÓN QUÍMICA', 'RIOT MACHINE': 'MÁQUINA DE MOTÍN',
  'ROBOT DISCO': 'DISCO ROBOT', 'DIRTY VOLTAGE': 'VOLTAJE SUCIO', 'simple': 'sencillo', 'complex': 'complejo', 'extreme': 'extremo'
});
const FAMILIES = ['FRACTAL RHYTHM', 'HYPERBREAK', 'CHEMICAL PRESSURE', 'RIOT MACHINE', 'ROBOT DISCO', 'DIRTY VOLTAGE'];
const FAM_COLOR = { 'FRACTAL RHYTHM': '#a77bff', 'HYPERBREAK': '#46e0ff', 'CHEMICAL PRESSURE': '#ff5a36', 'RIOT MACHINE': '#ffc54d', 'ROBOT DISCO': '#c6ff3d', 'DIRTY VOLTAGE': '#ff2e6a' };
Object.assign(STYLES, {
  'FRACTAL RHYTHM':    { bpm: [124, 152], swing: 0, drive: .08, comp: .3, human: .05, dv: 0, duck: 0, fam: 1, desc: ['Asymmetric grooves, odd lengths, micro offsets. ORDER ↔ CHAOS on COMPLEX.', 'Grooves asimétricos, largos impares, micro desplazamientos. ORDEN ↔ CAOS en COMPLEJO.'] },
  'HYPERBREAK':        { bpm: [164, 184], swing: 0, drive: .2, comp: .45, human: .04, dv: 0, duck: .15, fam: 1, desc: ['Breaks chopped at speed, pitched ratchets, an articulate sub line.', 'Breaks picados a toda velocidad, ratchets afinados, una línea de sub articulada.'] },
  'CHEMICAL PRESSURE': { bpm: [116, 132], swing: .05, drive: .18, comp: .45, human: .12, dv: .12, duck: .1, fam: 1, desc: ['Heavy layered breaks, big accents, sweeps and tension.', 'Breaks pesados en capas, acentos grandes, barridos y tensión.'] },
  'RIOT MACHINE':      { bpm: [132, 146], swing: 0, drive: .16, comp: .45, human: .05, dv: .2, duck: .1, fam: 1, desc: ['Aggressive breaks, industrial kicks, stabs and risers.', 'Breaks agresivos, bombos industriales, stabs y risers.'] },
  'ROBOT DISCO':       { bpm: [116, 126], swing: .08, drive: .12, comp: .45, human: .03, dv: 0, duck: .55, fam: 1, desc: ['Four on the floor, an elastic bass, swung hats and the pump.', 'Cuatro por cuatro, un bajo elástico, hats con swing y el bombeo.'] },
  'DIRTY VOLTAGE':     { bpm: [124, 130], swing: .02, drive: .1, comp: .45, human: 0, dv: .55, duck: .45, fam: 1, desc: ['Dark electro house: dense kicks, abrasive mono bass, short stabs, dry drops.', 'Electro house oscuro: bombos densos, bajo mono abrasivo, stabs cortos, drops secos.'] },
});
const L_ = (n, s, role, p) => SND(n, 'smp', s, role, p || {});
KITS['FRACTAL RHYTHM'] = [L_('KICK', 'lab/kick fractal', 'KICK'), L_('SNARE', 'odd kit/snare 13', 'SNARE', { SENDR: .12 }), L_('PICCOLO', 'snares/snare 10 piccolo', 'SNARE', { TUNE: 4, LEVEL: .55 }),
  L_('TICK', 'lab/tick fractal', 'HAT', { LEVEL: .55, PAN: .3 }), L_('METAL', 'designed/hat metal open', 'CYMBAL', { CHOKE: 1, LEVEL: .35 }), SND('BREAK A', 'brk', 'breaks hifi/brk tight 132', 'BREAK', { DECAY: .12 }),
  SND('BREAK B', 'brk', 'breaks/brk ghost 88', 'BREAK', { DECAY: .15, ERA: 2 }), L_('GLASS', 'lab/fm glass', 'PERC', { PAN: -.45, SENDD: .25, LEVEL: .5 }), L_('KNOCK', 'lab/fm knock', 'PERC', { PAN: .45, LEVEL: .55 }),
  L_('BLOCK', 'odd kit/block', 'PERC', { LEVEL: .45, SENDR: .2 }), L_('SUB', 'lab/bass sub', 'KICK', { LEVEL: .6 }), L_('BLIP', 'lab/glitch blip', 'PERC', { LEVEL: .35, SENDD: .3 }),
  L_('GHOST', 'snares/snare 12 ghost', 'SNARE', { LEVEL: .4 }), L_('SIDESTICK', 'studio kit/sidestick', 'PERC', { LEVEL: .45 }), SND('NOISE', 'syn', 'NOISE', 'PERC', { DECAY: .06, TONE: .9, LEVEL: .3 }),
  L_('PLUCK', 'lab/bass pluck', 'PERC', { LEVEL: .45, TUNE: 12, SENDD: .2 })];
KITS['HYPERBREAK'] = [L_('KICK', 'studio kit/kick', 'KICK'), L_('SNARE', 'designed/snare jungle', 'SNARE', { SENDR: .06 }), L_('SNARE HI', 'snares/snare 10 piccolo', 'SNARE', { TUNE: 6, LEVEL: .55 }),
  L_('HAT', 'studio kit/hat tight', 'HAT', { CHOKE: 1, LEVEL: .5 }), L_('OPEN', 'studio kit/hat open', 'CYMBAL', { CHOKE: 1, LEVEL: .4, DECAY: .45 }), SND('BREAK A', 'brk', 'breaks hifi/brk tight 132', 'BREAK', { DECAY: .18 }),
  SND('BREAK B', 'brk', 'breaks/brk rush 140', 'BREAK', { DECAY: .14, TUNE: 2 }), L_('GHOST', 'snares/snare 12 ghost', 'SNARE', { LEVEL: .45 }), L_('TOM', 'studio kit/tom mid', 'PERC', { LEVEL: .5 }),
  L_('RIDE', 'studio kit/ride', 'CYMBAL', { LEVEL: .3 }), L_('BASS', 'lab/bass fm', 'KICK', { LEVEL: .62, DECAY: .45 }), L_('ZAP', 'lab/zap down', 'PERC', { LEVEL: .4 }),
  L_('ROLL', 'snares/snare 12 tight', 'SNARE', { LEVEL: .45, TUNE: 2 }), L_('TICK', 'lab/tick fractal', 'HAT', { LEVEL: .4 }), L_('DROP', 'lab/drop boom', 'KICK', { LEVEL: .5 }),
  L_('REESE', 'lab/bass reese', 'PERC', { LEVEL: .4, TUNE: 12 })];
KITS['CHEMICAL PRESSURE'] = [L_('KICK', 'lab/kick pressure', 'KICK'), L_('SNARE', 'lab/snare pressure', 'SNARE', { SENDR: .14 }), L_('CLAP', 'designed/clap stack', 'SNARE', { SENDR: .18, LEVEL: .55 }),
  L_('HAT', 'big kit/hat closed', 'HAT', { CHOKE: 1, LEVEL: .55 }), L_('OPEN', 'big kit/hat open', 'CYMBAL', { CHOKE: 1, LEVEL: .5, DECAY: .6 }), SND('BREAK A', 'brk', 'breaks hifi/brk big 120', 'BREAK', { DECAY: .35, DRIVE: .3 }),
  SND('BREAK B', 'brk', 'breaks hifi/brk heavy 108', 'BREAK', { DECAY: .3, ERA: 4, DRIVE: .2 }), L_('METAL', 'lab/metal hit', 'PERC', { LEVEL: .4, SENDD: .3 }), L_('TOM', 'big kit/tom floor', 'PERC', { SENDR: .15 }),
  L_('CRASH', 'big kit/crash', 'CYMBAL', { LEVEL: .45 }), L_('BASS', 'lab/bass acid', 'KICK', { LEVEL: .55 }), L_('ZAP', 'designed/zap', 'PERC', { LEVEL: .45, SENDD: .35 }),
  L_('GHOST', 'studio kit/snare soft', 'SNARE', { LEVEL: .4 }), L_('TAMB', 'snares/tambourine', 'HAT', { LEVEL: .42 }), L_('RISER', 'lab/riser saw', 'PERC', { LEVEL: .4, SENDR: .3 }),
  L_('STAB', 'lab/stab rave', 'PERC', { LEVEL: .45, SENDD: .2 })];
KITS['RIOT MACHINE'] = [L_('KICK', 'lab/kick riot', 'KICK'), L_('SNARE', 'lab/snare riot', 'SNARE', { SENDR: .1 }), L_('CLAP', 'designed/clap stack', 'SNARE', { LEVEL: .5, SENDR: .2 }),
  L_('HAT', 'designed/hat metal closed', 'HAT', { CHOKE: 1, LEVEL: .5 }), L_('OPEN', 'designed/hat metal open', 'CYMBAL', { CHOKE: 1, LEVEL: .45 }), SND('BREAK A', 'brk', 'breaks/brk riot 136', 'BREAK', { DECAY: .3, ERA: 1, DRIVE: .35 }),
  SND('BREAK B', 'brk', 'breaks/brk funky 101', 'BREAK', { DECAY: .28, DRIVE: .25 }), L_('ANVIL', 'lab/metal anvil', 'PERC', { LEVEL: .4, SENDR: .2 }), L_('TOM', 'big kit/tom floor', 'PERC', { LEVEL: .5, DRIVE: .3 }),
  L_('CRASH', 'big kit/crash', 'CYMBAL', { LEVEL: .42 }), L_('BASS', 'lab/bass mono drive', 'KICK', { LEVEL: .5 }), L_('ZAP', 'lab/zap down', 'PERC', { LEVEL: .45 }),
  L_('GHOST', 'snares/snare 12 ghost', 'SNARE', { LEVEL: .4 }), L_('TAMB', 'rhythm box/tambourine', 'HAT', { LEVEL: .4 }), L_('RISER', 'lab/riser saw', 'PERC', { LEVEL: .42, SENDR: .3 }),
  L_('STAB', 'lab/stab rave', 'PERC', { LEVEL: .5, SENDR: .2 })];
KITS['ROBOT DISCO'] = [L_('KICK', 'lab/kick robot', 'KICK'), L_('CLAP', 'lab/clap robot', 'SNARE', { SENDR: .16 }), L_('SNARE', '80s studio/snare', 'SNARE', { LEVEL: .45, SENDR: .2 }),
  L_('HAT', 'lab/hat robot', 'HAT', { CHOKE: 1, LEVEL: .5 }), L_('OPEN', 'lab/hat robot open', 'CYMBAL', { CHOKE: 1, LEVEL: .45 }), SND('BREAK A', 'brk', 'breaks hifi/brk shuffle 96', 'BREAK', { DECAY: .3, CUT: .55 }),
  SND('BREAK B', 'brk', 'breaks/brk drummer 98', 'BREAK', { DECAY: .3, CUT: .6 }), L_('COWBELL', '80s studio/cowbell', 'PERC', { LEVEL: .38 }), L_('CONGA', '80s studio/conga', 'PERC', { LEVEL: .45, PAN: .35 }),
  L_('CRASH', '80s studio/crash', 'CYMBAL', { LEVEL: .35 }), L_('BASS', 'lab/bass robot', 'KICK', { LEVEL: .62 }), L_('ZAP', 'designed/zap', 'PERC', { LEVEL: .35, SENDD: .3 }),
  L_('RIM', '80s studio/stick', 'PERC', { LEVEL: .4, PAN: -.3 }), L_('CABASA', '80s studio/cabasa', 'HAT', { LEVEL: .38 }), L_('RISER', 'designed/noise riser', 'PERC', { LEVEL: .35, SENDR: .3 }),
  L_('STAB', 'lab/stab robot', 'PERC', { LEVEL: .45, SENDD: .25 })];
KITS['DIRTY VOLTAGE'] = [L_('KICK', 'lab/kick voltage', 'KICK'), L_('CLAP', 'lab/clap voltage', 'SNARE', { SENDR: .12 }), L_('SNARE', 'dfd pack/gambu snare', 'SNARE', { LEVEL: .5 }),
  L_('HAT', 'lab/hat voltage', 'HAT', { CHOKE: 1, LEVEL: .5 }), L_('OPEN', 'dfd pack/karl openhat', 'CYMBAL', { CHOKE: 1, LEVEL: .42 }), SND('BREAK A', 'brk', 'breaks hifi/brk tight 132', 'BREAK', { DECAY: .2, DRIVE: .3, CUT: .7 }),
  SND('BREAK B', 'brk', 'breaks/brk riot 136', 'BREAK', { DECAY: .2, ERA: 3 }), L_('METAL', 'lab/metal hit', 'PERC', { LEVEL: .38 }), L_('FM', 'dfd pack/quesa fm', 'PERC', { LEVEL: .42 }),
  L_('CRASH', 'dfd pack/dfd crash', 'CYMBAL', { LEVEL: .36 }), L_('BASS', 'lab/bass grit', 'KICK', { LEVEL: .58 }), L_('ZAP', 'dfd pack/polaris zap', 'PERC', { LEVEL: .42 }),
  L_('BLIP', 'lab/glitch blip', 'PERC', { LEVEL: .35 }), L_('TICK', 'dfd pack/architech hat', 'HAT', { LEVEL: .38 }), L_('DROP', 'lab/drop boom', 'KICK', { LEVEL: .55 }),
  L_('STAB', 'lab/stab dark', 'PERC', { LEVEL: .48, SENDD: .2 })];
// the two loudest kits sit a little lower in the mix, so the master is not driven into a wall (less fatigue, the same punch)
for (const k of ['CHEMICAL PRESSURE', 'RIOT MACHINE']) KITS[k] = KITS[k].map(x => SND(x.n, x.m, x.s, x.role, Object.assign({}, x.p, { LEVEL: (x.p.LEVEL ?? .72) * .66 })));
// two hybrid kits: one family's drums with another's bass and stabs (no new files)
KITS['DISCO VOLTAGE'] = KITS['ROBOT DISCO'].map((x, i) => [10, 15, 11].includes(i) ? KITS['DIRTY VOLTAGE'][i] : x);
KITS['FRACTAL BREAKS'] = KITS['HYPERBREAK'].map((x, i) => [3, 7, 8, 11, 15].includes(i) ? KITS['FRACTAL RHYTHM'][i] : x);
const HYBRID_KITS = ['DISCO VOLTAGE', 'FRACTAL BREAKS'];

// the keys the pitched parts play in: semitones from C (the bass samples are at C2)
const FAM_SCALE = { minor: [0, 3, 5, 7, 10], phryg: [0, 1, 3, 7, 8], dorian: [0, 2, 3, 7, 9, 10] };

// ------------------------------------------------------------------ the generators
function famGenerate(style, seed, c, b) {
  const r = RNG(seed ^ 0x5bd1e995), put = (t, s, vel, extra = {}) => setStep(b, t, s, Object.assign({ vel }, extra));
  const line = (t, str, v = {}) => g16(str).forEach((vel, s) => vel && put(t, s, vel, v));
  const pick = a => r.pick(a), ch = p => r.chance(p);
  const k0 = pick([0, 2, 3, 5, 7, 8, 10]), key = k0 > 6 ? k0 - 12 : k0, sc = FAM_SCALE[pick(['minor', 'minor', 'phryg', 'dorian'])];   // the key: F#..F around C
  const deg = (d, oct = 0) => key + sc[((d % sc.length) + sc.length) % sc.length] + 12 * (Math.floor(d / sc.length) + oct);
  const brk = (t, order, ratP, vel = 92) => { const ord = BREAK_ORDERS[order];
    for (let s = 0; s < 16; s++) { let sl = ord(s); if (ch(c * .35)) sl = r.int(32); const rat = ch(ratP) ? pick([2, 3, 4, 6]) : 1;
      put(t, s, vel + r.int(30), { slice: sl % 32, rat, rmode: rat > 1 ? pick([0, 1, 3]) : 0, rprob: 100 }); } };
  const ghost = (t, p, lo = 22) => { for (let s = 0; s < 16; s++) if (ch(p) && getStep(b, t, s).vel === 0 && s % 4) put(t, s, lo + r.int(20)); };
  switch (style) {
    case 'FRACTAL RHYTHM': {
      // a grid that is never quite square: the kick moves, the parts run at odd lengths, everything leans by a few %
      for (let s = 0; s < 16; s++) if (s === 0 || ch(.1 + c * .14)) put(0, s, 96 + r.int(31), { mic: s && ch(.4) ? r.int(24) - 12 : 0, prob: s === 0 ? 100 : 70 + r.int(30) });
      line(1, pick(['....X.......X...', '.....X......X...', '....X......X....']), { mic: pick([0, 4, -3]) });
      if (c > .45) for (let s = 0; s < 16; s++) if (ch(.08 + c * .1)) put(2, s, 50 + r.int(50), { rat: pick([3, 5, 6]), rmode: pick([1, 3, 5]), rprob: 60, pit: pick([0, 5, 7, 12]) });
      setTrkLen(b, 3, pick([7, 9, 11, 13])); for (let s = 0; s < 13; s++) if (ch(.5)) put(3, s, 30 + r.int(70), { prob: 55 + r.int(45), mic: r.int(16) - 8, rat: ch(c * .2) ? pick([2, 3]) : 1 });
      setTrkLen(b, 7, pick([5, 7])); for (let s = 0; s < 7; s++) if (ch(.45)) put(7, s, 50 + r.int(60), { pit: pick([0, 3, 7, 10, 12, 15, 19]) });
      setTrkLen(b, 8, pick([6, 10, 12])); setTrkSpeed(b, 8, pick([1, 3])); for (let s = 0; s < 12; s++) if (ch(.3)) put(8, s, 50 + r.int(50), { pit: pick([-5, 0, 2, 7]) });
      setTrkDir(b, 9, pick([2, 3])); for (let s = 0; s < 16; s++) if (ch(.18)) put(9, s, 40 + r.int(50));
      for (let s = 0; s < 16; s++) if (ch(.12 + c * .25)) put(5, s, 70 + r.int(50), { slice: r.int(32), rat: ch(c * .3) ? pick([2, 3, 4]) : 1, rmode: pick([0, 2, 4]) });
      // the sub: a few long notes, fragile against the noise
      [0, 6, 10].forEach(s => ch(.7) && put(10, s, 90, { pit: deg(pick([0, 0, 2, 4]) , 0) }));
      for (let s = 0; s < 16; s++) if (ch(.1 * c + .05)) put(11, s, 50 + r.int(40), { rat: pick([1, 2, 8]), rmode: 5, rprob: 60 });
      for (let s = 0; s < 16; s++) if (ch(.15)) put(12, s, 30 + r.int(40), { mic: r.int(30) - 15 });
      setTrkLen(b, 15, pick([10, 14])); for (let s = 0; s < 14; s++) if (ch(.22)) put(15, s, 60 + r.int(40), { pit: deg(r.int(8)) });
      if (c > .75) { setTrkSpeed(b, 13, 2); for (let s = 0; s < 16; s++) if (ch(.4)) put(13, s, 30 + r.int(50), { prob: 60 }); }
      break; }
    case 'HYPERBREAK': {
      line(0, pick(['X.........X.....', 'X.....X...X.....', 'X..X......X..X..']));
      line(1, '....X.......X...');
      brk(5, pick(['jungle', 'think', 'roll']), .25 + c * .4);
      for (let s = 0; s < 16; s++) if (ch(.25 + c * .35)) put(6, s, 80 + r.int(40), { slice: r.int(32), rat: pick([1, 2, 3, 4, 6, 8]), rmode: pick([0, 1, 3, 4]), rprob: 50 + r.int(50), pit: pick([0, 0, 2, 5, 7, -3, 12]) });
      for (let s = 0; s < 16; s++) if (ch(.18 + c * .25)) put(2, s, 60 + r.int(60), { rat: pick([2, 3, 4, 6, 8]), rmode: pick([1, 3, 5]), pit: pick([0, 2, 4, 7, 12]) });
      setTrkSpeed(b, 3, ch(.5) ? 2 : 1); for (let s = 0; s < 16; s++) if (ch(.45 + c * .2)) put(3, s, 35 + r.int(60));
      ghost(7, .25 + c * .2);
      // an articulate sub line: short notes, octave leaps, slides of pitch with ratchets
      for (let s = 0; s < 16; s++) if (s === 0 || ch(.28 + c * .2)) put(10, s, 85 + r.int(35), { pit: deg(pick([0, 0, 1, 2, 3, 4]), ch(.25) ? 1 : 0), rat: ch(c * .25) ? 2 : 1, rmode: 3 });
      if (c > .4) { setTrkLen(b, 8, pick([5, 6, 7])); for (let s = 0; s < 7; s++) if (ch(.4)) put(8, s, 60 + r.int(50), { pit: pick([0, 3, 5, 7]) }); }
      if (c > .5) { put(12, 14, 80, { rat: 6, rmode: 1 }); put(12, 15, 95, { rat: 8, rmode: 3 }); }
      if (c > .7) { setTrkSpeed(b, 13, 2); for (let s = 0; s < 16; s++) if (ch(.5)) put(13, s, 30 + r.int(50)); }
      put(14, 0, 70, { cond: 6 }); line(9, pick(['x...x...x...x...', '................']), { prob: 70 });
      for (let s = 0; s < 16; s++) if (ch(.06)) put(15, s, 60, { pit: deg(r.int(5)) });
      break; }
    case 'CHEMICAL PRESSURE': {
      line(0, pick(['X.....X...X.....', 'X.........X..X..', 'X..X......X.....', 'X.....X.X.....X.']));
      line(1, '....X.......X...'); line(2, '....X.......X...');
      brk(5, pick(['straight', 'stab', 'think']), c * .2, 100);
      if (ch(.5 + c * .3)) for (let s = 0; s < 16; s++) if (getStep(b, 0, s).vel || ch(.2)) put(6, s, 85 + r.int(30), { slice: (s * 2) % 32 });
      line(3, pick(['x.x.x.x.x.x.x.x.', 'xoxoxoxoxoxoxoxo'])); line(13, 'oxoxoxoxoxoxoxox', { prob: 85 });
      if (ch(.6)) line(4, '..............x.');
      for (let s = 0; s < 16; s++) if (ch(.08 + c * .12)) put(7, s, 70 + r.int(40), { pit: pick([0, 5, 7]) });
      if (c > .35) { put(8, 12, 80); put(8, 13, 90); put(8, 14, 100, { pit: -3 }); put(8, 15, 110, { pit: -5 }); }
      put(9, 0, 90, { cond: 6 });
      // the acid bass answers the kick
      for (let s = 0; s < 16; s++) if ((s % 4 === 2 || s % 8 === 7) && ch(.6)) put(10, s, 90 + r.int(30), { pit: deg(pick([0, 0, 1, 2, 4])) });
      if (ch(.5)) put(11, pick([7, 11, 15]), 90);
      ghost(12, .12 + c * .2);
      put(14, 0, 80, { cond: 9 });                                                       // the riser on the 4th of every 4 loops
      for (let s = 0; s < 16; s++) if (s % 8 === 6 && ch(.6)) put(15, s, 90, { pit: deg(pick([0, 2])) });
      if (c > .65) put(1, 15, 70, { rat: 4, rmode: 1 });
      break; }
    case 'RIOT MACHINE': {
      line(0, pick(['X...X...X...X...', 'X.....X...X...X.', 'X...X...X..X.X..']));
      line(1, pick(['....X.......X...', '....X.......X..X'])); if (ch(.6)) line(2, '....X.......X...');
      brk(5, pick(['straight', 'roll', 'jungle']), c * .3, 100);
      for (let s = 0; s < 16; s++) if (ch(.2 + c * .3)) put(6, s, 85 + r.int(35), { slice: r.int(32), rat: ch(c * .3) ? pick([2, 4]) : 1 });
      line(3, '..x...x...x...x.'); line(4, pick(['..X...X...X...X.', '..x.......x.....']));
      for (let s = 0; s < 16; s++) if (ch(.07 + c * .1)) put(7, s, 90 + r.int(30), { pit: pick([0, -5, 7]) });
      put(9, 0, 100, { cond: 6 });
      // the stab: offbeat hits on a minor chord shape; the bass doubles the root under the kick
      const stab = pick(['..X...X...X...X.', '...X..X....X..X.', '..X..X..X..X..X.']);
      g16(stab).forEach((v, s) => v && put(15, s, 100, { pit: deg(pick([0, 0, 0, 3])) }));
      for (let s = 0; s < 16; s += 4) if (ch(.55)) put(10, s + pick([0, 2, 3]), 95, { pit: deg(0) });
      if (ch(.6)) put(11, pick([6, 14]), 95);
      for (let s = 0; s < 16; s++) if (ch(.4)) put(13, s, 40 + r.int(40));
      put(14, 0, 85, { cond: 9 });
      if (c > .6) { put(12, 13, 70, { rat: 3 }); put(12, 14, 85, { rat: 4, rmode: 1 }); put(12, 15, 100, { rat: 6, rmode: 1 }); }
      break; }
    case 'ROBOT DISCO': {
      line(0, 'X...X...X...X...'); line(1, '....X.......X...');
      if (c > .3) line(2, '....x.......x...', { prob: 60 });
      line(3, pick(['..x...x...x...x.', '.ox..ox..ox..ox.', 'oxoxoxoxoxoxoxox'])); line(4, '..x...x...x...x.', { prob: c > .5 ? 80 : 100 });
      // the elastic bass: root on the off-beat, octave jumps, a 7th, sometimes the 5th; tuned to the key
      const shape = pick(['..X..XX...X..X.X', '..X.X..X..X.X..X', 'X..X..X...X..XX.', '..XX..X...XX..X.']);
      g16(shape).forEach((v, s) => { if (!v) return; const d = pick([0, 0, 0, 3, 4, 5]); put(10, s, 85 + r.int(35), { pit: deg(d, d === 5 ? 0 : (ch(.25) ? 1 : 0)) }); });
      // stabs: a chord on the and of a beat, filter-house style
      g16(pick(['......X.......X.', '..X.......X.....', '...X......X..X..'])).forEach((v, s) => v && put(15, s, 90, { pit: deg(pick([0, 0, 2])) }));
      for (let s = 0; s < 16; s++) if (s % 4 === 3 && ch(.35)) put(7, s, 60 + r.int(30));
      for (let s = 0; s < 16; s++) if (ch(.18 + c * .15)) put(8, s, 55 + r.int(40), { pit: pick([0, 0, 5, 7]) });
      line(13, 'xoxoxoxoxoxoxoxo', { prob: 80 }); line(12, pick(['...x......x.....', '.......x.......x']));
      if (c > .55) for (let s = 0; s < 16; s++) if (ch(.18)) put(5, s, 60 + r.int(30), { slice: r.int(32) });
      put(9, 0, 80, { cond: 6 }); put(14, 0, 70, { cond: 9 });
      break; }
    case 'DIRTY VOLTAGE': {
      line(0, pick(['X...X...X...X...', 'X...X...X...X..x', 'X...X...X..XX...']));
      line(1, '....X.......X...'); line(2, '....X.......X...', { prob: 100 });
      line(3, pick(['xoxoxoxoxoxoxoxo', 'x.xox.xox.xox.xo', 'oxoxoxoxoxoxoxox'])); line(4, '..x...x...x...x.', { prob: 70 });
      // the bass: a rolling, syncopated mono line off the kick, octave stabs, the odd flat 2nd for menace
      const rolls = pick(['.XXX.XXX.XXX.XXX', '..XX..XX..XX..XX', '.X.X.XX..X.X.XX.', '..X..X.X..X..XXX']);
      g16(rolls).forEach((v, s) => { if (!v) return; const d = ch(.15) ? 1 : 0; put(10, s, 80 + r.int(40) + (s % 4 === 1 ? 0 : 10), { pit: deg(d === 1 && ch(.5) ? 1 : 0, ch(.18) ? 1 : 0) }); });
      // short dark chords on the syncopations; a gate on the off-beat hats
      g16(pick(['...X..X.......X.', '......X..X....X.', '..X.......X..X..'])).forEach((v, s) => v && put(15, s, 95, { pit: deg(pick([0, 0, 1, 3])) }));
      for (let s = 0; s < 16; s++) if (ch(.08 + c * .14)) put(12, s, 60 + r.int(40), { rat: pick([2, 3, 4, 8]), rmode: pick([0, 5]), rprob: 70 });
      for (let s = 0; s < 16; s++) if (s % 4 === 2 && ch(.25)) put(7, s, 60 + r.int(30), { pit: pick([0, 7]) });
      if (ch(.5)) put(11, pick([7, 15]), 90); if (ch(.35)) put(8, pick([3, 11]), 80, { pit: pick([0, 5]) });
      line(13, '.x.x.x.x.x.x.x.x', { prob: 60 });
      put(9, 0, 80, { cond: 6 }); put(14, 0, 95, { cond: 9 });
      if (c > .55) for (let s = 0; s < 16; s++) if (ch(.15)) put(5, s, 60 + r.int(30), { slice: r.int(32), rat: pick([1, 2]) });
      if (c > .75) { put(1, 15, 80, { rat: 4, rmode: 1 }); put(2, 14, 70, { rat: 3 }); }
      break; }
  }
  // complexity: extra life, but the kick and the snare keep the groove (the way back is always there)
  if (c > .25) for (let t = 2; t < NT; t++) for (let s = 0; s < 16; s++) { const st = getStep(b, t, s); if (!st.vel || t === 10 || t === 15) continue;
    if (ch(c * .12)) setStep(b, t, s, { prob: 60 + r.int(35) });
    if ((t === 3 || t === 12 || t === 13) && ch(c * .25)) setStep(b, t, s, { mic: r.int(14) - 7 }); }
  return b;
}
{ const base = generate;
  generate = function (style, seed, complexity, bytes) {
    if (!STYLES[style] || !STYLES[style].fam) return base(style, seed, complexity, bytes);
    const b = bytes || patNew();
    for (let t = 0; t < NT; t++) { for (let s = 0; s < NS; s++) clearStep(b, t, s); setTrkLen(b, t, 16); setTrkSpeed(b, t, 1); setTrkDir(b, t, 0); }
    b[0] = 16; b[1] = 0;
    return famGenerate(style, seed, complexity, b);
  }; }

// ------------------------------------------------------------------ 36 named starting patterns: six per family (simple · complex · extreme)
const FAM_PATTERNS = {
  'FRACTAL RHYTHM':    [['GLASS STAIRS', 4111, .22], ['PRIME GARDEN', 4127, .3], ['TIDAL CLOCK', 4153, .55], ['BROKEN ORRERY', 4159, .62], ['SHATTER WALTZ', 4177, .88], ['NEGATIVE SPACE', 4201, .95]],
  'HYPERBREAK':        [['CHROME RUNNER', 5101, .25], ['FERRITE', 5113, .32], ['SPLIT SECOND', 5119, .55], ['GEARBOX JAZZ', 5147, .6], ['FLUX OVERRUN', 5153, .88], ['NINE HANDS', 5167, .97]],
  'CHEMICAL PRESSURE': [['BLOCK PARTY 99', 6101, .22], ['VAT STOMP', 6113, .3], ['REAGENT', 6121, .5], ['WAREHOUSE SUN', 6133, .6], ['FUME CHAMBER', 6143, .85], ['CATALYST', 6151, .93]],
  'RIOT MACHINE':      [['BARRICADE', 7103, .22], ['SIREN DUST', 7109, .3], ['STEEL MARCH', 7121, .52], ['RIOT ACT', 7127, .6], ['FLARE STORM', 7151, .85], ['NO CURFEW', 7159, .95]],
  'ROBOT DISCO':       [['CHROME BOOGIE', 8101, .2], ['TIN HEART', 8111, .28], ['VELVET CIRCUIT', 8117, .5], ['MIRRORBALL OS', 8123, .58], ['SERVO FUNK', 8147, .82], ['LATE SHIFT', 8161, .9]],
  'DIRTY VOLTAGE':     [['LIVE WIRE', 9103, .22], ['GROUND LOOP', 9109, .3], ['OVERCURRENT', 9127, .52], ['ARC FLASH', 9133, .6], ['MELTDOWN', 9151, .86], ['BLACKOUT', 9157, .96]],
};
const FAM_LEVELS = ['simple', 'simple', 'complex', 'complex', 'extreme', 'extreme'];
function famPatternBPM(fam, i) { const st = STYLES[fam], [n, seed] = FAM_PATTERNS[fam][i]; void n; const r = RNG(Math.imul(seed, 2654435761) ^ 0x9e3779b9); r(); return Math.round(st.bpm[0] + r() * (st.bpm[1] - st.bpm[0])); }
// A (the pattern), B (a variation one step more complex), and a fill: three patterns for one starting point
function famPatternSet(fam, i) { const [, seed, c] = FAM_PATTERNS[fam][i]; const A = generate(fam, seed, c), B = vary(generate(fam, seed + 7, Math.min(1, c + .15)), seed + 3, .35), F = makeFill(A, seed + 5);
  return { A, B, F }; }
