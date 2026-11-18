#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "BinaryData.h"
using namespace pulsar;

static const char* FXN[16] = { "STUTTER", "ROLL", "DRILL", "GLITCH", "REVERSE", "TAPE STOP", "CRUSH", "FILTER", "RISE", "HALF", "DOUBLE", "GATE", "DUB", "WARP", "DROP", "FILL" };
static const char* DLYDIV[8] = { "1/32", "1/16", "1/16T", "1/8", "1/8T", "1/8.", "1/4", "1/2" };
static const char* STUT[4] = { "1/8", "1/16", "1/32", "1/48" };
static constexpr int USER_FLOATS = 8 * 1024 * 1024;              // room for your own samples: ~3 min at 44.1 kHz

// the main stereo output and eight more (off until you turn them on in the DAW): a track whose OUT is BUS n plays there
juce::AudioProcessor::BusesProperties PulsarProcessor::busesProps() {
  auto b = BusesProperties().withOutput("Main", juce::AudioChannelSet::stereo(), true);
  for (int k = 1; k <= NBUS; k++) b = b.withOutput("Bus " + juce::String(k), juce::AudioChannelSet::stereo(), false);
  return b;
}

PulsarProcessor::PulsarProcessor()
  : AudioProcessor(busesProps()) {
  learn.fill(-1); offs.reserve(2048);
  // ---- the library, in the same slots the web page gives it
  juce::MemoryInputStream gz(BinaryData::sounds_bin_gz, (size_t)BinaryData::sounds_bin_gzSize, false);
  juce::GZIPDecompressorInputStream in(&gz, false, juce::GZIPDecompressorInputStream::gzipFormat);
  juce::MemoryBlock raw; in.readIntoMemoryBlock(raw);
  const uint8_t* b = (const uint8_t*)raw.getData(); size_t n = raw.getSize(), o = 8;
  int count = n >= 8 && std::memcmp(b, "PLSR", 4) == 0 ? (int)juce::ByteOrder::littleEndianInt(b + 4) : 0;
  size_t total = 0;
  { size_t q = 8; for (int i = 0; i < count && q + 16 <= n; i++) { int len = (int)juce::ByteOrder::littleEndianInt(b + q + 12); total += (size_t)len; q += 16 + (size_t)len * 2; } }
  pool.assign(total + USER_FLOATS + 16, 0.f);
  eng = std::make_unique<Engine>();
  eng->init((float)sr, pool.data()); eng->poolCap = (int)pool.size();
  for (int i = 0; i < count && o + 16 <= n; i++) {
    float r, bpm; int slices, len;
    std::memcpy(&r, b + o, 4); std::memcpy(&bpm, b + o + 4, 4); std::memcpy(&slices, b + o + 8, 4); std::memcpy(&len, b + o + 12, 4); o += 16;
    float* w = eng->poolWrite(); const int16_t* pcm = (const int16_t*)(b + o);
    for (int k = 0; k < len; k++) w[k] = (float)juce::ByteOrder::swapIfBigEndian((uint16_t)pcm[k]) / 32768.f;
    o += (size_t)len * 2; eng->addSample(len, r, bpm, slices);
  }
  bundled = eng->nSmp; bundledUsed = eng->poolUsed;
  formats.registerBasicFormats();

  // ---- automatable parameters: what you would want to ride or draw in Ableton
  std::fill(std::begin(hostOf), std::end(hostOf), -1);
  struct Def { juce::String id, name; HostP h; };
  std::vector<Def> defs;
  auto g = [&](int id, const char* key, const char* name, float lo, float hi, int steps = 0) { defs.push_back({ key, name, { id, lo, hi, steps } }); };
  g(G_MASTER, "master", "Master Volume", 0, 1); g(G_DRIVE, "drive", "Master Drive", 0, 1); g(G_COMP, "comp", "Master Comp", 0, 1);
  g(G_SWING, "swing", "Swing", 0, 0.6f); g(G_HUMAN, "human", "Human", 0, 1); g(G_WIDTH, "width", "Width", 0, 1.5f);
  g(G_REVSIZE, "revsize", "Reverb Size", 0, 1); g(G_REVTONE, "revtone", "Reverb Tone", 0, 1);
  g(G_DLYTIME, "dlytime", "Delay Time", 0, 7, 8); g(G_DLYFB, "dlyfb", "Delay Feedback", 0, 0.95f); g(G_DLYTONE, "dlytone", "Delay Tone", 0, 1);
  g(G_DUCKTIME, "ducktime", "Duck Time", 0.02f, 1); g(G_STUTLEN, "stutlen", "Stutter Length", 0, 3, 4);
  defs.push_back({ "pattern", "Pattern", { -100, 0, 15, 16 } });
  // PULSAR 2: the performance pad, note repeat and pad velocity (appended: the older parameters keep their places)
  for (int k = 0; k < 16; k++) defs.push_back({ "fx" + juce::String(k), juce::String("FX ") + FXN[k], { -1 - k, 0, 1, 2 } });
  struct TK { int k; const char* key; const char* name; float lo, hi; };
  const TK tks[] = { { T_LEVEL, "lvl", "Level", 0, 1 }, { T_PAN, "pan", "Pan", -1, 1 }, { T_TUNE, "tune", "Tune", -24, 24 }, { T_DECAY, "dec", "Decay", 0, 1 },
                     { T_CUT, "cut", "Cutoff", 0, 1 }, { T_RES, "res", "Reso", 0, 1 }, { T_DRIVE, "drv", "Drive", 0, 1 },
                     { T_SENDR, "rev", "Reverb Send", 0, 1 }, { T_SENDD, "dly", "Delay Send", 0, 1 } };
  for (int t = 0; t < NT; t++) for (auto& k : tks)
    defs.push_back({ "t" + juce::String(t + 1) + k.key, "Track " + juce::String(t + 1) + " " + k.name, { TPID(t, k.k), k.lo, k.hi, 0 } });
  g(XG_ID(XG_XYON), "xyon", "XY Pad On", 0, 1, 2); g(XG_ID(XG_XYX), "xyx", "XY Pad X (Filter)", -1, 1); g(XG_ID(XG_XYY), "xyy", "XY Pad Y (Space)", 0, 1);
  g(XG_ID(XG_REPEAT), "repeat", "Note Repeat", 0, 4, 5);
  for (int t = 0; t < NT; t++) {
    const juce::String n = "Track " + juce::String(t + 1);
    defs.push_back({ "t" + juce::String(t + 1) + "punch", n + " Punch", { TXID(t, XT_PUNCH), 0, 1, 0 } });
    defs.push_back({ "t" + juce::String(t + 1) + "comp", n + " Comp", { TXID(t, XT_COMP), 0, 1, 0 } });
    defs.push_back({ "t" + juce::String(t + 1) + "low", n + " Low", { TXID(t, XT_LOW), -1, 1, 0 } });
    defs.push_back({ "t" + juce::String(t + 1) + "high", n + " High", { TXID(t, XT_HIGH), -1, 1, 0 } });
  }

  lastHost = std::make_unique<std::atomic<float>[]>(defs.size());
  for (size_t i = 0; i < defs.size(); i++) {
    auto& d = defs[i]; hp.push_back(d.h); const int ix = (int)i;
    const float init = d.h.eng >= 0 ? eng->params[d.h.eng] : 0.f;
    const float def = d.h.eng >= 0 ? normOf(ix, init) : 0.f;
    auto attrs = juce::AudioParameterFloatAttributes().withStringFromValueFunction([this, ix](float v, int) {
      const auto& h = hp[(size_t)ix]; const float x = denorm(ix, v);
      if (h.eng <= -1 && h.eng > -100) return juce::String(v >= 0.5f ? "ON" : "OFF");
      if (h.eng == -100) return juce::String::charToString((juce::juce_wchar)('A' + (int)x));
      if (h.eng == G_DLYTIME) return juce::String(DLYDIV[juce::jlimit(0, 7, (int)x)]);
      if (h.eng == G_STUTLEN) return juce::String(STUT[juce::jlimit(0, 3, (int)x)]);
      if (h.eng == XG_ID(XG_REPEAT)) { static const char* R[5] = { "OFF", "1/8", "1/16", "1/32", "1/16T" }; return juce::String(R[juce::jlimit(0, 4, (int)x)]); }
      if (h.eng == XG_ID(XG_XYON)) return juce::String(x >= 0.5f ? "ON" : "OFF");
      if (h.eng >= X_BASE + XG_NGLOBAL && ((h.eng - X_BASE - XG_NGLOBAL) % XT_NPARAM == XT_LOW || (h.eng - X_BASE - XG_NGLOBAL) % XT_NPARAM == XT_HIGH)) return (x > 0 ? "+" : "") + juce::String(x * 12.f, 1) + " dB";
      if (h.eng >= G_NGLOBAL && (h.eng - G_NGLOBAL) % T_NPARAM == T_TUNE) return (x > 0 ? "+" : "") + juce::String(x, 1) + " st";
      if (h.eng >= G_NGLOBAL && (h.eng - G_NGLOBAL) % T_NPARAM == T_PAN) return std::abs(x) < 0.02f ? juce::String("C") : (x < 0 ? "L" : "R") + juce::String(juce::roundToInt(std::abs(x) * 100));
      return juce::String(juce::roundToInt(v * 100)) + "%"; });
    juce::NormalisableRange<float> range(0.f, 1.f, d.h.steps > 1 ? 1.f / (float)(d.h.steps - 1) : 0.f);
    auto* p = new juce::AudioParameterFloat(juce::ParameterID { d.id, 1 }, d.name, range, def, attrs);
    addParameter(p); params.push_back(p); lastHost[i] = def;
    if (d.h.eng >= 0) hostOf[d.h.eng] = ix;
  }
}

