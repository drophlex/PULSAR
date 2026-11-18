#!/usr/bin/env python3
"""builds index.html (one self-contained page: engine as WebAssembly, the sounds, the interface) and plugin/ui/index.html"""
import subprocess, base64, pathlib, sys
root = pathlib.Path(__file__).resolve().parents[1]
eng = root / 'engine'
flags = ['clang++', '--target=wasm32', '-std=c++20', '-O3', '-ffast-math', '-nostdlib', '-fno-exceptions', '-fno-rtti', '-fno-threadsafe-statics',
         '-fvisibility=hidden', '-mbulk-memory', '-Wl,--no-entry', '-Wl,--export-dynamic', '-Wl,--export=__wasm_call_ctors', '-Wl,--initial-memory=83886080', '-Wl,--max-memory=83886080',
         '-Wl,--allow-undefined', '-I.', 'wasm.cpp', '-o', 'pulsar.wasm']
subprocess.run(flags, cwd=eng, check=True)
wasm = (eng / 'pulsar.wasm').read_bytes()
ui = root / 'ui'
import json, re
def bundle(plugin):
    if plugin:   # the plug-in has the library built in (plugin/sounds.bin.gz): the page only needs the names, in the same order
        man = json.loads((root / 'sounds/manifest.json').read_text())
        js = 'const WASM_B64 = "";\nconst SOUNDS = ' + json.dumps(man) + ';\n'
    else:
        js = 'const WASM_B64 = "' + base64.b64encode(wasm).decode() + '";\n' + (ui / 'sounds_data.js').read_text()
    for f in ['model.js', 'bridge.js', 'app.js', 'pro.js']:
        js += f'\n/* ---- {f} ---- */\n' + (ui / f).read_text()
    return js
def esc_js(t): return ''.join(c if ord(c) < 128 else ('\\u%04x' % ord(c) if ord(c) < 0x10000 else '\\u%04x\\u%04x' % (0xD800 + ((ord(c) - 0x10000) >> 10), 0xDC00 + ((ord(c) - 0x10000) & 0x3FF))) for c in t)
def esc_html(t): return ''.join(c if ord(c) < 128 else '&#x%x;' % ord(c) for c in t)
a, b = (ui / 'template.html').read_text().split('/*JS*/')
for out, plug in [(root / 'index.html', False), (root / 'plugin/ui/index.html', True)]:
    html = esc_html(a) + esc_js(bundle(plug).replace('</script', '<\\/script')) + esc_html(b)
    out.parent.mkdir(parents=True, exist_ok=True); out.write_text(html)
    print('ok', out.name, len(html) // 1024, 'KB, wasm', len(wasm) // 1024, 'KB')
