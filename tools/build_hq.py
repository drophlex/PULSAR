# PULSAR · the high-quality library (runs inside build_kits.py: load, trim, norm, save, play-style helpers are in scope)
# Sources, all free to share and among the best rated free drum libraries:
#   SM Drums (Scott McLean, Tod Stillwell, Suleiman Ali) - Public Domain, deeply sampled
#   Big Rusty Drums, Frankensnare, Unruly Drums (Karoryfer Samples) - CC0, formerly commercial
import glob, re as _re
LIB = pathlib.Path('/home/claude/libs')
def files(pat): return sorted(glob.glob(str(LIB / pat), recursive=True))
def velno(f):
    n = pathlib.Path(f).name; m = _re.search(r'vl(\d+)', n) or _re.match(r'(\d+)_', n); return int(m[1]) if m else 0
def best(pat, which='max'):
    fs = files(pat); vs = sorted(set(velno(f) for f in fs))
    if not fs: raise SystemExit('no files: ' + pat)
    v = vs[-1] if which == 'max' else vs[0]
    return [f for f in fs if velno(f) == v][0]
def align_mix(parts):
    """parts: [(signal, weight)] - each later mic is time-aligned to the first (close) one, then summed"""
    ref = parts[0][0]; n = max(len(x) for x, _ in parts); y = np.zeros(n, np.float32)
    for k, (x, w) in enumerate(parts):
        if k:
            seg = int(0.004 * SR); a = ref[:SR // 10]; b = x[:SR // 10]
            c = signal.correlate(b, a, 'full', method='fft')[len(a) - 1 - seg: len(a) - 1 + seg + 1]
            lag = int(np.argmax(np.abs(c))) - seg
            if lag > 0: x = x[lag:]
            elif lag < 0: x = np.concatenate([np.zeros(-lag, np.float32), x])
            if np.dot(ref[:min(len(ref), len(x))][:SR // 20], x[:SR // 20]) < 0: x = -x
        y[:len(x)] += x[:n] * w
    return y
def hp(x, f=28):
    b, a = signal.butter(2, f / (SR / 2), 'high'); return signal.lfilter(b, a, x).astype(np.float32)
def comp(x, thr=0.35, ratio=3.0, att=0.002, rel=0.08):
    e = 0.0; out = np.empty_like(x); aa = np.exp(-1 / (att * SR)); rr = np.exp(-1 / (rel * SR))
    for i, s in enumerate(np.abs(x)):
        e = aa * e + (1 - aa) * s if s > e else rr * e + (1 - rr) * s
        g = 1.0 if e <= thr else (thr + (e - thr) / ratio) / e
        out[i] = x[i] * g
    return out
def sat(x, drive=1.5): return (np.tanh(x * drive) / np.tanh(drive)).astype(np.float32)
def finish(x, maxs=2.4): return norm(trim(hp(x), maxs=maxs), 0.97)
def pitch(x, semis):
    if not semis: return x
    r = 2 ** (semis / 12); n = int(len(x) / r); return np.interp(np.arange(n) * r, np.arange(len(x)), x).astype(np.float32)
SRC_SM, SRC_BR, SRC_FS, SRC_UN = 'SM Drums (public domain)', 'Big Rusty Drums, Karoryfer (CC0)', 'Frankensnare, Karoryfer (CC0)', 'Unruly Drums, Karoryfer (CC0)'

# ---------------- studio kit: SM Drums (stereo room mixes, summed to mono)
SM = 'smdrums/Samples/SMDrum Stereo (Samples)/'
SMC = 'smdrums/Samples/SMD Cymbals Stereo (Samples)/'
smk = [('kick', SM + 'Kik_Stereo/RR1/*.wav', 'kick'), ('kick soft', SM + 'Kik_Stereo/RR1/*.wav', 'kick', 'min'),
       ('snare', SM + 'Snare65_Reg_Stereo/RR1/*.wav', 'snare'), ('snare soft', SM + 'Snare65_Reg_Stereo/RR1/*.wav', 'snare', 'min'),
       ('rimshot', SM + 'RimShot_Stereo/RR1/*.wav', 'snare'), ('sidestick', SM + 'SideStick_Stereo/RR1/*.wav', 'rim'),
       ('tom high', SM + 'Toms_Stereo/Tom1/RR1/*.wav', 'tom'), ('tom mid', SM + 'Toms_Stereo/Tom2/RR1/*.wav', 'tom'), ('tom low', SM + 'Toms_Stereo/Tom4/RR1/*.wav', 'tom'),
       ('hat tight', SMC + 'Hi-Hat (Samples)/01 Hat Tight 1/RR1/*.wav', 'hat'), ('hat loose', SMC + 'Hi-Hat (Samples)/02 Hat, Loose/RR1/*.wav', 'hat'),
       ('hat open', SMC + 'Hi-Hat (Samples)/03 Hat, Open/RR1/*.wav', 'open'), ('hat foot', SMC + 'Hi-Hat (Samples)/05 Hat, Foot/RR1/*.wav', 'hat'),
       ('ride', SMC + 'Ride (Samples)/Ride 17 (Samples)/RR1/*.wav', 'cym'), ('ride bell', SMC + 'Ride (Samples)/Ride 17 Bell (Samples)/RR1/*.wav', 'cym'),
       ('crash', SMC + 'Crash (Samples)/Crash 16 (Samples)/RR1/*.wav', 'cym'), ('china', SMC + 'Crash (Samples)/China Cymbal (Samples)/RR1/*.wav', 'cym')]
for it in smk:
    name, pat, cat = it[:3]; which = it[3] if len(it) > 3 else 'max'
    save('studio kit', name, finish(load(best(pat, which)), 3.0 if cat == 'cym' else 2.0), cat, SRC_SM, 'Public Domain')

# ---------------- big kit: Big Rusty Drums (an oversized 80s kit) - close mics + room
BR = 'karoryfer.big-rusty-drums/Samples/'
def br(art, mics, which='max'): return align_mix([(load(best(BR + f'{art}/{m}/*.flac', which)), w) for m, w in mics])
save('big kit', 'kick', finish(br('kick_24/kick', [('kick', 1), ('sn', .25), ('oh', .4)])), 'kick', SRC_BR, 'CC0')
save('big kit', 'snare', finish(br('snare_14/center', [('top', 1), ('btm', .35), ('oh', .55)])), 'snare', SRC_BR, 'CC0')
save('big kit', 'rimshot', finish(br('snare_14/rimshot', [('top', 1), ('btm', .3), ('oh', .55)])), 'snare', SRC_BR, 'CC0')
save('big kit', 'sidestick', finish(br('snare_14/sidestick', [('top', 1), ('oh', .4)])), 'rim', SRC_BR, 'CC0')
save('big kit', 'hat closed', finish(br('hihat_14/cl', [('cl', 1), ('oh', .5)])), 'hat', SRC_BR, 'CC0')
save('big kit', 'hat tight', finish(br('hihat_14/tc', [('cl', 1), ('oh', .5)])), 'hat', SRC_BR, 'CC0')
save('big kit', 'hat open', finish(br('hihat_14/open', [('cl', 1), ('oh', .6)])), 'open', SRC_BR, 'CC0')
save('big kit', 'ride', finish(br('ride_22/rd', [('cl', .8), ('oh', 1)]), 3.0), 'cym', SRC_BR, 'CC0')
save('big kit', 'crash', finish(br('crash_17/cr', [('cl', .6), ('oh', 1)]), 3.0), 'cym', SRC_BR, 'CC0')
for nm, art in [('tom high', 'tom_14/center'), ('tom mid', 'tom_18/center'), ('tom floor', 'tom_22/center')]:
    save('big kit', nm, finish(br(art, [('cl', 1), ('oh', .5), ('sn', .2)])), 'tom', SRC_BR, 'CC0')

# ---------------- snare collection: Frankensnare
FS = 'karoryfer.frankensnare/Samples/'
def fs(art, which='max'): return align_mix([(load(best(FS + f'{art}/{m}/*.flac', which)), w) for m, w in [('top', 1), ('btm', .35), ('oh', .6)]])
for nm, art in [('snare 10 piccolo', '10_basic'), ('snare 12 tight', '12_basic'), ('snare 14 brass', '14a_basic'), ('snare 14 steel', '14s_basic'),
                ('snare 14 maple', '14p_basic'), ('snare 16 fat', '16_basic'), ('snare 20 tight', '20m_tight'), ('rimshot 13', '13b_rimshot')]:
    save('snares', nm, finish(fs(art)), 'snare', SRC_FS, 'CC0')
save('snares', 'snare 12 ghost', finish(fs('12_basic', 'min')), 'snare', SRC_FS, 'CC0')
cl = files(FS + 'xtra_claps/*.flac')
if cl: save('snares', 'hand clap', finish(load(cl[0])), 'clap', SRC_FS, 'CC0')
tb = files(FS + 'xtra_tamb/*.flac')
if tb: save('snares', 'tambourine', finish(load(tb[0])), 'perc', SRC_FS, 'CC0')

# ---------------- odd kit: Unruly Drums (every drum is a snare) - great for strange IDM sounds
UN = 'karoryfer.unruly-drums/Samples/'
def un(art, mics, rr='rr1', which='max'): return align_mix([(load(best(UN + f'{art}/{m}/{rr}/*.flac', which)), w) for m, w in mics])
save('odd kit', 'kick', finish(un('k20', [('in', 1), ('out', .6), ('oh', .3)])), 'kick', SRC_UN, 'CC0')
save('odd kit', 'snare 13', finish(un('s13', [('top', 1), ('btm', .3), ('ohl', .3), ('ohr', .3)])), 'snare', SRC_UN, 'CC0')
save('odd kit', 'snare 22', finish(un('s22', [('top', 1), ('btm', .3), ('ohl', .3), ('ohr', .3)])), 'snare', SRC_UN, 'CC0')
save('odd kit', 'hat', finish(un('h14', [('cl', 1), ('ohl', .3), ('ohr', .3)])), 'hat', SRC_UN, 'CC0')
save('odd kit', 'cymbal', finish(un('c16', [('cl', .7), ('oh', 1)]), 3.0), 'cym', SRC_UN, 'CC0')
save('odd kit', 'block', finish(un('wb', [('cl', 1), ('oh', .4)])), 'perc', SRC_UN, 'CC0')

# ---------------- designed one-shots: synthesis layered with real transients, mixed like a record
def env(n, t60): return np.exp(-np.arange(n) / SR * 6.9 / t60).astype(np.float32)
def sine_sweep(f0, f1, tk, dur):
    n = int(dur * SR); t = np.arange(n) / SR; f = f1 + (f0 - f1) * np.exp(-t / tk); ph = 2 * np.pi * np.cumsum(f) / SR; return np.sin(ph).astype(np.float32)
def noise(n, seed=1): return np.random.default_rng(seed).uniform(-1, 1, n).astype(np.float32)
def bp(x, lo, hi): b, a = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return signal.lfilter(b, a, x).astype(np.float32)
def hpf(x, f): b, a = signal.butter(2, f / (SR / 2), 'high'); return signal.lfilter(b, a, x).astype(np.float32)
def lay(*parts):
    n = max(len(p) for p, _ in parts); y = np.zeros(n, np.float32)
    for p, w in parts: y[:len(p)] += p * w
    return y
smkick = load(best(SM + 'Kik_Stereo/RR1/*.wav')); click = hpf(smkick[:int(.012 * SR)], 900) * np.linspace(1, 0, int(.012 * SR)).astype(np.float32)
brkick = br('kick_24/kick', [('kick', 1), ('sn', .25), ('oh', .4)])
def kick(f0, f1, tk, t60, dur, drive, clickw=0.5, body=None):
    s = sine_sweep(f0, f1, tk, dur) * env(int(dur * SR), t60)
    y = lay((s, 1), (click, clickw), *( [(body, .6)] if body is not None else [])); return sat(y, drive)
D = 'designed'
save(D, 'kick punch', finish(kick(160, 50, .03, .45, .8, 1.8)), 'kick', 'PULSAR (synthesis + SM Drums transient)', 'CC0')
save(D, 'kick rave', finish(kick(260, 54, .018, .5, .9, 3.2, .7)), 'kick', 'PULSAR synthesis', 'CC0')
save(D, 'kick boom', finish(kick(90, 44, .06, 1.6, 2.2, 1.3, .25)), 'kick', 'PULSAR synthesis', 'CC0')
save(D, 'kick gabber', finish(comp(kick(300, 58, .02, .6, .8, 9.0, .8), .3, 4)), 'kick', 'PULSAR synthesis', 'CC0')
save(D, 'kick big beat', finish(comp(sat(lay((brkick, 1), (kick(140, 48, .03, .5, .9, 1.4, .2), .7)), 2.4), .3, 4)), 'kick', 'PULSAR (Big Rusty Drums + synthesis)', 'CC0')
save(D, 'kick electro', finish(kick(120, 46, .045, .9, 1.4, 1.2, .35)), 'kick', 'PULSAR synthesis', 'CC0')
brsn = br('snare_14/center', [('top', 1), ('btm', .35), ('oh', .55)]); fs14 = fs('14p_basic'); fs12 = fs('12_basic')
n = int(.5 * SR); nz = bp(noise(n), 1500, 9000) * env(n, .22)
save(D, 'snare big beat', finish(comp(sat(lay((brsn, 1), (fs14, .5), (nz, .35)), 2.2), .28, 4)), 'snare', 'PULSAR (Big Rusty + Frankensnare)', 'CC0')
save(D, 'snare jungle', finish(comp(pitch(fs12, 3), .3, 4)), 'snare', 'PULSAR (Frankensnare, tuned up)', 'CC0')
tone = (np.sin(2 * np.pi * 185 * np.arange(n) / SR) * env(n, .12) + .5 * np.sin(2 * np.pi * 330 * np.arange(n) / SR) * env(n, .08)).astype(np.float32)
save(D, 'snare electro', finish(sat(lay((tone, .8), (bp(noise(n, 3), 2000, 11000) * env(n, .25), .9)), 1.6)), 'snare', 'PULSAR synthesis', 'CC0')
if cl:
    c0 = load(cl[0]); cl2 = load(cl[1]) if len(cl) > 1 else c0
    stack = lay((c0, 1), (np.concatenate([np.zeros(int(.011 * SR), np.float32), cl2]), .8), (np.concatenate([np.zeros(int(.019 * SR), np.float32), pitch(c0, -1)]), .6))
    save(D, 'clap stack', finish(comp(stack, .3, 3)), 'clap', 'PULSAR (Frankensnare claps, layered)', 'CC0')
def metal(dur, t60, hpf_f, seed=4):
    n = int(dur * SR); t = np.arange(n) / SR; fr = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0]
    y = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in fr).astype(np.float32) / 6 + noise(n, seed) * .35
    return hpf(bp(y, hpf_f, 16000), hpf_f) * env(n, t60)
save(D, 'hat metal closed', finish(metal(.25, .07, 7000)), 'hat', 'PULSAR synthesis', 'CC0')
save(D, 'hat metal open', finish(metal(1.2, .55, 6500)), 'open', 'PULSAR synthesis', 'CC0')
n = int(.6 * SR); t = np.arange(n) / SR
save(D, 'fm blip', finish(np.sin(2 * np.pi * 620 * t + 3 * np.exp(-t / .02) * np.sin(2 * np.pi * 1550 * t)).astype(np.float32) * env(n, .25)), 'perc', 'PULSAR synthesis', 'CC0')
save(D, 'fm wood', finish(np.sin(2 * np.pi * 410 * t + 2 * np.exp(-t / .01) * np.sin(2 * np.pi * 1230 * t)).astype(np.float32) * env(n, .12)), 'perc', 'PULSAR synthesis', 'CC0')
f = 3500 * np.exp(-t / .02) + 90; save(D, 'zap', finish((np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .3)).astype(np.float32)), 'perc', 'PULSAR synthesis', 'CC0')
n = int(2.0 * SR); rs = bp(noise(n, 9), 2500, 12000) * np.linspace(0, 1, n).astype(np.float32) ** 2
save(D, 'noise riser', finish(rs, 2.0), 'perc', 'PULSAR synthesis', 'CC0')