bool PulsarProcessor::isBusesLayoutSupported(const BusesLayout& l) const {
  if (l.getMainOutputChannelSet() != juce::AudioChannelSet::stereo()) return false;
  for (int k = 1; k < l.outputBuses.size(); k++) { const auto& c = l.outputBuses.getReference(k); if (!c.isDisabled() && c != juce::AudioChannelSet::stereo()) return false; }
  return true;
}

void PulsarProcessor::prepareToPlay(double rate, int) {
  if (std::abs(rate - sr) < 1) return;
  const juce::SpinLock::ScopedLockType sl(lock);
  // a new rate: the engine starts again at that rate with the same project and samples (each sample keeps its own rate)
  auto keep = std::make_unique<Engine>(*eng);
  eng->init((float)rate, pool.data()); sr = rate;
  std::copy(keep->params, keep->params + P_COUNT, eng->params);
  eng->held = 0;
  std::memcpy(eng->pat, keep->pat, sizeof(eng->pat)); std::memcpy(eng->song, keep->song, sizeof(eng->song));
  eng->songLen = keep->songLen; eng->songOn = keep->songOn; eng->cur = keep->cur; eng->liveFX = keep->liveFX;
}

void PulsarProcessor::setHostFromEngine(int i, bool gesture) {
  auto* p = params[(size_t)i]; const auto& h = hp[(size_t)i];
  float v = h.eng >= 0 ? normOf(i, eng->params[h.eng]) : h.eng == -100 ? eng->cur / 15.f : ((uiFX >> (-1 - h.eng)) & 1) ? 1.f : 0.f;
  lastHost[(size_t)i] = v;
  if (std::abs(p->getValue() - v) < 1e-5f) return;
  if (gesture) p->beginChangeGesture();
  p->setValueNotifyingHost(v);
  if (gesture) p->endChangeGesture();
}

