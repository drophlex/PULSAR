// dumps the 36 family patterns (A, B, fill) with their kits' parameters for test/lab_render.cpp
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(fs.readFileSync(root + '/sounds/manifest.json'));
const ctx = { console, Math, JSON, Object, Array, Uint8Array, Float32Array, Number, String, Date };
vm.createContext(ctx);
const src = 'var ES = {};\n' + fs.readFileSync(root + '/ui/model.js', 'utf8') + '\n' + fs.readFileSync(root + '/ui/families.js', 'utf8') + `
var DEF = { MODE: 0, SYN: 0, SMP: -1, TUNE: 0, DECAY: .5, TONE: .5, SNAP: .5, DRIVE: 0, ERA: 0, STRETCH: 1, START: 0, REV: 0, CUT: 1, RES: .1, FTYPE: 0, LEVEL: .72, PAN: 0, SENDR: 0, SENDD: 0, CHOKE: 0, DUCK: 0, SWING: 0, ROLE: 3, ATK: 0 };
function kitParams(name, idx) { const P = {}; KITS[name].forEach((spec, t) => { const p = Object.assign({}, DEF);
  p.MODE = spec.m === 'syn' ? 0 : spec.m === 'smp' ? 1 : 2; p.ROLE = ROLES.indexOf(spec.role); if (p.ROLE < 0) p.ROLE = 3;
  if (spec.m === 'syn') p.SYN = SYN[spec.s] || 0; else { p.SMP = idx[spec.s] ?? -1; p.DECAY = spec.m === 'brk' ? .35 : 1; if (p.SMP < 0) throw new Error('missing sound ' + spec.s); }
  if (p.ROLE === 4) p.DUCK = .25; const pans = { 3: -.18, 4: .2, 7: -.3, 8: .3, 9: .25, 11: -.2, 13: .35, 15: -.35 }; if (pans[t]) p.PAN = pans[t];
  Object.assign(p, spec.p || {}); for (const [k, v] of Object.entries(p)) P[TPID(t, T[k])] = v; }); return P; }
var OUT = { families: FAMILIES, patterns: [] };
var IDX = {}; MAN.forEach((m, i) => IDX[m.id] = i);
for (const fam of [...FAMILIES]) { const st = STYLES[fam], kp = kitParams(fam, IDX);
  FAM_PATTERNS[fam].forEach((p, i) => { const set = famPatternSet(fam, i);
    const g = {}; g[G.BPM] = famPatternBPM(fam, i); g[G.SWING] = st.swing; g[G.DRIVE] = st.drive; g[G.COMP] = st.comp; g[G.HUMAN] = st.human; g[XGID(5)] = st.dv;
    const duck = {}; if (st.duck) for (const t of [3, 4, 5, 6, 10, 13, 15]) duck[TPID(t, T.DUCK)] = st.duck;
    OUT.patterns.push({ fam, name: p[0], level: FAM_LEVELS[i], params: Object.assign({}, kp, g, duck), A: [...set.A], B: [...set.B], F: [...set.F] }); }); }
for (const k of HYBRID_KITS) kitParams(k, IDX);
if (CLASSIC) { OUT.patterns = []; for (const sty of Object.keys(STYLES).filter(k => !STYLES[k].fam)) { const st = STYLES[sty], kp = kitParams(STYLE_KIT[sty] || sty, IDX);
  const g = {}; g[G.BPM] = Math.round((st.bpm[0] + st.bpm[1]) / 2); g[G.SWING] = st.swing; g[G.DRIVE] = st.drive; g[G.COMP] = st.comp; g[G.HUMAN] = st.human;
  const A = generate(sty, 1234, .5); OUT.patterns.push({ fam: sty, name: 'seed 1234', level: 'classic', params: Object.assign({}, kp, g), A: [...A], B: [...vary(A, 5, .4)], F: [...makeFill(A, 6)] }); } }
`;
ctx.MAN = man; ctx.CLASSIC = process.argv.includes('--classic'); vm.runInContext(src, ctx);
fs.writeFileSync('/tmp/lab.json', JSON.stringify({ sounds: man.map(m => ({ id: m.id, bpm: m.bpm || 0, slices: m.slices || 16 })), ...ctx.OUT }));
console.log('dumped', ctx.OUT.patterns.length, 'patterns, pattern bytes', ctx.OUT.patterns[0].A.length);
// the same as a flat binary for the C++ renderer: sounds (path, bpm, slices), then per pattern: name, params (id, value), A, B, F
{ const parts = []; const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); parts.push(b); }, f32 = x => { const b = Buffer.alloc(4); b.writeFloatLE(x); parts.push(b); },
  str = s => { const b = Buffer.from(s, 'utf8'); u32(b.length); parts.push(b); };
  u32(man.length); for (const m of man) { str(m.id); f32(m.bpm || 0); u32(m.slices || 16); }
  u32(ctx.OUT.patterns.length);
  for (const p of ctx.OUT.patterns) { str(p.fam + ' / ' + p.name + ' (' + p.level + ')'); const e = Object.entries(p.params); u32(e.length); for (const [k, v] of e) { u32(+k); f32(+v); }
    for (const x of [p.A, p.B, p.F]) { u32(x.length); parts.push(Buffer.from(x)); } }
  fs.writeFileSync('/tmp/lab.bin', Buffer.concat(parts)); }