# ---------------- hi-fi breaks, played here on the big kit and the studio kit
def kit_hits():
    H = {'k': [brkick, smkick], 's': [brsn, load(best(SM + 'Snare65_Reg_Stereo/RR1/*.wav'))], 'g': [load(best(SM + 'Snare65_Reg_Stereo/RR1/*.wav', 'min'))],
         'h': [br('hihat_14/cl', [('cl', 1), ('oh', .5)]), load(best(SMC + 'Hi-Hat (Samples)/01 Hat Tight 1/RR1/*.wav'))],
         'o': [br('hihat_14/open', [('cl', 1), ('oh', .6)])], 't': [br('tom_18/center', [('cl', 1), ('oh', .5)])], 'r': [load(best(SMC + 'Ride (Samples)/Ride 17 (Samples)/RR1/*.wav'))]}
    return H
HITS = kit_hits()
def play2(bpm, bars, lines, kitk, swing=0.0, hum=0.005):
    step = 60.0 / bpm / 4; n = int(SR * step * 16 * bars); y = np.zeros(n + SR, np.float32)
    for code, steps in lines:
        for i, ch in enumerate(steps * (bars * 16 // len(steps))):
            if ch == '.': continue
            v = {'X': 1.0, 'x': .75, 'o': .5, 'g': .22}[ch] * rng.uniform(.9, 1)
            src = HITS['g'][0] if (code == 's' and ch == 'g') else HITS[code][kitk % len(HITS[code])]
            hit = pitch(src, rng.uniform(-.12, .12)) * v
            t0 = max(0, int((i * step + (swing * step if i % 2 else 0) + rng.gauss(0, hum)) * SR)); e = min(len(y), t0 + len(hit)); y[t0:e] += hit[:e - t0]
    return y[:n]
HIFI = [('brk big 120', 120, 0, .04, [('k', 'X.X...X...X..X..'), ('s', '....X..g.g..X...'), ('h', 'x.x.x.x.x.x.x.x.'), ('o', '......x.......x.')]),
        ('brk heavy 108', 108, 0, .08, [('k', 'X..X......X.X...'), ('s', '....X.g.....X..g'), ('h', 'xoxoxoxoxoxoxoxo')]),
        ('brk tight 132', 132, 1, 0, [('k', 'X.....X...X.....'), ('s', '....X..g.g..X.g.'), ('h', 'x.xox.xox.xox.xo')]),
        ('brk ride 126', 126, 1, .02, [('k', 'X.........X.X...'), ('s', '....X.......X...'), ('r', 'x.x.x.x.x.x.x.x.'), ('t', '..............x.')]),
        ('brk shuffle 96', 96, 0, .16, [('k', 'X.....X..X......'), ('s', '....X..g....X.gg'), ('h', 'x.x.x.x.x.x.x.x.')])]
for name, bpm, kk, sw, lines in HIFI:
    x = play2(bpm, 2, lines, kk, sw); x = comp(hp(x), .35, 3); x = norm(sat(x / max(np.abs(x).max(), 1e-9), 1.3), .92)
    save('breaks hifi', name, x, 'break', 'played in PULSAR on SM Drums + Big Rusty Drums', 'CC0'); manifest[-1].update({'bpm': bpm, 'bars': 2, 'slices': 32})
