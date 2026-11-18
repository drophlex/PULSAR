#!/bin/bash
# PULSAR one-line installer for Mac:  curl -fsSL https://drophlex.github.io/PULSAR/install.sh | bash
set -e
echo ""; echo "  P U L S A R  ·  installing / instalando…"; echo ""
T="$(mktemp -d)"; cd "$T"
curl -fsSL -o P.zip https://github.com/drophlex/PULSAR/releases/latest/download/PULSAR-mac.zip
ditto -x -k P.zip .
V="$HOME/Library/Audio/Plug-Ins/VST3"; C="$HOME/Library/Audio/Plug-Ins/Components"; mkdir -p "$V" "$C" "$HOME/Applications"
rm -rf "$V/PULSAR.vst3" "$C/PULSAR.component" "$HOME/Applications/PULSAR.app"
cp -R PULSAR/PULSAR.vst3 "$V/"; cp -R PULSAR/PULSAR.component "$C/"; cp -R PULSAR/PULSAR.app "$HOME/Applications/"
xattr -dr com.apple.quarantine "$V/PULSAR.vst3" "$C/PULSAR.component" "$HOME/Applications/PULSAR.app" 2>/dev/null || true
killall -9 AudioComponentRegistrar 2>/dev/null || true
cd /; rm -rf "$T"
echo "  ✓ VST3 → ~/Library/Audio/Plug-Ins/VST3"
echo "  ✓ AU   → ~/Library/Audio/Plug-Ins/Components"
echo "  ✓ App  → ~/Applications"
echo ""; echo "  ✓ PULSAR installed / instalado. Ableton → Settings/Ajustes → Plug-ins → Rescan/Volver a escanear."; echo ""
