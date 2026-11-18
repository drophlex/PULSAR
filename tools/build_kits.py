#!/usr/bin/env python3
"""PULSAR sound library builder.
Sources (all free to share):
  - Gogodze Phu Vol II, Karoryfer Lecolds (CC0): a 1973-style acoustic kit, 7 microphones, velocity layers.
    -> one-shots (studio mix and the lo-fi "retro" mic) and our OWN breakbeats, played and recorded here
       the way breaks were sampled: a funky drummer in a room, then a sampler.
  - Vintage drum machine samples marked Public Domain (oramics/sampled: rhythm box, 80s digital kits).
Output: pulsar/sounds/<group>/<name>.wav (44.1 kHz mono 16-bit) and sounds/manifest.json"""
import json, pathlib, re, random
import numpy as np
from scipy.io import wavfile
from scipy import signal

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'sounds'
GOG = pathlib.Path('/home/claude/sfzinstruments/gogodze/Samples')
DM = pathlib.Path('/home/claude/oramics/sampled/DM')
SR = 44100
rng = random.Random(1973)
manifest = []

import soundfile as sf
def load(p):
    x, sr = sf.read(str(p), dtype='float32', always_2d=True)
    x = x.mean(axis=1)
    if sr != SR: x = signal.resample_poly(x, SR, sr).astype(np.float32)
    return x

def trim(x, thr=1e-3, tail_ms=8, maxs=2.2):
    a = np.abs(x)
    idx = np.where(a > thr * max(a.max(), 1e-9))[0]
    if len(idx) == 0: return x
    s, e = max(0, idx[0] - 8), min(len(x), idx[-1] + int(SR * tail_ms / 1000))
    y = x[s:e].copy()
    if len(y) > maxs * SR:                              # long rings fade out (keeps the library small)
        y = y[:int(maxs * SR)]; f = int(SR * 0.6); y[-f:] *= np.linspace(1, 0, f) ** 2
    f = min(len(y), int(SR * 0.006))
    y[-f:] *= np.linspace(1, 0, f)
    return y

def norm(x, peak=0.95):
    m = np.abs(x).max()
    return x * (peak / m) if m > 0 else x

def save(group, name, x, cat, src, lic):
    d = OUT / group; d.mkdir(parents=True, exist_ok=True)
    y = np.clip(x, -1, 1)
    wavfile.write(d / f'{name}.wav', SR, (y * 32767).astype(np.int16))
    manifest.append({'id': f'{group}/{name}', 'group': group, 'name': name, 'cat': cat, 'len': round(len(y) / SR, 3), 'src': src, 'lic': lic})

# ---------------------------------------------------------------- acoustic 70s kit (Gogodze, CC0)
MIX = {  # mic weights per drum: a close sound with the room around it
    'k': {'kick_mic': 1.0, 'front_mic': 0.45, 'oh_mic': 0.3, 'wndw_mic': 0.25},
    's': {'snare_mic': 0.9, 'oh_mic': 0.5, 'front_mic': 0.35, 'wndw_mic': 0.3, 'side_mic': 0.2},
    'h': {'oh_mic': 0.8, 'front_mic': 0.45, 'side_mic': 0.3, 'wndw_mic': 0.15},
    't': {'front_mic': 0.7, 'oh_mic': 0.6, 'side_mic': 0.3, 'wndw_mic': 0.3},
}
ROOMMIX = {'wndw_mic': 1.0, 'side_mic': 0.35, 'oh_mic': 0.25}
_cache = {}
def gmic(code, vl, rr, mic):
    k = (code, vl, rr, mic)
    if k not in _cache:
        p = GOG / mic / f'{code}_vl{vl}_rr{rr}.wav'
        _cache[k] = load(p) if p.exists() else None
    return _cache[k]

def ghit(code, vl, rr, mix):
    parts = [(gmic(code, vl, rr, m), w) for m, w in mix.items()]
    parts = [(x, w) for x, w in parts if x is not None]
    n = max(len(x) for x, _ in parts)
    y = np.zeros(n, np.float32)
    for x, w in parts: y[:len(x)] += x * w
    return y

def family(code):
    return 'k' if code == 'ks' else 's' if code in ('sc', 'se', 'ss') else 't' if code in ('th', 'tm', 'tl') else 'h'