void PulsarProcessor::applyHost() {
  Engine& E = *eng; uint16_t fx = uiFX; bool fxCh = false;
  for (size_t i = 0; i < hp.size(); i++) {
    const float v = params[i]->getValue(); if (v == lastHost[i].load(std::memory_order_relaxed)) continue;
    lastHost[i] = v; const auto& h = hp[i];
    if (h.eng >= 0) E.setParam(h.eng, denorm((int)i, v));
    else if (h.eng == -100) { if (!E.songOn) E.select((int)denorm((int)i, v), !E.playing); }
    else { const int k = -1 - h.eng; fx = (uint16_t)(v >= 0.5f ? fx | (1 << k) : fx & ~(1 << k)); fxCh = true; }
  }
  if (fxCh) { uiFX = fx; E.liveFX = fx; if (!E.playing) E.fxNow = fx; }
}

void PulsarProcessor::startAt(double ppq, double bpm) {
  Engine& E = *eng; E.stop(); E.play();
  double steps = juce::jmax(0.0, ppq * 4.0); const int cyc = juce::jmax(1, E.cycleSteps());
  steps = std::fmod(steps, (double)cyc);
  E.skip(steps * 60.0 / bpm / 4.0 * sr);
}

void PulsarProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) {
  juce::ScopedNoDenormals nd;
  const int n = buffer.getNumSamples();
  const juce::SpinLock::ScopedLockType sl(lock);
  Engine& E = *eng;
  applyHost();
  // the DAW's transport: when it plays, PULSAR plays with it, on its tempo and on its bar
  bool hpl = false; double bpm = 120, ppq = 0; bool hasPpq = false;
  if (auto* ph = getPlayHead()) if (auto pos = ph->getPosition()) {
    hpl = pos->getIsPlaying(); if (auto b = pos->getBpm()) bpm = *b; if (auto q = pos->getPpqPosition()) { ppq = *q; hasPpq = true; } }
  bpm = juce::jlimit(20.0, 400.0, bpm);
  E.hostSync = hpl; E.hostPlaying = hpl; E.hostBpm = (float)bpm;
  if (hpl && !hostWasPlaying) { startAt(hasPpq ? ppq : 0, bpm); hostStarted = true; }
  else if (hpl && hasPpq && std::abs(ppq - (lastPpq + lastBlockBeats)) > 0.2) startAt(ppq, bpm);     // a loop or a jump in the arrangement
  else if (!hpl && hostWasPlaying && hostStarted) { E.stop(); hostStarted = false; }
  hostWasPlaying = hpl; lastPpq = ppq; lastBlockBeats = n / sr * bpm / 60.0;

  // the main output and the buses the DAW has turned on
  auto main = getBusBuffer(buffer, false, 0);
  float* L = main.getWritePointer(0); float* R = main.getNumChannels() > 1 ? main.getWritePointer(1) : nullptr;
  std::vector<float> tmp; float* RR = R; if (!RR) { tmp.resize((size_t)n); RR = tmp.data(); }
  float* bl[NBUS] = {}; float* br[NBUS] = {}; bool anyBus = false;
  for (int k = 0; k < NBUS && k + 1 < getBusCount(false); k++) {
    if (!getBus(false, k + 1)->isEnabled()) continue;
    auto b = getBusBuffer(buffer, false, k + 1); if (b.getNumChannels() < 2) continue;
    b.clear(); bl[k] = b.getWritePointer(0); br[k] = b.getWritePointer(1); anyBus = true;
  }
  float** BL = anyBus ? bl : nullptr; float** BR = anyBus ? br : nullptr;
  juce::MidiBuffer out;
  auto run = [&](int from, int len) {
    if (len <= 0) return;
    float* pl[NBUS]; float* pr[NBUS]; for (int k = 0; k < NBUS; k++) { pl[k] = bl[k] ? bl[k] + from : nullptr; pr[k] = br[k] ? br[k] + from : nullptr; }
    E.nev = 0; E.process(L + from, RR + from, len, BL ? pl : nullptr, BR ? pr : nullptr);
    if (rsLen > 0 && !rsDone.load()) {                         // RESAMPLE: one loop of the main output, from the pattern's start
      int i0 = len; if (rsArm) { if (E.loopAt >= 0) { rsArm = false; i0 = E.loopAt; } } else i0 = 0;
      for (int i = i0; i < len && rsN < rsLen; i++) rsBuf[(size_t)rsN++] = (L[from + i] + RR[from + i]) * 0.5f;
      if (!rsArm && rsN >= rsLen) rsDone = true; }
    // what played goes out as MIDI too (note 36 + track, channel 10): drive other instruments or record it in the DAW
    for (int e = 0; e < E.nev; e++) { const int at = from + juce::jlimit(0, len - 1, E.ev[e].at), note = 36 + E.ev[e].t;
      out.addEvent(juce::MidiMessage::noteOn(10, note, (juce::uint8)E.ev[e].vel), at);
      if (offs.size() < 2000) offs.push_back({ note, at + (int)(sr * 0.06) }); }
    E.nev = 0;
  };
  int done = 0;
  for (const auto meta : midi) {
    const int at = juce::jlimit(0, n, meta.samplePosition);
    if (at > done) { run(done, at - done); done = at; }
    const auto m = meta.getMessage();
    if (m.isNoteOn() && m.getNoteNumber() >= 36 && m.getNoteNumber() < 36 + NT) E.padDown(m.getNoteNumber() - 36, m.getVelocity());
    else if (m.isNoteOff() && m.getNoteNumber() >= 36 && m.getNoteNumber() < 36 + NT) E.padUp(m.getNoteNumber() - 36);
    else if (m.isController()) midiCC(m.getControllerNumber(), m.getControllerValue());
  }
  if (n > done) run(done, n - done);
  // note-offs due in this block; the rest wait for the next ones
  for (size_t i = 0; i < offs.size();) { if (offs[i].at < n) { out.addEvent(juce::MidiMessage::noteOff(10, offs[i].note), juce::jmax(0, offs[i].at)); offs[i] = offs.back(); offs.pop_back(); } else { offs[i].at -= n; i++; } }
  midi.swapWith(out);
}

