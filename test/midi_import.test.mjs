// PULSAR 3 · MIDI file import (ui/lab.js parseSMF / midiToPattern): format 0 and 1, running status, meta and SysEx skipped,
// any PPQ, tempo, note-off as note-on velocity 0, GM drums and PULSAR's own pads, quantize + micro timing, 64-step limit, bad files.
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, JSON, Object, Array, Uint8Array, Float32Array, Number, String, Error, RNG: null, LS: { get: () => null, set: () => {} } };
vm.createContext(ctx);
vm.runInContext('var ES = {};\n' + fs.readFileSync(root + '/ui/model.js', 'utf8') + '\nvar PARAMS = new Float32Array(P_COUNT);\n' + fs.readFileSync(root + '/ui/families.js', 'utf8') + '\n' +
  fs.readFileSync(root + '/ui/lab.js', 'utf8').replace('window.Lab = Lab;', '') + '\nthis.parseSMF = parseSMF; this.midiToPattern = midiToPattern; this.getStep = getStep; this.trkLen = trkLen;', ctx);
let fails = 0; const ok = (what, c) => { console.log((what + ' ').padEnd(72, '.') + (c ? ' ok' : ' FAIL')); if (!c) fails++; };
const vlq = n => { const o = [n & 127]; while ((n >>= 7)) o.unshift((n & 127) | 128); return o; };
const trk = ev => { const b = []; let last = 0; for (const [t, ...bytes] of ev) { if (t < last) throw new Error('test: events out of order'); b.push(...vlq(t - last), ...bytes); last = t; } b.push(0, 0xff, 0x2f, 0); return [0x4d, 0x54, 0x72, 0x6b, b.length >> 24 & 255, b.length >> 16 & 255, b.length >> 8 & 255, b.length & 255, ...b]; };
const smf = (fmt, ppq, tracks) => new Uint8Array([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, fmt, 0, tracks.length, ppq >> 8, ppq & 255, ...tracks.flat()]);
// format 0, PPQ 96, tempo 128 BPM, kick on the beats, snare on 2 and 4 (running status, note-offs as vel 0), a SysEx and a text meta in between
const us = Math.round(60000000 / 128);
// (times are absolute ticks; a 1/16 = 24 ticks; running status after the first 0x99)
const f0 = smf(0, 96, [trk([[0, 0xff, 0x51, 3, us >> 16 & 255, us >> 8 & 255, us & 255], [0, 0xff, 0x01, 4, 65, 66, 67, 68], [0, 0xf0, 3, 1, 2, 0xf7],
  [0, 0x99, 36, 120], [10, 36, 0], [96, 36, 110], [96, 38, 100], [106, 36, 0], [110, 38, 0], [192, 36, 115], [200, 0x89, 36, 0], [288, 0x99, 36, 118], [288, 38, 101], [300, 0x89, 38, 0]])]);
const a = ctx.parseSMF(f0);
ok('format 0: parsed, tempo 128 BPM', a.format === 0 && a.bpm === 128);
ok('format 0: 6 note-ons (running status, vel-0 note-offs not counted)', a.notes.length === 6);
const p = ctx.midiToPattern(a, 'gm');
ok('GM: kick on steps 1, 5, 9, 13', [0, 4, 8, 12].every(s => ctx.getStep(p.bytes, 0, s).vel > 0) && ctx.getStep(p.bytes, 0, 2).vel === 0);
ok('GM: snare (38) on the snare track at steps 5 and 13', ctx.getStep(p.bytes, 1, 4).vel === 100 && ctx.getStep(p.bytes, 1, 12).vel === 101);
ok('length: 16 steps', p.steps === 16 && ctx.trkLen(p.bytes, 0) === 16);
// format 1, PPQ 480, two tracks (tempo map + drums), an off-grid hat (micro timing), notes past 64 steps dropped
const ppq = 480, st = ppq / 4;
const f1 = smf(1, ppq, [trk([[0, 0xff, 0x51, 3, 0x07, 0xa1, 0x20]]), trk([[0, 0x99, 42, 90], [st + 30, 0x99, 42, 80], [st * 40, 0x99, 46, 70], [st * 70, 0x99, 36, 100], [st * 70 + 5, 0x99, 99, 100]])]);
const b = ctx.parseSMF(f1), q = ctx.midiToPattern(b, 'gm');
ok('format 1, PPQ 480: 120 BPM from the tempo track', b.bpm === 120 && b.ppq === 480);
ok('an off-grid note keeps its offset as micro timing (+25 %)', ctx.getStep(q.bytes, 3, 1).vel === 80 && ctx.getStep(q.bytes, 3, 1).mic === 25);
ok('step 41 in a 48-step pattern; past 64 steps and unknown notes skipped', ctx.getStep(q.bytes, 4, 40).vel === 70 && q.steps === 48 && q.skipped === 2);
// PULSAR's own pads (36-51 -> tracks 1-16)
const f2 = smf(0, 96, [trk([[0, 0x90, 51, 100], [24, 0x90, 40, 90]])]), r = ctx.midiToPattern(ctx.parseSMF(f2), 'pads');
ok('pads mode: note 51 -> track 16, note 40 -> track 5', ctx.getStep(r.bytes, 15, 0).vel === 100 && ctx.getStep(r.bytes, 4, 1).vel === 90);
// bad files are refused with a reason, never silently
const bad = (what, bytes, re) => { try { ctx.parseSMF(bytes); ok(what, false); } catch (e) { ok(what + ' (' + e.message + ')', re.test(e.message)); } };
bad('not a MIDI file', new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]), /MThd/);
bad('format 2 refused', smf(2, 96, [trk([])]), /format 2/);
bad('SMPTE time refused', new Uint8Array([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0xe7, 0x28, ...trk([])]), /SMPTE/);
bad('a data byte with no status', smf(0, 96, [[0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 4, 0, 36, 100, 0]]), /status/);
console.log(fails ? `midi_import FAILED (${fails})` : 'midi_import ok'); process.exit(fails ? 1 : 0);