LAYERS = {}
for f in (GOG / 'front_mic').glob('*.wav'):
    m = re.match(r'(\w\w)_vl(\d+)_rr(\d+)', f.stem)
    LAYERS.setdefault(m[1], set()).add((int(m[2]), int(m[3])))
def maxvl(code): return max(v for v, _ in LAYERS[code])

def gshot(code, vl):
    return ghit(code, vl, 1, MIX[family(code)])

ACOU = [('kick', 'ks', 'kick'), ('kick soft', 'ks', 'kick'), ('snare', 'sc', 'snare'), ('snare ghost', 'sc', 'snare'),
        ('snare rim', 'se', 'snare'), ('sidestick', 'ss', 'rim'), ('hat closed', 'hc', 'hat'), ('hat tight', 'ht', 'hat'),
        ('hat half', 'hh', 'hat'), ('hat loose', 'hl', 'hat'), ('hat open', 'ho', 'open'), ('hat foot', 'hf', 'hat'),
        ('tom high', 'th', 'tom'), ('tom mid', 'tm', 'tom'), ('tom low', 'tl', 'tom')]
for name, code, cat in ACOU:
    vl = 2 if ('soft' in name or 'ghost' in name) else maxvl(code)
    save('70s kit', name, norm(trim(gshot(code, vl))), cat, 'Gogodze Phu Vol II (Karoryfer)', 'CC0')
    if 'soft' not in name and 'ghost' not in name:      # the same drum on the one cheap microphone: instant lo-fi
        save('70s retro', name, norm(trim(gmic(code, maxvl(code), 1, 'retro_mic'))), cat, 'Gogodze Phu Vol II, retro mic', 'CC0')

# ---------------------------------------------------------------- our own breakbeats
# A drummer plays these here, in the room, on the Gogodze kit (round robins, real velocity layers, ghost notes,
# human timing); then the loop gets a "record" treatment. Rhythms are ours; nothing is lifted from any record.
def vl_for(code, v):          # v 0..1 -> velocity layer
    return max(1, min(maxvl(code), 1 + int(round(v * (maxvl(code) - 1)))))
def rr_for(code, vl):
    rrs = [r for (v, r) in LAYERS[code] if v == vl]
    return rng.choice(rrs)

