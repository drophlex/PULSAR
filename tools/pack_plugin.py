#!/usr/bin/env python3
"""Packs sounds/ for the plug-in: every sound in manifest order (the same slots the web page gives them) as 16-bit PCM,
gzip-compressed -> plugin/sounds.bin.gz.  Format: 'PLSR' u32 count, then per sound: f32 sr, f32 bpm, i32 slices, i32 len, i16[len]"""
import json, pathlib, struct, gzip, soundfile as sf, numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]
man = json.loads((ROOT / 'sounds/manifest.json').read_text())
out = bytearray(b'PLSR' + struct.pack('<I', len(man)))
for m in man:
    d, sr = sf.read(str(ROOT / 'sounds' / (m['id'] + '.wav')), dtype='float32', always_2d=True)
    d = d[:, 0]
    bpm = float(m.get('bpm', 0))
    if bpm: d = d[:min(len(d), round(m['bars'] * 4 * 60 / bpm * sr))]       # a loop: exactly its bars
    pcm = np.clip(np.round(d * 32767), -32768, 32767).astype('<i2')
    out += struct.pack('<ffii', float(sr), bpm, int(m.get('slices', 16)), len(pcm)) + pcm.tobytes()
(ROOT / 'plugin/sounds.bin.gz').write_bytes(gzip.compress(bytes(out), 9))
print(len(man), 'sounds', len(out) // 1024, 'KB raw')
