#!/usr/bin/env python3
"""Packs sounds/ for the web page: MP3 (VBR, high quality, mono) as base64 + the manifest -> ui/sounds_data.js"""
import json, pathlib, subprocess, base64
ROOT = pathlib.Path(__file__).resolve().parents[1]
man = json.loads((ROOT / 'sounds/manifest.json').read_text())
out = []
tot = 0
for m in man:
    wav = ROOT / 'sounds' / (m['id'] + '.wav')
    mp3 = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(wav), '-ac', '1', '-c:a', 'libmp3lame', '-q:a', '0', '-f', 'mp3', '-'], capture_output=True, check=True).stdout
    tot += len(mp3)
    d = dict(m); d['b64'] = base64.b64encode(mp3).decode(); out.append(d)
(ROOT / 'ui/sounds_data.js').write_text('const SOUNDS = ' + json.dumps(out) + ';\n')
print(len(out), 'sounds', tot // 1024, 'KB mp3')
