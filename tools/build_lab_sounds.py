#!/usr/bin/env python3
"""PULSAR 3 · the DFD LIVE LAB sounds: every one synthesized here from code (numpy, fixed seeds), plus the 14 one-shots of the
DFD LIVE PACK. Writes sounds/lab/*.wav and sounds/dfd pack/*.wav (44.1 kHz mono 16-bit) and APPENDS them to sounds/manifest.json
(appending keeps every older sound's number, so projects and kits stay as they were). Run again: it replaces its own entries.
Also writes sounds/lab/MANIFEST-LAB.json: for each sound its file, how it was made (generator, parameters, seed), length, rate,
licence and that no third-party audio went into it.
    python3 tools/build_lab_sounds.py [path/to/PULSAR_FM1_LIVE_PACK/extension/sounds/dfd]"""
import json, sys, wave, pathlib
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]
SND = ROOT / 'sounds'
OUT_SR = 44100
OS = 4                      # PULSAR 3.4: everything is made at 4 x 44.1 kHz and filtered down, so the saws, squares, noise
SR = OUT_SR * OS            # and every tanh stay clean (made at 44.1 kHz they folded back as hiss and grit over the whole mix)
LIC = 'CC0'
SRC = 'PULSAR 3 synthesis (tools/build_lab_sounds.py)'
lab = []

def t(sec): return np.arange(int(sec * SR)) / SR
def env(sec, a=0.001, d=0.2, shape=1.0):
    x = t(sec); e = np.minimum(1, x / max(a, 1e-4)) * np.exp(-np.maximum(0, x - a) / max(d, 1e-4)) ** shape
    return e
def sweep(sec, f0, f1, k):  # exponential pitch fall f0 -> f1 with time constant k
    x = t(sec); f = f1 + (f0 - f1) * np.exp(-x / k); return 2 * np.pi * np.cumsum(f) / SR
def lp(x, fc):              # one-pole low-pass, fc may be an array
    fc = np.broadcast_to(np.asarray(fc, float), x.shape); a = 1 - np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); z = 0.0
    for i in range(len(x)): z += (x[i] - z) * a[i]; y[i] = z
    return y
def hp(x, fc): return x - lp(x, fc)
def bp(x, fc, q=1.0): return hp(lp(x, fc * (1 + 0.5 / q)), fc / (1 + 0.5 / q))
def svf(x, fc, res):        # resonant 2-pole state-variable low-pass, fc array
    fc = np.broadcast_to(np.asarray(fc, float), x.shape); y = np.zeros_like(x); l = b = 0.0; q = 1 - res * 0.97
    for i in range(len(x)):
        f = 2 * np.sin(np.pi * min(fc[i], SR / 6) / SR); h = x[i] - l - q * b; b += f * h; l += f * b; y[i] = l
    return y
def saw(f, sec, ph=0.0): p = (np.cumsum(np.broadcast_to(np.asarray(f, float), t(sec).shape)) / SR + ph) % 1; return 2 * p - 1
def sqr(f, sec, pw=0.5): p = (np.cumsum(np.broadcast_to(np.asarray(f, float), t(sec).shape)) / SR) % 1; return np.where(p < pw, 1.0, -1.0)
def noise(sec, seed): return np.random.default_rng(seed).uniform(-1, 1, len(t(sec)))
def drive(x, g): return np.tanh(x * g) / np.tanh(g)
def fit(x, peak=0.92):
    x = x - np.mean(x[: min(len(x), 64)]) * 0  # (no DC shift: the generators are DC-free)
    n = len(x); fade = int(0.004 * OUT_SR); x = x.copy(); x[-fade:] *= np.linspace(1, 0, fade)
    m = np.max(np.abs(x)) or 1; return x / m * peak

def down(x):                # 4 x -> 44.1 kHz through a long low-pass (flat to 19 kHz)
    from scipy.signal import resample_poly
    return resample_poly(x, 1, OS, window=('kaiser', 10.0))