// MIDI learn: right-click a control on the page, move a knob on your controller; that CC rides it from then on
void PulsarProcessor::midiCC(int cc, int v) {
  if (cc < 0 || cc > 127) return;
  if (learnArm >= 0) { for (auto& x : learn) if (x == learnArm) x = -1; learn[(size_t)cc] = learnArm; learnArm = -1; learnDone = cc; }
  const int i = learn[(size_t)cc]; if (i < 0 || i >= (int)hp.size()) return;
  const float x = (float)v / 127.f; const auto& h = hp[(size_t)i]; Engine& E = *eng;
  if (h.eng >= 0) E.setParam(h.eng, denorm(i, x));
  else if (h.eng == -100) { if (!E.songOn) E.select((int)denorm(i, x), !E.playing); }
  else { const int k = -1 - h.eng; uiFX = (uint16_t)(x >= 0.5f ? uiFX | (1 << k) : uiFX & ~(1 << k)); E.liveFX = uiFX; if (!E.playing) E.fxNow = uiFX; }
  ccTouched.store(i);
}

// ---------------------------------------------------------------- the page
void PulsarProcessor::message(const juce::var& m) {
  const juce::String t = m["t"].toString();
  std::vector<int> touched;
  { const juce::SpinLock::ScopedLockType sl(lock); Engine& E = *eng;
    if (t == "param") { int id = (int)m["id"]; E.setParam(id, (float)(double)m["v"]); if (id >= 0 && id < P_COUNT && hostOf[id] >= 0) touched.push_back(hostOf[id]); }
    else if (t == "params") { if (auto* a = m["list"].getArray()) for (auto& e : *a) { int id = (int)e[0]; E.setParam(id, (float)(double)e[1]); if (id >= 0 && id < P_COUNT && hostOf[id] >= 0) touched.push_back(-1 - hostOf[id]); } }
    else if (t == "play") { E.play(); hostStarted = false; }
    else if (t == "stop") { E.stop(); hostStarted = false; }
    else if (t == "select") { E.select((int)m["p"], (bool)m["now"]); }
    else if (t == "rec") { E.rec = (bool)m["on"]; E.perfTake = false; }
    else if (t == "fx") { const int mask = (int)m["mask"]; const uint16_t old = uiFX; uiFX = (uint16_t)mask; E.liveFX = uiFX; if (!E.playing) E.fxNow = uiFX;
      for (int k = 0; k < 16; k++) if (((old ^ uiFX) >> k) & 1) for (size_t i = 0; i < hp.size(); i++) if (hp[i].eng == -1 - k) touched.push_back((int)i); }
    else if (t == "fill") { E.fillHeld = (bool)m["on"]; }
    else if (t == "pad") { E.padDown((int)m["t2"], (int)m["vel"]); }
    else if (t == "padUp") { E.padUp((int)m["t2"]); }
    else if (t == "resample") { const int len = juce::jlimit(256, (int)(sr * 30), (int)m["len"]); if (!rsDone.load()) { rsBuf.assign((size_t)len, 0.f); rsLen = len; rsN = 0; rsArm = true; } }
    else if (t == "learn") { const juce::String key = m["key"].toString(); learnArm = -1;
      for (size_t i = 0; i < hp.size(); i++) if (params[i]->getParameterID() == key) learnArm = (int)i;
      if (key == "clear") { learn.fill(-1); } else if (key.startsWith("forget:")) { for (auto& x : learn) if (x >= 0 && params[(size_t)x]->getParameterID() == key.substring(7)) x = -1; } }
    else if (t == "song") {
      juce::MemoryOutputStream mo; juce::Base64::convertFromBase64(mo, m["bytes"]["u8"].toString());
      const uint8_t* d = (const uint8_t*)mo.getData(); const int nb = (int)juce::jmin<size_t>(mo.getDataSize(), sizeof(E.song));
      std::memcpy(E.song, d, (size_t)nb); E.songLen = juce::jlimit(0, SONGMAX, (int)m["n"]); E.songOn = (bool)m["on"]; }
  }
  // what the page changed goes to the DAW too, so Ableton can record it as automation
  for (int i : touched) setHostFromEngine(i < 0 ? -1 - i : i, i >= 0);
}

