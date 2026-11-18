#!/bin/bash
# PULSAR installer — copies the plug-ins to your user plug-in folders and clears the download quarantine.
cd "$(dirname "$0")"
echo ""
echo "  P U L S A R"
echo "  a drum machine for broken beats · Dark Funk Durcal design · built at Polaris Sound Lab"
echo ""
VST3="$HOME/Library/Audio/Plug-Ins/VST3"; AU="$HOME/Library/Audio/Plug-Ins/Components"
mkdir -p "$VST3" "$AU" "$HOME/Applications"
rm -rf "$VST3/PULSAR.vst3" "$AU/PULSAR.component" "$HOME/Applications/PULSAR.app"
cp -R PULSAR.vst3 "$VST3/" && cp -R PULSAR.component "$AU/" && cp -R PULSAR.app "$HOME/Applications/"
xattr -dr com.apple.quarantine "$VST3/PULSAR.vst3" "$AU/PULSAR.component" "$HOME/Applications/PULSAR.app" 2>/dev/null
killall -9 AudioComponentRegistrar 2>/dev/null
echo "  ✓ VST3  → $VST3"
echo "  ✓ AU    → $AU"
echo "  ✓ App   → ~/Applications"
echo ""
echo "  Ableton Live: Settings → Plug-ins → turn on 'Use VST3 Plug-in System Folders' → Rescan."
echo "  Ableton Live: Ajustes → Plug-ins → activa 'Usar carpetas de sistema VST3' → Volver a escanear."
echo ""
read -n 1 -s -r -p "  Press any key / Presiona una tecla…"