def save(group, name, x, cat, how, extra=None, made_here=True):
    d = SND / group; d.mkdir(parents=True, exist_ok=True)
    y = np.clip(fit(down(x) if made_here else x), -1, 1); pcm = (y * 32767).astype('<i2')
    with wave.open(str(d / f'{name}.wav'), 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(OUT_SR); w.writeframes(pcm.tobytes())
    e = {'id': f'{group}/{name}', 'group': group, 'name': name, 'cat': cat, 'len': round(len(y) / OUT_SR, 3), 'src': SRC, 'lic': LIC}
    if extra: e.update(extra)
    lab.append((e, {'file': f'sounds/{group}/{name}.wav', 'made_by': how, 'seconds': e['len'], 'rate': OUT_SR, 'bits': 16, 'channels': 1,
                    'licence': LIC, 'third_party_audio': False}))

# ---------------------------------------------------------------- kicks
def kick(sec, f0, f1, k, click, sat, body_d, seed):
    ph = sweep(sec, f0, f1, k); b = np.sin(ph) * env(sec, 0.0005, body_d)
    c = lp(hp(noise(0.012, seed), 1800), 12000) * env(0.012, 0.0002, 0.003) * click
    b[: len(c)] += c
    return drive(b, sat)
save('lab', 'kick riot', kick(0.55, 260, 46, 0.03, 0.9, 6.0, 0.16, 1) + 0.25 * drive(hp(noise(0.55, 2), 300) * env(0.55, 0.0005, 0.03), 3), 'kick',
     'kick(): sine 260->46 Hz (k 30 ms), click, tanh x6, + distorted noise burst; seeds 1, 2')
save('lab', 'kick voltage', kick(0.42, 180, 50, 0.022, 1.2, 3.5, 0.14, 3), 'kick', 'kick(): sine 180->50 Hz (k 22 ms), hard click, tanh x3.5 (dense, short); seed 3')
save('lab', 'kick robot', kick(0.5, 140, 52, 0.035, 0.35, 1.6, 0.2, 4), 'kick', 'kick(): sine 140->52 Hz (k 35 ms), soft click, round (disco); seed 4')
save('lab', 'kick pressure', kick(0.7, 220, 42, 0.05, 0.6, 2.6, 0.3, 5), 'kick', 'kick(): sine 220->42 Hz (k 50 ms), long body, tanh x2.6 (big beat boom); seed 5')
save('lab', 'kick fractal', kick(0.22, 400, 70, 0.012, 1.0, 2.0, 0.05, 6), 'kick', 'kick(): sine 400->70 Hz (k 12 ms), very short (braindance tick-kick); seed 6')
# ---------------------------------------------------------------- snares, claps
def snare(sec, tone_f, nd, seed, crack=1.0, sat=2.0):
    x = t(sec); tone = np.sin(2 * np.pi * tone_f * x + 3 * np.exp(-x / 0.01)) * env(sec, 0.0005, 0.05)
    n = bp(noise(sec, seed), 3500, 0.7) * env(sec, 0.0008, nd) * crack
    return drive(tone * 0.6 + n, sat)
save('lab', 'snare riot', snare(0.35, 190, 0.09, 11, 1.4, 5.0), 'snare', 'snare(): 190 Hz body + band-passed noise (90 ms), tanh x5; seed 11')
save('lab', 'snare pressure', snare(0.42, 170, 0.14, 12, 1.1, 2.4), 'snare', 'snare(): 170 Hz body + noise (140 ms), tanh x2.4 (big crack); seed 12')
def clap(sec, seed, bursts=3, gap=0.011, tail=0.12, f=1400):
    n = bp(noise(sec, seed), f, 0.9); e = np.zeros(len(n)); x = t(sec)
    for k in range(bursts): e += np.exp(-np.maximum(0, x - k * gap) / 0.004) * (x >= k * gap)
    e += np.exp(-np.maximum(0, x - bursts * gap) / tail) * (x >= bursts * gap) * 0.8
    return n * e
save('lab', 'clap robot', clap(0.4, 21, 3, 0.010, 0.10, 1300), 'snare', 'clap(): 3 noise bursts 10 ms apart, band-pass 1.3 kHz, 100 ms tail; seed 21')
save('lab', 'clap voltage', drive(clap(0.32, 22, 4, 0.008, 0.06, 1800), 3), 'snare', 'clap(): 4 bursts 8 ms, 1.8 kHz, short gated tail, tanh x3; seed 22')
# ---------------------------------------------------------------- hats, metal
def hat(sec, d, seed, f=8000): return hp(noise(sec, seed), f) * env(sec, 0.0003, d)
save('lab', 'hat robot', hat(0.12, 0.025, 31, 7000), 'hat', 'hat(): noise high-passed at 7 kHz, 25 ms decay; seed 31')
save('lab', 'hat robot open', hat(0.5, 0.16, 32, 6500), 'cymbal', 'hat(): noise high-passed at 6.5 kHz, 160 ms decay; seed 32')
save('lab', 'hat voltage', drive(hat(0.08, 0.014, 33, 9000), 2), 'hat', 'hat(): 9 kHz, 14 ms, tanh x2; seed 33')
def metal(sec, f, d, ratios=(1, 1.48, 1.91, 2.53, 3.11, 4.17)):
    x = t(sec); y = sum(np.sign(np.sin(2 * np.pi * f * r * x)) for r in ratios) / len(ratios); return hp(y, 2000) * env(sec, 0.0005, d)
save('lab', 'metal hit', metal(0.6, 410, 0.12), 'perc', 'metal(): six square partials at inharmonic ratios from 410 Hz, high-passed, 120 ms')
save('lab', 'metal anvil', drive(metal(0.9, 290, 0.25, (1, 1.33, 2.07, 2.71, 3.73)), 2.5), 'perc', 'metal(): five partials from 290 Hz, 250 ms, tanh x2.5')
def tick(sec, seed): x = noise(sec, seed) * env(sec, 0.0001, 0.002); return lp(hp(x, 3000), 14000)
save('lab', 'tick fractal', tick(0.05, 41), 'perc', 'tick(): 2 ms noise click high-passed at 3 kHz; seed 41')
def fmperc(sec, fc, ratio, idx, d):
    x = t(sec); m = np.sin(2 * np.pi * fc * ratio * x) * idx * env(sec, 0.0005, d * 0.5); return np.sin(2 * np.pi * fc * x + m) * env(sec, 0.0005, d)
save('lab', 'fm glass', fmperc(0.35, 880, 3.53, 4, 0.08), 'perc', 'fmperc(): 880 Hz carrier, ratio 3.53, index 4, 80 ms')
save('lab', 'fm knock', fmperc(0.25, 220, 1.41, 6, 0.05), 'perc', 'fmperc(): 220 Hz, ratio 1.41, index 6, 50 ms')
# ---------------------------------------------------------------- effects: zaps, risers, drops
x = t(0.35); save('lab', 'zap down', np.sin(sweep(0.35, 3000, 80, 0.05)) * env(0.35, 0.0005, 0.12), 'perc', 'sine 3 kHz->80 Hz (k 50 ms), 120 ms')
save('lab', 'glitch blip', sqr(np.where(t(0.09) < 0.03, 1800, 600), 0.09) * env(0.09, 0.0002, 0.03) * 0.6, 'perc', 'square 1.8 kHz then 600 Hz, 90 ms')
xs = t(2.2); f = 110 * 2 ** (xs / 2.2 * 3)
save('lab', 'riser saw', lp(saw(f, 2.2) + 0.6 * saw(f * 1.01, 2.2), 600 + 9000 * (xs / 2.2) ** 2) * (xs / 2.2) ** 1.5, 'perc', 'two saws rising 3 octaves from 110 Hz over 2.2 s, opening low-pass, rising level')
save('lab', 'drop boom', drive(np.sin(sweep(2.0, 120, 34, 0.25)) * env(2.0, 0.002, 0.7), 1.8), 'kick', 'sine 120->34 Hz (k 250 ms), 700 ms decay, tanh x1.8 (the drop)')
save('lab', 'drone sub', np.sin(2 * np.pi * 43.65 * t(2.2)) * np.minimum(1, t(2.2) / 0.3) * np.minimum(1, (2.2 - t(2.2)) / 0.4), 'kick', 'sine 43.65 Hz (F1), 300 ms in, 400 ms out')
# ---------------------------------------------------------------- basses (all at C2 = 65.41 Hz: the steps' PITCH plays the line)
C2 = 65.406
def bassenv(sec, d): return env(sec, 0.002, d)
s = 0.6
save('lab', 'bass robot', svf(saw(C2, s), 200 + 2400 * env(s, 0.001, 0.07), 0.55) * bassenv(s, 0.25), 'bass', 'saw C2 through a resonant low-pass (res .55) swept 2.6 kHz->200 Hz in 70 ms: elastic disco bass', {'root': 36})
save('lab', 'bass grit', drive(svf(saw(C2, s) * 0.6 + sqr(C2 * 1.005, s) * 0.5, 300 + 1800 * env(s, 0.001, 0.12), 0.35), 4.0) * bassenv(s, 0.3), 'bass', 'saw + square detuned 0.5 %, low-pass 2.1 kHz->300 Hz, tanh x4: abrasive electro bass', {'root': 36})
save('lab', 'bass reese', lp(saw(C2 * 0.996, 0.9) + saw(C2 * 1.004, 0.9, 0.3), 900) * bassenv(0.9, 0.5), 'bass', 'two saws +/- 0.4 % (beating), low-pass 900 Hz, 500 ms', {'root': 36})
save('lab', 'bass acid', svf(sqr(C2, s, 0.5), 180 + 3200 * env(s, 0.001, 0.09), 0.85) * bassenv(s, 0.22), 'bass', 'square through a very resonant low-pass (res .85) swept 3.4 kHz->180 Hz', {'root': 36})
save('lab', 'bass sub', np.sin(2 * np.pi * C2 * t(0.7)) * bassenv(0.7, 0.4), 'bass', 'pure sine C2, 400 ms', {'root': 36})
save('lab', 'bass fm', fmperc(0.6, C2, 1.0, 2.5, 0.3), 'bass', 'FM C2, ratio 1, index 2.5, 300 ms', {'root': 36})
save('lab', 'bass mono drive', drive(lp(saw(C2, s), 700), 6) * bassenv(s, 0.2), 'bass', 'saw low-passed at 700 Hz, tanh x6: mono-safe dirty bass', {'root': 36})
save('lab', 'bass pluck', svf(saw(C2, 0.35) + saw(C2 * 2, 0.35) * 0.3, 300 + 5000 * env(0.35, 0.0005, 0.03), 0.4) * bassenv(0.35, 0.09), 'bass', 'saw + octave, low-pass 5.3 kHz->300 Hz in 30 ms, 90 ms: funky pluck', {'root': 36})
# ---------------------------------------------------------------- stabs (short chords, root C3)
C3 = 130.81
def chord(semis, sec, fn, fc, d):
    y = sum(fn(C3 * 2 ** (s_ / 12), sec) for s_ in semis) / len(semis); return lp(y, fc) * env(sec, 0.002, d)
save('lab', 'stab dark', drive(chord((0, 3, 7, 10), 0.4, saw, 2600, 0.11), 1.8), 'perc', 'saw chord C3 minor 7 (0 3 7 10), low-pass 2.6 kHz, 110 ms, tanh x1.8', {'root': 48})
save('lab', 'stab robot', chord((0, 4, 7, 11), 0.4, lambda f, s_: sqr(f, s_, 0.3), 3200, 0.09), 'perc', 'pulse (30 %) chord C3 major 7, low-pass 3.2 kHz, 90 ms', {'root': 48})
save('lab', 'stab rave', drive(chord((0, 7, 12, 15), 0.5, saw, 4200, 0.18), 2.2), 'perc', 'saw chord C3 5th + octave + minor 10th, 4.2 kHz, 180 ms, tanh x2.2', {'root': 48})

# ---------------------------------------------------------------- the DFD LIVE PACK one-shots (made by Polaris Sound Lab from code)
pack = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None
if pack and pack.is_dir():
    for f in sorted(pack.glob('*.wav')):
        with wave.open(str(f)) as w: a = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768; r = w.getframerate()
        cat = 'kick' if 'kick' in f.stem else 'snare' if ('snare' in f.stem or 'clap' in f.stem) else 'hat' if 'hat' in f.stem and 'open' not in f.stem else 'cymbal' if ('crash' in f.stem or 'open' in f.stem) else 'perc'
        save('dfd pack', f.stem.replace('-', ' '), a, cat, f'one-shot from the DFD LIVE PACK ({f.name}), peak-normalized to 0.92, 4 ms end fade',
             {'src': 'DFD LIVE PACK, Polaris Sound Lab (original synthesis)'}, made_here=False)

# ---------------------------------------------------------------- the manifest: replace our own entries, append (old numbers stay)
man = json.loads((SND / 'manifest.json').read_text())
new = {e['id']: e for e, _ in lab}
# a sound already in the library is replaced where it is (its number never moves); a new one is appended
man = [new.pop(m['id']) if m['id'] in new else m for m in man] + list(new.values())
(SND / 'manifest.json').write_text(json.dumps(man, indent=1))
(SND / 'lab').mkdir(exist_ok=True)
mf = SND / 'lab' / 'MANIFEST-LAB.json'; made = {a['file']: a for _, a in lab}
old = json.loads(mf.read_text()) if mf.exists() else []                       # what this run did not remake (the pack) keeps its entry
mf.write_text(json.dumps([made.pop(a['file']) if a['file'] in made else a for a in old] + list(made.values()), indent=1))
print(len(lab), 'lab sounds;', len(man), 'in the library')