juce::String PulsarProcessor::patternB64(int p) {
  const juce::SpinLock::ScopedLockType sl(lock);
  p = juce::jlimit(0, NPAT - 1, p); return juce::Base64::toBase64(&eng->pat[p], sizeof(Pattern));
}
void PulsarProcessor::setPattern(int p, const juce::String& b64) {
  juce::MemoryOutputStream mo; if (!juce::Base64::convertFromBase64(mo, b64) || mo.getDataSize() < sizeof(Pattern)) return;
  const juce::SpinLock::ScopedLockType sl(lock);
  std::memcpy(&eng->pat[juce::jlimit(0, NPAT - 1, p)], mo.getData(), sizeof(Pattern));
}

juce::var PulsarProcessor::projectForPage() {
  const juce::SpinLock::ScopedLockType sl(lock); Engine& E = *eng;
  juce::DynamicObject::Ptr o = new juce::DynamicObject();
  juce::Array<juce::var> ps, pats, song, us;
  for (int i = 0; i < P_COUNT; i++) ps.add(E.params[i]);
  for (int p = 0; p < NPAT; p++) pats.add(juce::Base64::toBase64(&E.pat[p], sizeof(Pattern)));
  for (int i = 0; i < E.songLen; i++) { juce::Array<juce::var> e; e.add((int)E.song[i].pat); e.add((int)E.song[i].rep); song.add(e); }
  for (size_t i = 0; i < user.size(); i++) { juce::DynamicObject::Ptr u = new juce::DynamicObject(); u->setProperty("name", user[i].name); u->setProperty("idx", bundled + (int)i); u->setProperty("bpm", user[i].bpm); us.add(juce::var(u.get())); }
  o->setProperty("params", ps); o->setProperty("pats", pats); o->setProperty("song", song); o->setProperty("songOn", E.songOn);
  { juce::DynamicObject::Ptr lm = new juce::DynamicObject(); for (int c = 0; c < 128; c++) if (learn[(size_t)c] >= 0) lm->setProperty(params[(size_t)learn[(size_t)c]]->getParameterID(), c); o->setProperty("learn", juce::var(lm.get())); }
  o->setProperty("ui", uiJson); o->setProperty("user", us); o->setProperty("bundled", bundled); o->setProperty("playing", E.playing); o->setProperty("fx", (int)uiFX);
  return juce::var(o.get());
}