def play_break(bpm, bars, lines, swing=0.0, humanize=0.006, room=0.55):
    step = 60.0 / bpm / 4
    n = int(SR * step * 16 * bars) + SR
    y = np.zeros(n, np.float32)
    open_hat_until = -1
    for code, steps in lines:
        for i, ch in enumerate(steps * (bars * 16 // len(steps))):
            if ch == '.': continue
            v = {'X': 1.0, 'x': 0.72, 'o': 0.45, 'g': 0.18}[ch] * rng.uniform(0.9, 1.0)
            t = i * step + (swing * step if i % 2 else 0) + rng.gauss(0, humanize) + (0.004 if code.startswith('s') else 0)
            vl = vl_for(code, v); rr = rr_for(code, vl)
            mix = dict(MIX[family(code)]); [mix.__setitem__(k, mix.get(k, 0) + w * room) for k, w in ROOMMIX.items()]
            h = ghit(code, vl, rr, mix) * (0.55 + 0.45 * v)
            s = max(0, int(t * SR)); e = min(n, s + len(h)); y[s:e] += h[:e - s]
    y = y[:int(SR * step * 16 * bars)]
    return y

def record_chain(x, lo=45, hi=11000, drive=1.6, comp=0.5):
    """the break as it comes off a 70s record: band-limited, warm tape drive, a fast compressor"""
    b, a = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); x = signal.lfilter(b, a, x)
    x = np.tanh(x * drive / max(np.abs(x).max(), 1e-9)) / np.tanh(drive)
    env = signal.lfilter([0.02], [1, -0.98], np.abs(x)); g = 1.0 / (1.0 + comp * np.maximum(env - 0.3, 0) * 4)
    return norm(x * g, 0.9).astype(np.float32)

BREAKS = [  # name, bpm, swing, lines (k=kick ks, s=snare sc, e=edge se, h=hat code), 16th grid, X x o g = accents
    ('brk funky 101', 101, 0.08, [('ks', 'X..x..X...X..x..'), ('sc', '....X..g.g..X..g'), ('hc', 'x.o.x.o.x.o.x.o.')]),
    ('brk drummer 98', 98, 0.10, [('ks', 'X.........X.X...'), ('sc', '....X..g.g.gX.g.'), ('hl', 'xoxoxoxoxoxoxoxo')]),
    ('brk hot 116', 116, 0.04, [('ks', 'X.X.......X..X..'), ('sc', '....X.g..g..X...'), ('hc', 'x.x.x.x.x.x.xox.'), ('ho', '..............x.')]),
    ('brk riot 136', 136, 0.0, [('ks', 'X.X.......XX....'), ('sc', '....X..g.g..X..g'), ('ht', 'x.x.x.x.x.x.x.x.'), ('se', '.......o........')]),
    ('brk crate 92', 92, 0.14, [('ks', 'X..g...X..X.....'), ('sc', '....X.......X.g.'), ('hc', 'x.x.x.x.x.x.x.x.'), ('hf', '..o...o...o...o.')]),
    ('brk rush 140', 140, 0.0, [('ks', 'X.......X.X.....'), ('sc', '....X..g.X..X..g'), ('hl', 'x.xox.xox.xox.xo'), ('tl', '.............x.x')]),
    ('brk stomp 104', 104, 0.06, [('ks', 'X..X..X...X..X..'), ('sc', '....X.......X...'), ('hh', 'x.x.x.x.x.x.x.x.'), ('ss', '..........o.....')]),
    ('brk ghost 88', 88, 0.16, [('ks', 'X......X.X......'), ('sc', 'g..gX.ggg..gX.gg'), ('hc', 'xoxoxoxoxoxoxoxo')]),
]
for name, bpm, sw, lines in BREAKS:
    x = record_chain(play_break(bpm, 2, lines, swing=sw))
    save('breaks', name, x, 'break', 'played in PULSAR on the Gogodze kit (CC0)', 'CC0')
    manifest[-1].update({'bpm': bpm, 'bars': 2, 'slices': 32})

# ---------------------------------------------------------------- vintage machines (public domain samples, neutral names)
VINT = {
    'rhythm box': ('CR-78', {'kick': 'kick', 'kick accent': 'kick-accent', 'snare': 'snare', 'snare accent': 'snare-accent', 'rim': 'rim',
                             'hat': 'hihat', 'hat metal': 'hihat-metal', 'cymbal': 'cymbal', 'bongo high': 'bongo-h', 'bongo low': 'bongo-l',
                             'conga': 'conga-l', 'cowbell': 'cowbell', 'guiro': 'guiro-short', 'tambourine': 'tamb-short'}),
    '80s studio': ('LM-2', {'kick': 'kick', 'kick alt': 'kick-alt', 'snare': 'snare-m', 'snare high': 'snare-h', 'clap': 'clap', 'stick': 'stick-m',
                            'hat closed': 'hihat-closed', 'hat open': 'hihat-open', 'ride': 'ride', 'crash': 'crash', 'tom high': 'tom-h',
                            'tom low': 'tom-l', 'conga': 'conga-m', 'cowbell': 'cowb', 'cabasa': 'cabasa', 'tambourine': 'tamb'}),
}
def vcat(n):
    for c in ['kick', 'snare', 'clap', 'rim', 'stick', 'hat open', 'hat', 'cymbal', 'crash', 'ride', 'tom']:
        if n.startswith(c): return {'stick': 'rim', 'hat open': 'open', 'cymbal': 'cym', 'crash': 'cym', 'ride': 'cym'}.get(c, c)
    return 'perc'
for group, (folder, m) in VINT.items():
    for name, f in m.items():
        p = DM / (folder + f + '.wav') if folder.endswith('-') else DM / folder / 'samples' / f'{f}.wav'
        save(group, name, norm(trim(load(p))), vcat(name), 'oramics/sampled ' + folder.split('/')[0] + ' (marked Public Domain)', 'Public Domain')

exec(open(ROOT / 'tools/build_hq.py').read())
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1))
tot = sum((OUT / (m['id'] + '.wav')).stat().st_size for m in manifest)
print(len(manifest), 'sounds,', tot // 1024, 'KB')