int PulsarProcessor::addUserSampleFloats(const juce::String& name, const float* d, int len, float rate, float bpm, int slices) {
  const juce::SpinLock::ScopedLockType sl(lock);
  if (eng->poolFree() < len || eng->nSmp >= MAXSMP) return -1;
  std::memcpy(eng->poolWrite(), d, (size_t)len * sizeof(float));
  const int idx = eng->addSample(len, rate, bpm, slices);
  if (idx >= 0) user.push_back({ name, rate, bpm, slices, std::vector<float>(d, d + len) });
  return idx;
}

juce::var PulsarProcessor::loadUserSample(const juce::File& f) {
  std::unique_ptr<juce::AudioFormatReader> r(formats.createReaderFor(f));
  if (!r) return {};
  const int len = (int)juce::jmin<juce::int64>(r->lengthInSamples, (juce::int64)(r->sampleRate * 60));
  juce::AudioBuffer<float> b((int)juce::jmax(1u, juce::jmin(2u, r->numChannels)), len);
  r->read(&b, 0, len, 0, true, true);
  std::vector<float> mono((size_t)len);
  for (int i = 0; i < len; i++) { float s = 0; for (int c = 0; c < b.getNumChannels(); c++) s += b.getSample(c, i); mono[(size_t)i] = s / (float)b.getNumChannels(); }
  // a loop of 1, 2, 4 or 8 bars between 80 and 180 BPM is a break: it gets its tempo and is sliced
  const double secs = len / r->sampleRate; float bpm = 0; int bars = 0;
  if (secs > 1.2) for (int bb : { 1, 2, 4, 8 }) { double x = bb * 240.0 / secs; if (x >= 80 && x <= 180) { bpm = (float)(std::round(x * 10) / 10); bars = bb; break; } }
  const juce::String name = f.getFileNameWithoutExtension();
  const int idx = addUserSampleFloats(name, mono.data(), len, (float)r->sampleRate, bpm, bars ? bars * 16 : 16);
  if (idx < 0) return {};
  juce::DynamicObject::Ptr o = new juce::DynamicObject();
  o->setProperty("name", name); o->setProperty("idx", idx); o->setProperty("bpm", bpm); o->setProperty("bars", bars);
  return juce::var(o.get());
}

juce::var PulsarProcessor::ccInfo(int i) {
  juce::DynamicObject::Ptr o = new juce::DynamicObject(); if (i < 0 || i >= (int)hp.size()) return {};
  const auto& h = hp[(size_t)i]; o->setProperty("key", paramKey(i)); o->setProperty("id", h.eng);
  o->setProperty("v", h.eng >= 0 ? (double)eng->params[h.eng] : h.eng == -100 ? (double)eng->cur : 0.0); o->setProperty("fx", (int)uiFX);
  return juce::var(o.get());
}

juce::var PulsarProcessor::takeResample() {
  if (!rsDone.load()) return {};
  std::vector<float> d; float bpm; { const juce::SpinLock::ScopedLockType sl(lock); d.swap(rsBuf); rsLen = 0; rsN = 0; rsArm = false; bpm = eng->bpm(); }
  rsDone = false;
  const double bars = d.size() / sr * bpm / 240.0; const int nb = juce::jmax(1, (int)std::lround(bars));
  const juce::String name = "RESAMPLE " + juce::String(user.size() + 1);
  const int idx = addUserSampleFloats(name, d.data(), (int)d.size(), (float)sr, bpm, nb * 16);
  juce::DynamicObject::Ptr o = new juce::DynamicObject(); o->setProperty("name", name); o->setProperty("idx", idx); o->setProperty("bpm", bpm); o->setProperty("bars", nb);
  return juce::var(o.get());
}

void PulsarProcessor::snapshot(std::vector<float>& tele, std::vector<float>& scope) {
  const juce::SpinLock::ScopedLockType sl(lock);
  tele.assign(eng->tele, eng->tele + 64);
  scope.resize(256); const int w = eng->scopeW;
  for (int k = 0; k < 256; k++) scope[(size_t)k] = eng->scope[(w - 256 + k + 512) & 511];
}

// ---------------------------------------------------------------- the DAW saves and restores the whole project with the set
void PulsarProcessor::getStateInformation(juce::MemoryBlock& dest) {
  juce::MemoryOutputStream o(dest, false);
  const juce::SpinLock::ScopedLockType sl(lock); Engine& E = *eng;
  o.writeInt(0x50534c31); o.writeInt(1); o.writeInt(P_COUNT);
  for (int i = 0; i < P_COUNT; i++) o.writeFloat(E.params[i]);
  o.writeInt(NPAT); o.writeInt((int)sizeof(Pattern)); o.write(E.pat, sizeof(E.pat));
  o.writeInt(E.songLen); o.writeBool(E.songOn); o.write(E.song, sizeof(E.song));
  o.writeInt(E.cur); o.writeInt(uiFX);
  o.writeString(uiJson);
  o.writeInt((int)user.size());
  for (auto& u : user) { o.writeString(u.name); o.writeFloat(u.sr); o.writeFloat(u.bpm); o.writeInt(u.slices); o.writeInt((int)u.d.size());
    for (float s : u.d) o.writeShort((short)juce::jlimit(-32768, 32767, (int)std::lround(s * 32767.f))); }
  // 2.0: the MIDI learn map (CC -> parameter ID), after everything 1.0 wrote
  o.writeInt(0x4c524e32); int nl = 0; for (int x : learn) if (x >= 0) nl++; o.writeInt(nl);
  for (int c = 0; c < 128; c++) if (learn[(size_t)c] >= 0) { o.writeInt(c); o.writeString(params[(size_t)learn[(size_t)c]]->getParameterID()); }
}
void PulsarProcessor::setStateInformation(const void* data, int size) {
  juce::MemoryInputStream in(data, (size_t)size, false);
  if (in.readInt() != 0x50534c31) return; in.readInt();
  const int np = in.readInt(); std::vector<float> ps((size_t)np); for (auto& v : ps) v = in.readFloat();
  const int npat = in.readInt(), psz = in.readInt(); if (npat != NPAT || psz != (int)sizeof(Pattern)) return;
  auto pats = std::make_unique<Pattern[]>(NPAT); in.read(pats.get(), (int)sizeof(Pattern) * NPAT);
  const int songLen = in.readInt(); const bool songOn = in.readBool(); SongEntry song[SONGMAX]; in.read(song, (int)sizeof(song));
  const int cur = in.readInt(); const int fx = in.readInt();
  const juce::String ui = in.readString();
  std::vector<UserSample> us; const int nu = in.readInt();
  for (int i = 0; i < nu && !in.isExhausted(); i++) {
    UserSample u; u.name = in.readString(); u.sr = in.readFloat(); u.bpm = in.readFloat(); u.slices = in.readInt(); const int len = juce::jmax(0, in.readInt());
    u.d.resize((size_t)len); for (auto& s : u.d) s = in.readShort() / 32768.f; us.push_back(std::move(u)); }
  std::array<int, 128> lm; lm.fill(-1);
  if (!in.isExhausted() && in.readInt() == 0x4c524e32) { const int nl = in.readInt();
    for (int i = 0; i < nl && !in.isExhausted(); i++) { const int c = in.readInt(); const juce::String id = in.readString();
      for (size_t k = 0; k < params.size(); k++) if (params[k]->getParameterID() == id && c >= 0 && c < 128) lm[(size_t)c] = (int)k; } }
  { const juce::SpinLock::ScopedLockType sl(lock); Engine& E = *eng;
    E.stop(); for (int i = 0; i < juce::jmin(np, P_COUNT); i++) E.params[i] = ps[(size_t)i];
    std::memcpy(E.pat, pats.get(), sizeof(E.pat)); std::memcpy(E.song, song, sizeof(song)); E.songLen = juce::jlimit(0, SONGMAX, songLen); E.songOn = songOn;
    E.cur = juce::jlimit(0, NPAT - 1, cur); uiFX = (uint16_t)fx; E.liveFX = uiFX; E.fxNow = uiFX; uiJson = ui;
    E.nSmp = bundled; E.poolUsed = bundledUsed; user.clear(); learn = lm; E.held = 0; }
  for (auto& u : us) addUserSampleFloats(u.name, u.d.data(), (int)u.d.size(), u.sr, u.bpm, u.slices);
  for (size_t i = 0; i < hp.size(); i++) setHostFromEngine((int)i, false);
}

juce::AudioProcessorEditor* PulsarProcessor::createEditor() { return new PulsarEditor(*this); }
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new PulsarProcessor(); }
