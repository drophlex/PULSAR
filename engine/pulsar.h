// PULSAR · a drum machine for broken beats — engine (header only, no libc, no allocation)
// The same code runs in the browser (WebAssembly), in the VST3/AU plug-in (JUCE) and is the reference for the FM-1.
// Created at Polaris Sound Lab · Dark Funk Durcal design
#pragma once
#include "dsp.h"

namespace pulsar {

constexpr int NT = 16, NS = 64, NPAT = 16, NLANE = 12, SONGMAX = 64, MAXSMP = 192;
constexpr int POOL = 16 * 1024 * 1024;                 // sample memory (floats): ~6 min at 44.1 kHz

// ------------------------------------------------------------------ pattern data (shared byte layout with the UI)
struct Step { int8_t vel; uint8_t prob, rat, rprob; int8_t mic, pit; uint8_t cond, slice; };   // 8 bytes; vel 0 = no trig
// rat: low 4 bits = count (0/1 = single, 2..8), high 4 bits = mode (0 even, 1 crescendo, 2 decrescendo, 3 pitch up, 4 pitch down, 5 accelerate)
// cond: 0 always, 1..9 = 1:2 2:2 1:3 2:3 3:3 1:4 2:4 3:4 4:4, 10 FILL, 11 NOT FILL, 12 FIRST, 13 NOT FIRST
// slice: 255 = follow the step (breaks), else the slice to play
struct TrackPat { uint8_t len, speed, dir, mute; uint8_t pad[4]; Step s[NS]; };          // 8 + 512
struct Lane { int8_t track, param; uint8_t used, pad; int8_t v[NS]; };                    // motion: -1 = none, 0..127
struct Pattern { uint8_t len, swing, pad[6]; TrackPat t[NT]; uint16_t perf[NS]; Lane m[NLANE]; };
struct SongEntry { uint8_t pat, rep; };

// ------------------------------------------------------------------ parameters
enum TP {   // per track
  T_MODE, T_SYN, T_SMP, T_TUNE, T_DECAY, T_TONE, T_SNAP, T_DRIVE, T_ERA, T_STRETCH, T_START, T_REV,
  T_CUT, T_RES, T_FTYPE, T_LEVEL, T_PAN, T_SENDR, T_SENDD, T_CHOKE, T_DUCK, T_SWING, T_ROLE, T_ATK, T_NPARAM = 24 };
enum GP {   // global
  G_BPM, G_SWING, G_MASTER, G_REVSIZE, G_REVTONE, G_DLYTIME, G_DLYFB, G_DLYTONE, G_COMP, G_DRIVE, G_DUCKSRC, G_DUCKTIME,
  G_STUTLEN, G_HUMAN, G_WIDTH, G_NGLOBAL = 16 };
inline int TPID(int t, int k) { return G_NGLOBAL + t * T_NPARAM + k; }
// v2 parameters, appended after the original 400 so older projects, sets and automation keep their numbers
constexpr int X_BASE = G_NGLOBAL + NT * T_NPARAM;
enum XG { XG_XYON, XG_XYX, XG_XYY, XG_REPEAT, XG_VELSENS, XG_DV, XG_DVTONE, XG_LIMIT, XG_NGLOBAL = 8 };   // performance pad, note repeat rate, pad velocity;
// PULSAR 3 (in the three free slots, so nothing moves): DIRTY VOLTAGE amount and tone, the safety limiter
enum XT { XT_PUNCH, XT_COMP, XT_LOW, XT_HIGH, XT_OUT, XT_LOCK, XT_ROUTE, XT_HWNOTE, XT_NPARAM = 8 };  // per track: transient, glue, EQ, output bus, generator lock;
// PULSAR 3 HYPERLINK (the two free slots): where the track plays (PULSAR, the TR-8 over MIDI, both, alternating, muted) and its TR-8 note
enum ROUTE { RT_PULSAR, RT_HW, RT_BOTH, RT_ALT, RT_MUTE, RT_COUNT };
// the original TR-8's notes (Roland's MIDI implementation chart, without the 7X7 expansion), as the default per track
constexpr uint8_t TR8_NOTE[16] = { 36, 38, 39, 42, 46, 0, 0, 37, 43, 49, 0, 47, 51, 0, 0, 50 };
inline int XG_ID(int k) { return X_BASE + k; }
inline int TXID(int t, int k) { return X_BASE + XG_NGLOBAL + t * XT_NPARAM + k; }
constexpr int P_COUNT = X_BASE + XG_NGLOBAL + NT * XT_NPARAM;
constexpr int NBUS = 8;                                                         // extra stereo outputs (the plug-in's multi-out)
enum MODE { M_SYNTH, M_SAMPLE, M_BREAK };
enum SYN { S_KICK, S_BOOM, S_HARD, S_SNARE, S_CLAP, S_HAT, S_OPEN, S_RIDE, S_TOM, S_RIM, S_COWBELL, S_FM, S_ZAP, S_NOISE, S_COUNT };
enum ERA { E_CLEAN, E_SP12, E_S950, E_AMIGA, E_MPC, E_COUNT };
enum PERF { F_STUTTER, F_ROLL, F_DRILL, F_GLITCH, F_REVERSE, F_TAPESTOP, F_CRUSH, F_FILTER, F_RISE, F_HALF, F_DOUBLE, F_GATE,
  F_DUB, F_WARP, F_DROP, F_FILL };
enum ROLE { R_KICK, R_SNARE, R_HAT, R_PERC, R_BREAK, R_CYM };

struct Sample { int off = 0, len = 0; float sr = 44100, bpm = 0; int slices = 16; };

// ------------------------------------------------------------------ one voice
struct Voice {
  bool on = false; int t = 0; float age = 0, sr = 48000, vel = 1, pitch = 0;    // pitch in semitones
  float fade = 1, fadeK = 0;                                                     // click-free steal
  // synth state
  float ph[6] = {0, 0, 0, 0, 0, 0}, env = 0, penv = 0, nz = 0; SVF f1, f2; Rng rnd;
  // sample state
  const Sample* S = nullptr; double pos = 0; double tl = 0; float rate = 1, tlRate = 1; int end = 0, begin = 0; bool rev = false, stretch = false;
  float g1 = 0, g2 = 0; double h1 = 0, h2 = 0; int grain = 1100;              // two-head granular time stretch
  float hold = 0, eraPh = 1; SVF eraF; float clapT = 0;
};

struct Engine {
  float sr = 48000; Rng rng;
  float params[P_COUNT];
  Pattern pat[NPAT]; SongEntry song[SONGMAX]; int songLen = 0; bool songOn = false;
  Sample smp[MAXSMP]; int nSmp = 0; int poolUsed = 0; float* pool = nullptr; int poolCap = POOL; bool silent = false;
  Voice vo[NT][2]; int vcur[NT];
  // transport
  bool playing = false, rec = false, fillHeld = false; int cur = 0, queued = -1, songPos = 0, songRep = 0; bool queueBar = false;   // queueBar: switch at the next bar, not the pattern's end
  double mClock = 0; int mStep = 0, mLoop = 0;                   // master 1/16 grid (pattern length, perf lanes, motion)
  double tClock[NT]; int tStep[NT], tLoop[NT];                    // each track: own length and speed (polymeter)
  struct Pend { float at; int8_t vel; int8_t pit; uint8_t slice, ratIdx; float panJ; bool warp; } pend[NT][24]; int npend[NT];
  uint16_t liveFX = 0, fxNow = 0, fxPrev = 0; bool perfTake = false; bool lastCond[NT];
  // mixer state
  SVF tf[NT][2]; float tDrive[NT], tGainL[NT], tGainR[NT], meter[NT];
  float pkFast[NT], pkSlow[NT], cpEnv[NT], eqLo[NT], eqHi[NT];                  // PUNCH, COMP, EQ state
  // note repeat (hold a pad): the pads held, their velocity, each one's clock
  uint16_t held = 0; int8_t heldVel[NT]; double rClock[NT];
  // what triggered in the last process() call: the plug-in sends it as MIDI
  struct Ev { int t, at, vel; uint8_t hw, note, cc, kind; } ev[256]; int nev = 0; int procPos = 0;   // kind 0: a hit (hw: also / only to the TR-8, note); 1: a CC to the TR-8
  struct HwCC { uint8_t cc, v, bar; } hq[32]; int nhq = 0; uint8_t altFlip[NT] = {};
  // a CC for the hardware: now, or on the next bar (the Scatter Director's changes land on the downbeat)
  void hwCC(int cc, int v, bool bar) { if (!bar || !playing) { if (nev < 256) { ev[nev] = { -1, procPos, 0, 1, 0, (uint8_t)clampi(cc, 0, 127), 1 }; ev[nev].vel = clampi(v, 0, 127); nev++; } return; }
    if (nhq < 32) hq[nhq++] = { (uint8_t)clampi(cc, 0, 127), (uint8_t)clampi(v, 0, 127), 1 }; }
  int loopAt = -1;                                     // where the pattern started again in the last process() call (resampling starts there), or -1
  float xyLp[2] = {0, 0}, xyHp[2] = {0, 0}, xyAmt = 0;
  float kAtkF = 0, kRelF = 0, kAtkS = 0, kRelS = 0, kCpA = 0, kCpR = 0, kLo = 0, kHi = 0;
  float coef(float sec) const { return 1.f - expf_(-1.f / maxf(1.f, sec * sr)); }
  float duckEnv = 0; float hostBpm = 0; bool hostSync = false, hostPlaying = false; double hostPpq = 0;
  // fx
  static constexpr int RLEN = 1 << 15; float rv[8][RLEN / 4 * 4]; int rvLen[8], rvW = 0; float rvLp[8];
  static constexpr int DLEN = 1 << 17; float dl[2][DLEN]; int dW = 0; float dLp[2];
  static constexpr int HLEN = 1 << 18; float hist[2][HLEN]; int hW = 0;       // master history for stutter / reverse / tape stop
  float stutStart = 0, stutLen = 0, stutPos = 0; float revPos = 0; float tapeRate = 1, tapePos = 0; float fxLpZ[2] = {0, 0}, fxHpZ[2] = {0, 0}, fxCut = 1, fxHp = 0;
  float crushHold[2] = {0, 0}, crushPh = 0; float compEnv = 0; float gatePh = 0;
  // ui / telemetry
  float tele[64]; int dirty = 0; int lastTrig[NT];
  // DIRTY VOLTAGE (PULSAR 3) and the safety limiter
  float dvHp[2] = {0, 0}, dvLp[2] = {0, 0}, dvLp2[2] = {0, 0}, dvHq[2] = {0, 0}, dvHq2[2] = {0, 0}, dvHo[2] = {0, 0}, dvHo2[2] = {0, 0}, dvPrev[2] = {0, 0}, dvTone[2] = {0, 0}, dvIn = 1e-6f, dvOut = 1e-6f, dvMk = 1, limG = 1, rmsAcc = 0, rmsDb = -90, limMin = 1, dvToneK = -1, mixPk = 0, dvSr = 0, dvAH = 0, dvAL = 0, dvTC = 0; int rmsN = 0;
  float scope[512]; int scopeW = 0;

  void init(float rate, float* mem) {
    sr = rate; pool = mem; for (int i = 0; i < P_COUNT; i++) params[i] = 0;
    params[G_BPM] = 120; params[G_SWING] = 0; params[G_MASTER] = 0.8f; params[G_REVSIZE] = 0.5f; params[G_REVTONE] = 0.6f;
    params[G_DLYTIME] = 3; params[G_DLYFB] = 0.4f; params[G_DLYTONE] = 0.6f; params[G_COMP] = 0.3f; params[G_DRIVE] = 0.f;
    params[G_DUCKSRC] = 0; params[G_DUCKTIME] = 0.35f; params[G_STUTLEN] = 1; params[G_HUMAN] = 0; params[G_WIDTH] = 1;
    params[XG_ID(XG_XYON)] = 0; params[XG_ID(XG_XYX)] = 0; params[XG_ID(XG_XYY)] = 0; params[XG_ID(XG_REPEAT)] = 0; params[XG_ID(XG_VELSENS)] = 1; params[XG_ID(XG_DV)] = 0; params[XG_ID(XG_DVTONE)] = 0.6f; params[XG_ID(XG_LIMIT)] = 1;
    held = 0; nev = 0;
    kAtkF = coef(0.0003f); kRelF = coef(0.15f); kAtkS = coef(0.02f); kRelS = coef(0.15f); kCpA = 1.f; kCpR = coef(0.12f);
    kLo = 1.f - expf_(-TAU * 120.f / sr); kHi = 1.f - expf_(-TAU * 6000.f / sr);
    // everything that runs on survives no re-init (a new sample rate in the plug-in starts clean)
    duckEnv = 0; compEnv = 0; fxCut = 1; fxHp = 0; fxLpZ[0] = fxLpZ[1] = fxHpZ[0] = fxHpZ[1] = 0; crushHold[0] = crushHold[1] = 0; crushPh = 0; gatePh = 0;
    stutStart = stutLen = stutPos = revPos = 0; tapeRate = 1; tapePos = 0; xyLp[0] = xyLp[1] = xyHp[0] = xyHp[1] = 0; xyAmt = 0; hW = 0; dW = 0; rvW = 0;
    for (int t = 0; t < NT; t++) { float* p = params + TPID(t, 0);
      p[T_MODE] = M_SYNTH; p[T_SYN] = S_KICK; p[T_SMP] = -1; p[T_TUNE] = 0; p[T_DECAY] = 0.5f; p[T_TONE] = 0.5f; p[T_SNAP] = 0.5f;
      p[T_DRIVE] = 0; p[T_ERA] = E_CLEAN; p[T_STRETCH] = 1; p[T_START] = 0; p[T_REV] = 0; p[T_CUT] = 1; p[T_RES] = 0.1f; p[T_FTYPE] = 0;
      p[T_LEVEL] = 0.8f; p[T_PAN] = 0; p[T_SENDR] = 0; p[T_SENDD] = 0; p[T_CHOKE] = 0; p[T_DUCK] = 0; p[T_SWING] = 0; p[T_ROLE] = R_PERC; p[T_ATK] = 0;
      float* x = params + TXID(t, 0); x[XT_PUNCH] = 0; x[XT_COMP] = 0; x[XT_LOW] = 0; x[XT_HIGH] = 0; x[XT_OUT] = 0; x[XT_LOCK] = 0;
      pkFast[t] = pkSlow[t] = cpEnv[t] = eqLo[t] = eqHi[t] = 0; heldVel[t] = 0; rClock[t] = 0;
      vcur[t] = 0; for (auto& v : vo[t]) { v.sr = sr; v.t = t; v.rnd.s = 1234 + t * 77; } npend[t] = 0; lastCond[t] = true; lastTrig[t] = -1; meter[t] = 0; }
    for (int p = 0; p < NPAT; p++) clearPattern(p);
    const int rl[8] = {1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116};
    for (int i = 0; i < 8; i++) { rvLen[i] = (int)(rl[i] * sr / 44100.f); for (int j = 0; j < RLEN / 4 * 4; j++) rv[i][j] = 0; rvLp[i] = 0; }
    for (int c = 0; c < 2; c++) { for (int j = 0; j < DLEN; j++) dl[c][j] = 0; for (int j = 0; j < HLEN; j++) hist[c][j] = 0; dLp[c] = 0; }
    for (int i = 0; i < 64; i++) tele[i] = 0;
    resetClocks();
  }
  void clearPattern(int p) {
    Pattern& P = pat[p]; P.len = 16; P.swing = 0;
    for (int t = 0; t < NT; t++) { TrackPat& T = P.t[t]; T.len = 16; T.speed = 1; T.dir = 0; T.mute = 0;
      for (int s = 0; s < NS; s++) T.s[s] = Step{0, 100, 1, 100, 0, 0, 0, 255}; }
    for (int s = 0; s < NS; s++) P.perf[s] = 0;
    for (int l = 0; l < NLANE; l++) { P.m[l].used = 0; P.m[l].track = 0; P.m[l].param = 0; for (int s = 0; s < NS; s++) P.m[l].v[s] = -1; }
  }
  void resetClocks() { mClock = 0; mStep = 0; mLoop = 0; for (int t = 0; t < NT; t++) { tClock[t] = 0; tStep[t] = 0; tLoop[t] = 0; npend[t] = 0; } }

  // ---------------------------------------------------------------- samples
  int addSample(int len, float rate, float bpm, int slices) {          // the caller has written len floats at pool + poolUsed
    if (nSmp >= MAXSMP || poolUsed + len > poolCap) return -1;
    Sample& S = smp[nSmp]; S.off = poolUsed; S.len = len; S.sr = rate; S.bpm = bpm; S.slices = slices < 1 ? 16 : slices;
    poolUsed += len; return nSmp++;
  }
  float* poolWrite() { return pool + poolUsed; }
  int poolFree() const { return poolCap - poolUsed; }
  // jump the transport forward n samples without sounding (the plug-in uses it to land on the DAW's bar position)
  void skip(double n) {
    if (!playing) return; silent = true; const bool r = rec; rec = false;
    while (n >= 1) {
      double d = mClock; for (int t = 0; t < NT; t++) if (tClock[t] < d) d = tClock[t];
      if (d <= 1) { advance(1); n -= 1; for (int t = 0; t < NT; t++) npend[t] = 0; continue; }
      d = (double)(long long)(d - 1); if (d > n) d = (double)(long long)n; if (d < 1) d = 1;
      mClock -= d; for (int t = 0; t < NT; t++) tClock[t] -= d; n -= d;
    }
    for (int t = 0; t < NT; t++) npend[t] = 0; silent = false; rec = r;
  }
  // how many 1/16 steps one pass of the song (or a long stretch of the pattern) lasts
  int cycleSteps() const {
    if (songOn && songLen > 0) { int n = 0; for (int i = 0; i < songLen; i++) n += (pat[song[i].pat].len < 1 ? 16 : pat[song[i].pat].len) * (song[i].rep < 1 ? 1 : song[i].rep); return n; }
    return 64 * 16;
  }

  // ---------------------------------------------------------------- helpers
  inline float P(int t, int k) const { return params[TPID(t, k)]; }
  float bpm() const { return hostSync && hostBpm > 0 ? hostBpm : params[G_BPM]; }
  float speedMul(int sp) const { static const float m[6] = {2.f, 1.f, 0.5f, 2.f / 3.f, 4.f / 3.f, 0.25f}; return m[sp < 0 || sp > 5 ? 1 : sp]; }
  float stepSamples(float mul = 1) const {
    float b = bpm(); float r = 60.f / b / 4.f * sr * mul;
    if (fxNow & (1 << F_HALF)) r *= 2.f; if (fxNow & (1 << F_DOUBLE)) r *= 0.5f; return r; }

  void setParam(int id, float v) {
    if (id < 0 || id >= P_COUNT) return; params[id] = v;
    if (rec && playing && id >= G_NGLOBAL) {               // motion recording: knob moves land on the current step
      int t = (id - G_NGLOBAL) / T_NPARAM, k = (id - G_NGLOBAL) % T_NPARAM;
      if (k >= T_TUNE && k != T_ERA && k != T_STRETCH && k != T_REV && k != T_FTYPE && k != T_CHOKE && k != T_ROLE) {
        Pattern& Pt = pat[cur]; int l = -1;
        for (int i = 0; i < NLANE; i++) if (Pt.m[i].used && Pt.m[i].track == t && Pt.m[i].param == k) l = i;
        if (l < 0) for (int i = 0; i < NLANE; i++) if (!Pt.m[i].used) { l = i; Pt.m[i].used = 1; Pt.m[i].track = (int8_t)t; Pt.m[i].param = (int8_t)k; for (int s = 0; s < NS; s++) Pt.m[i].v[s] = -1; break; }
        if (l >= 0) { Pt.m[l].v[((mStep - 1) % NS + NS) % NS] = (int8_t)clampi((int)(norm(k, v) * 127.f + 0.5f), 0, 127); dirty++; }
      }
    }
  }
  // parameter ranges for motion lanes (0..1 <-> real value)
  static void range(int k, float& lo, float& hi) {
    lo = 0; hi = 1;
    if (k == T_TUNE) { lo = -24; hi = 24; } else if (k == T_PAN || k == T_SWING) { lo = -1; hi = 1; } else if (k == T_START) { lo = 0; hi = 1; }
  }
  static float norm(int k, float v) { float lo, hi; range(k, lo, hi); return clampf((v - lo) / (hi - lo), 0.f, 1.f); }
  static float denorm(int k, float u) { float lo, hi; range(k, lo, hi); return lo + (hi - lo) * u; }

  // ---------------------------------------------------------------- transport
  void play() { if (playing) return; playing = true; resetClocks(); if (songOn && songLen > 0) { songPos = 0; songRep = 0; cur = song[0].pat; } fxPrev = 0; }
  void stop() { playing = false; for (int t = 0; t < NT; t++) npend[t] = 0; }
  void select(int p, bool now, bool bar = false) { if (p < 0 || p >= NPAT) return; if (!playing || now) { cur = p; resetClocks(); queued = -1; } else { queued = p; queueBar = bar; } }

  bool condOK(int c, int t, bool first) {
    int L = tLoop[t];
    switch (c) {
      case 0: return true;
      case 1: return L % 2 == 0; case 2: return L % 2 == 1;
      case 3: return L % 3 == 0; case 4: return L % 3 == 1; case 5: return L % 3 == 2;
      case 6: return L % 4 == 0; case 7: return L % 4 == 1; case 8: return L % 4 == 2; case 9: return L % 4 == 3;
      case 10: return fillOn(); case 11: return !fillOn(); case 12: return first; case 13: return !first;
      default: return true; }
  }
  bool fillOn() const { return fillHeld || (fxNow & (1 << F_FILL)); }

  // schedule one step of track t at delay d (samples)
  void scheduleStep(int t, int s, float d, float stepLen) {
    TrackPat& T = pat[cur].t[t]; const Step& st = T.s[s];
    if (T.mute) return;
    bool drop = (fxNow & (1 << F_DROP)) && (int)P(t, T_ROLE) == R_KICK;
    int vel = st.vel; float mic = st.mic / 100.f;
    // FILL: an automatic fill on the last beat for snares (and the toms) when nothing is written
    if (fillOn() && vel == 0 && ((int)P(t, T_ROLE) == R_SNARE) && (mStep % 16) >= 12) vel = 40 + (mStep % 4) * 22;
    if (vel <= 0 || drop) return;
    bool first = mLoop == 0;
    bool ok = condOK(st.cond, t, first); lastCond[t] = ok; if (!ok) return;
    if (st.prob < 100 && rng.uni() * 100.f >= st.prob) return;
    int n = st.rat & 15; if (n < 1) n = 1; int mode = st.rat >> 4;
    if (n > 1 && st.rprob < 100 && rng.uni() * 100.f >= st.rprob) n = 1;          // a roll only sometimes
    int role = (int)P(t, T_ROLE);
    if (fxNow & (1 << F_ROLL)) { n = n < 4 ? 4 : n; }
    if ((fxNow & (1 << F_DRILL)) && (role == R_SNARE || role == R_HAT || role == R_BREAK || role == R_PERC)) {
      if (rng.uni() < 0.7f) { n = 2 + (int)(rng.uni() * 7.f); mode = 3; } }
    int slice = st.slice;
    if ((fxNow & (1 << F_GLITCH)) && (int)P(t, T_MODE) != M_SYNTH) { if (rng.uni() < 0.6f) slice = (int)(rng.uni() * 32.f); if (rng.uni() < 0.3f) n = n < 2 ? 2 : n * 2 > 8 ? 8 : n * 2; }
    if (slice == 255) slice = s;
    float human = params[G_HUMAN];
    for (int k = 0; k < n && npend[t] < 24; k++) {
      float frac = (float)k / n; if (mode == 5) frac = 1.f - (1.f - frac) * (1.f - frac);
      float at = d + mic * stepLen * 0.5f + frac * stepLen + (human > 0 ? rng.next() * human * stepLen * 0.12f : 0.f);
      if (at < 0) at = 0;
      float v = vel / 127.f;
      if (mode == 1) v *= 0.35f + 0.65f * (k + 1) / n; else if (mode == 2) v *= 1.f - 0.65f * k / n;
      if (human > 0) v *= 1.f - human * 0.25f * rng.uni();
      int pit = st.pit; if (mode == 3) pit += k * 2; if (mode == 4) pit -= k * 2;
      Pend& e = pend[t][npend[t]++]; e.at = at; e.vel = (int8_t)clampi((int)(v * 127.f), 1, 127); e.pit = (int8_t)pit; e.slice = (uint8_t)slice; e.ratIdx = (uint8_t)k;
      e.warp = (fxNow & (1 << F_WARP)) != 0; e.panJ = 0;
    }
  }

  void stepTrack(int t, float d) {           // a step boundary for track t (d: samples into this block)
    TrackPat& T = pat[cur].t[t]; int len = T.len < 1 ? 1 : T.len > NS ? NS : T.len;
    int s = tStep[t] % len;
    int dir = T.dir;    // 0 forward, 1 backward, 2 ping-pong, 3 random
    if (dir == 1) s = len - 1 - s; else if (dir == 2) { int c = tStep[t] % (2 * len - 2 < 1 ? 1 : 2 * len - 2); s = c < len ? c : 2 * len - 2 - c; } else if (dir == 3) s = (int)(rng.uni() * len) % len;
    float stepLen = stepSamples(speedMul(T.speed));
    float sw = (params[G_SWING] + P(t, T_SWING) + pat[cur].swing / 100.f);
    float swd = (tStep[t] % 2 == 1) ? clampf(sw, 0.f, 0.9f) * stepLen * 0.5f : 0.f;
    scheduleStep(t, s, d + swd, stepLen);
    lastTrig[t] = s;
    tStep[t]++; if (tStep[t] % len == 0 && dir != 2) tLoop[t]++; else if (dir == 2 && tStep[t] % (2 * len - 2 < 1 ? 1 : 2 * len - 2) == 0) tLoop[t]++;
  }

  void masterStep() {           // each 1/16 of the pattern grid: perf lanes, motion lanes, pattern changes
    Pattern& Pt = pat[cur];
    int ms = mStep % NS;
    if ((ms & 15) == 0 && nhq) { for (int k = 0; k < nhq; k++) if (nev < 256) { ev[nev] = { -1, procPos, hq[k].v, 1, 0, hq[k].cc, 1 }; nev++; } nhq = 0; }
    if (rec && playing && (liveFX || perfTake)) { perfTake = true; if (Pt.perf[ms] != liveFX) { Pt.perf[ms] = liveFX; dirty++; } fxNow = liveFX; }
    else fxNow = liveFX | Pt.perf[ms];
    for (int l = 0; l < NLANE; l++) { const Lane& L = Pt.m[l]; if (!L.used) continue; int v = L.v[ms];
      if (v >= 0 && !(rec && playing)) params[TPID(L.track, L.param)] = denorm(L.param, v / 127.f); }
  }

  void advance(int n) {         // run the clocks for n samples; schedule step events
    if (!playing) return;
    for (int i = 0; i < n; i++) {
      float stepM = stepSamples(1);
      if (mClock <= 0) {
        int len = pat[cur].len < 1 ? 16 : pat[cur].len;
        if (mStep >= len) {      // end of the pattern
          mStep = 0; mLoop++; perfTake = false;
          if (songOn && songLen > 0) { if (++songRep >= (song[songPos].rep < 1 ? 1 : song[songPos].rep)) { songRep = 0; songPos = (songPos + 1) % songLen; int np = song[songPos].pat; if (np != cur) { cur = np; for (int t = 0; t < NT; t++) { tClock[t] = 0; tStep[t] = 0; tLoop[t] = 0; } mLoop = 0; } } }
          else if (queued >= 0) { cur = queued; queued = -1; queueBar = false; for (int t = 0; t < NT; t++) { tClock[t] = 0; tStep[t] = 0; tLoop[t] = 0; } mLoop = 0; }
        }
        else if (queued >= 0 && queueBar && mStep > 0 && (mStep & 15) == 0 && !(songOn && songLen > 0)) {   // PULSAR 3: on the bar (DROP, scenes)
          cur = queued; queued = -1; queueBar = false; mStep = 0; mLoop = 0; perfTake = false; for (int t = 0; t < NT; t++) { tClock[t] = 0; tStep[t] = 0; tLoop[t] = 0; } }
        if (mStep == 0 && loopAt < 0) loopAt = procPos;
        masterStep(); mStep++; mClock += stepM;
      }
      mClock -= 1;
      for (int t = 0; t < NT; t++) {
        if (tClock[t] <= 0) { stepTrack(t, (float)i); tClock[t] += stepSamples(speedMul(pat[cur].t[t].speed)); }
        tClock[t] -= 1;
      }
    }
  }

  // ---------------------------------------------------------------- triggering
  void trigger(int t, float vel, int pit, int slice, bool warp) {
    const int route = clampi((int)params[TXID(t, XT_ROUTE)], 0, RT_COUNT - 1);
    if (route == RT_MUTE) return;
    bool audio = route != RT_HW, hw = route == RT_HW || route == RT_BOTH;
    if (route == RT_ALT) { altFlip[t] ^= 1; audio = altFlip[t]; hw = !altFlip[t]; }      // ALTERNATE: one hit here, the next on the TR-8
    const int hn = (int)params[TXID(t, XT_HWNOTE)], note = hn > 0 ? hn : TR8_NOTE[t];
    if (nev < 256) { ev[nev].t = t; ev[nev].at = procPos; ev[nev].vel = clampi((int)(vel * 127.f + 0.5f), 1, 127); ev[nev].hw = hw && note > 0; ev[nev].note = (uint8_t)note; ev[nev].cc = 0; ev[nev].kind = 0; nev++; }
    if (!audio) return;
    // chokes: an open hat is cut by a closed one in the same group
    int ch = (int)P(t, T_CHOKE);
    if (ch > 0) for (int u = 0; u < NT; u++) if (u != t && (int)P(u, T_CHOKE) == ch) for (auto& v : vo[u]) if (v.on) v.fadeK = 1.f / (0.004f * sr);
    Voice& old = vo[t][vcur[t]]; if (old.on) old.fadeK = 1.f / (0.003f * sr);
    vcur[t] ^= 1; Voice& v = vo[t][vcur[t]];
    v.on = true; v.age = 0; v.vel = vel; v.fade = 1; v.fadeK = 0; v.env = 1; v.penv = 1; v.clapT = 0;
    float tune = P(t, T_TUNE) + pit; if (warp) tune += rng.next() * 7.f;
    v.pitch = tune;
    for (int k = 0; k < 6; k++) v.ph[k] = 0;
    v.f1 = SVF(); v.f2 = SVF();
    int mode = (int)P(t, T_MODE);
    if (mode == M_SYNTH) { v.S = nullptr; return; }
    int si = (int)P(t, T_SMP); if (si < 0 || si >= nSmp) { v.on = false; return; }
    const Sample& S = smp[si]; v.S = &S;
    v.rev = P(t, T_REV) > 0.5f;
    float pr = exp2f_(tune / 12.f) * S.sr / sr;
    if (mode == M_BREAK) {
      int nsl = S.slices < 1 ? 16 : S.slices; int sl = slice % nsl; if (sl < 0) sl += nsl;
      v.begin = (int)((double)S.len * sl / nsl); v.end = S.len;
      v.stretch = P(t, T_STRETCH) > 0.5f && S.bpm > 0;
      v.tlRate = v.stretch ? (S.sr / sr) * (bpm() / S.bpm) : pr;
      v.rate = pr;
    } else {
      v.begin = (int)(P(t, T_START) * S.len * 0.95f); v.end = S.len; v.stretch = false; v.rate = pr; v.tlRate = pr;
    }
    if (v.rev) { v.pos = v.end - 1; v.tl = v.end - 1; } else { v.pos = v.begin; v.tl = v.begin; }
    v.grain = (int)(0.024f * S.sr); v.h1 = v.tl; v.h2 = v.tl - v.grain / 2; v.g1 = 0; v.g2 = v.grain * 0.5f;
    v.hold = 0; v.eraPh = 1;
  }

  // ---------------------------------------------------------------- synth models (designed here, not copied from any machine)
  inline float synth(Voice& v, int t) {
    const float* p = params + TPID(t, 0); const float isr = 1.f / sr;
    float dec = p[T_DECAY], tone = p[T_TONE], snap = p[T_SNAP]; float tn = exp2f_(v.pitch / 12.f);
    float y = 0, a = v.age;
    switch ((int)p[T_SYN]) {
      case S_KICK: case S_BOOM: case S_HARD: {
        int m = (int)p[T_SYN];
        float base = (m == S_BOOM ? 44.f : m == S_HARD ? 52.f : 50.f) * tn;
        float sweep = (m == S_BOOM ? 2.5f : m == S_HARD ? 6.f : 4.f) * (0.4f + tone * 1.2f);
        float pk = 1.f - expf_(-1.f / (0.008f * sr)); v.penv -= v.penv * pk * (m == S_HARD ? 1.6f : 1.f);
        float f = base * (1.f + sweep * v.penv * v.penv);
        v.ph[0] += f * isr; float s = sinp(v.ph[0]);
        float dlen = (m == S_BOOM ? 0.25f + dec * 2.2f : 0.08f + dec * 0.7f);
        v.env *= 1.f - 5.f / (dlen * sr);
        float click = a < 0.004f ? (v.rnd.next() * 0.6f + (a < 0.0006f ? 1.f : 0.f)) * snap * (1.f - a / 0.004f) : 0.f;
        y = s * v.env + click;
        if (m == S_HARD) y = tanhf_(y * (2.5f + tone * 4.f)) * 0.8f; else if (m == S_BOOM) y = tanhf_(y * (1.f + tone * 2.f));
        if (v.env < 1e-4f) v.on = false; break; }
      case S_SNARE: {
        float f = 185.f * tn; v.penv *= 1.f - 1.f / (0.01f * sr);
        v.ph[0] += f * (1.f + v.penv * 0.6f) * isr; v.ph[1] += f * 1.62f * (1.f + v.penv * 0.4f) * isr;
        float body = (sinp(v.ph[0]) + 0.6f * sinp(v.ph[1])) * expf_(-a * 5.f / (0.03f + dec * 0.1f));
        float nz = v.f1.bp(v.rnd.next()); v.f1.set(1800.f + tone * 5000.f, 0.8f, sr);
        float noise = nz * expf_(-a * 5.f / (0.06f + dec * 0.35f));
        y = body * (1.f - snap * 0.6f) + noise * (0.5f + snap * 1.2f);
        if (a > 0.05f + dec * 1.6f) v.on = false; break; }
      case S_CLAP: {
        float tt = a; float burst = 0; for (int k = 0; k < 4; k++) { float o = k * (0.008f + snap * 0.01f); if (tt >= o) burst += expf_(-(tt - o) / 0.006f) * (k == 3 ? 1.f : 0.7f); }
        float tail = a > 0.03f ? expf_(-(a - 0.03f) * 5.f / (0.05f + dec * 0.4f)) : 0.f;
        v.f1.set(900.f + tone * 1600.f, 1.2f, sr); y = v.f1.bp(v.rnd.next()) * (burst + tail * 0.8f) * 2.f;
        if (a > 0.1f + dec * 2.f) v.on = false; break; }
      case S_HAT: case S_OPEN: case S_RIDE: {
        static const float mf[6] = {1.f, 1.304f, 1.466f, 1.787f, 1.932f, 2.536f};
        float base = ((int)p[T_SYN] == S_RIDE ? 340.f : 410.f) * tn; float m = 0;
        for (int k = 0; k < 6; k++) { v.ph[k] += base * mf[k] * isr; m += (v.ph[k] - floorf_(v.ph[k])) < 0.5f ? 1.f : -1.f; }
        m = m / 6.f * (1.f - tone * 0.5f) + v.rnd.next() * (0.3f + tone * 0.5f);
        v.f1.set((int)p[T_SYN] == S_RIDE ? 5200.f : 7500.f + snap * 4000.f, 0.7f, sr); float h = v.f1.hp(m);
        float dl = (int)p[T_SYN] == S_HAT ? 0.015f + dec * 0.12f : (int)p[T_SYN] == S_OPEN ? 0.12f + dec * 0.9f : 0.4f + dec * 2.4f;
        y = h * expf_(-a * 5.f / dl) * 1.4f; if (a > dl * 1.6f) v.on = false; break; }
      case S_TOM: {
        float f = 110.f * tn; v.penv *= 1.f - 1.f / (0.04f * sr); v.ph[0] += f * (1.f + v.penv * (0.3f + tone)) * isr;
        y = sinp(v.ph[0]) * expf_(-a * 5.f / (0.1f + dec * 0.6f)) + v.rnd.next() * snap * 0.2f * expf_(-a / 0.01f);
        if (a > 0.2f + dec * 3.f) v.on = false; break; }
      case S_RIM: {
        v.ph[0] += 1700.f * tn * isr; v.ph[1] += 480.f * tn * isr;
        y = (sinp(v.ph[0]) * 0.7f + sinp(v.ph[1])) * expf_(-a * 5.f / (0.006f + dec * 0.03f)) + v.rnd.next() * snap * expf_(-a / 0.003f) * 0.5f;
        if (a > 0.2f) v.on = false; break; }
      case S_COWBELL: {
        v.ph[0] += 540.f * tn * isr; v.ph[1] += 800.f * tn * isr;
        float sq = ((v.ph[0] - floorf_(v.ph[0])) < 0.5f ? 1.f : -1.f) + ((v.ph[1] - floorf_(v.ph[1])) < 0.5f ? 1.f : -1.f);
        v.f1.set(1200.f + tone * 2000.f, 2.5f, sr); y = v.f1.bp(sq) * expf_(-a * 5.f / (0.05f + dec * 0.5f)) * 1.5f;
        if (a > 0.1f + dec * 3.f) v.on = false; break; }
      case S_FM: {                         // metallic / wooden FM percussion: tone = index, snap = ratio
        float f = 220.f * tn; float ratio = 1.f + floorf_(snap * 7.f) + 0.41f; float idx = tone * 8.f * expf_(-a * 5.f / (0.02f + dec * 0.2f));
        v.ph[1] += f * ratio * isr; v.ph[0] += f * isr; y = sinp(v.ph[0] + idx * sinp(v.ph[1]) * 0.16f) * expf_(-a * 5.f / (0.04f + dec * 0.8f));
        if (a > 0.1f + dec * 4.f) v.on = false; break; }
      case S_ZAP: {                        // electro zap / laser
        float f = (80.f + 3000.f * expf_(-a * 5.f / (0.005f + tone * 0.05f))) * tn; v.ph[0] += f * isr;
        y = sinp(v.ph[0]) * expf_(-a * 5.f / (0.03f + dec * 0.4f)); if (snap > 0.5f) y = y > 0 ? 0.7f : -0.7f, y *= expf_(-a * 5.f / (0.03f + dec * 0.4f));
        if (a > 0.05f + dec * 2.f) v.on = false; break; }
      default: {                           // noise burst / riser
        v.f1.set(400.f + tone * 9000.f, 0.7f + snap * 6.f, sr); float atk = 0.001f + p[T_ATK] * 0.8f;
        float e = a < atk ? a / atk : expf_(-(a - atk) * 5.f / (0.03f + dec * 1.2f)); y = v.f1.bp(v.rnd.next()) * e * 2.f;
        if (a > atk + 0.06f + dec * 5.f) v.on = false; break; }
    }
    return y;
  }

  // sample read with the sampler's era (the box it came through)
  inline float readS(const Sample& S, double pos) const {
    int i = (int)pos; if (i < 0 || i >= S.len - 1) return 0.f; float f = (float)(pos - i); const float* d = pool + S.off; return d[i] + (d[i + 1] - d[i]) * f; }
  inline float readNear(const Sample& S, double pos) const { int i = (int)pos; if (i < 0 || i >= S.len) return 0.f; return pool[S.off + i]; }

  inline float sampleVoice(Voice& v, int t) {
    const Sample& S = *v.S; const float* p = params + TPID(t, 0);
    int era = (int)p[T_ERA];
    static const float eraSR[E_COUNT] = {0, 26040.f, 39375.f, 28867.f, 44100.f};
    static const float eraBits[E_COUNT] = {0, 12, 12, 8, 16};
    float y;
    auto raw = [&]() -> float {
      if (!v.stretch) {
        float s = era == E_AMIGA ? readNear(S, v.pos) : readS(S, v.pos);
        v.pos += v.rev ? -v.rate : v.rate; return s; }
      // granular: two heads read at the pitch rate; the timeline moves at the tempo rate
      float w1 = 0.5f - 0.5f * cosp(v.g1 / v.grain), w2 = 0.5f - 0.5f * cosp(v.g2 / v.grain);
      float s = readS(S, v.h1) * w1 + readS(S, v.h2) * w2;
      float dir = v.rev ? -1.f : 1.f;
      v.h1 += dir * v.rate; v.h2 += dir * v.rate; v.g1 += 1.f; v.g2 += 1.f; v.tl += dir * v.tlRate;
      if (v.g1 >= v.grain) { v.g1 -= v.grain; v.h1 = v.tl; } if (v.g2 >= v.grain) { v.g2 -= v.grain; v.h2 = v.tl; }
      v.pos = v.tl; return s; };
    if (era == E_CLEAN || era == E_MPC) { y = raw(); if (era == E_MPC) y = tanhf_(y * 1.4f) * 0.8f; }
    else {                               // a lower-rate box: new value at its own clock, held between (its aliasing is the sound)
      v.eraPh += eraSR[era] / sr * exp2f_(0.f);
      if (v.eraPh >= 1.f) { v.eraPh -= 1.f; float q = exp2f_(eraBits[era] - 1); v.hold = floorf_(raw() * q + 0.5f) / q; for (float k = v.rate * sr / eraSR[era] - 1.f; k > 0.5f; k -= 1.f) { if (!v.stretch) v.pos += v.rev ? -v.rate : v.rate; } }
      else if (!v.stretch) { v.pos += v.rev ? -v.rate : v.rate; } else { raw(); }
      y = v.hold;
      if (era == E_S950) { v.eraF.set(eraSR[era] * 0.38f, 0.7f, sr); y = v.eraF.lp(y); }
    }
    // length: decay sets how much of the sample (or slice) sounds
    float dec = p[T_DECAY];
    if (v.S && (int)p[T_MODE] == M_BREAK) {
      int nsl = S.slices < 1 ? 16 : S.slices; float sliceLen = (float)S.len / nsl;
      float maxLen = sliceLen * (0.25f + dec * 3.75f) / (v.stretch ? v.tlRate : v.rate) ;
      float pos = v.age * sr; float g = pos > maxLen ? clampf(1.f - (pos - maxLen) / (0.004f * sr), 0.f, 1.f) : 1.f; if (g <= 0) v.on = false; y *= g;
    } else if (dec < 0.99f) {
      float len = (0.02f + dec * dec * 2.5f) * sr; float pos = v.age * sr; float g = pos > len ? expf_(-(pos - len) / (0.03f * sr)) : 1.f; if (g < 1e-3f) v.on = false; y *= g;
    }
    float atk = p[T_ATK]; if (atk > 0.001f) { float at = atk * 0.2f; if (v.age < at) y *= v.age / at; }
    if (v.pos < 0 || v.pos >= v.end || v.tl < 0 || v.tl >= v.end) v.on = false;
    return y;
  }

  // ---------------------------------------------------------------- audio
  // outL / outR: the main mix. busL / busR (optional, NBUS each): a track whose OUT is 1..8 plays there, dry of the
  // master chain (its reverb and delay sends still go to the main mix); without them every track is in the main mix.
  void process(float* outL, float* outR, int n, float** busL = nullptr, float** busR = nullptr) {
    const float xyOn = params[XG_ID(XG_XYON)] > 0.5f ? 1.f : 0.f, xyY = clampf(params[XG_ID(XG_XYY)], 0.f, 1.f) * xyOn;
    loopAt = -1;
    for (int i = 0; i < n; i++) {
      procPos = i;
      advance(1);
      repeatTick();
      // fire due events
      for (int t = 0; t < NT; t++) {
        for (int k = 0; k < npend[t];) { Pend& e = pend[t][k];
          if (e.at <= 0) { trigger(t, e.vel / 127.f, e.pit, e.slice, e.warp); if ((int)params[G_DUCKSRC] == t) duckEnv = 1.f; pend[t][k] = pend[t][--npend[t]]; }
          else { e.at -= 1; k++; } }
      }
      float mixL = 0, mixR = 0, revIn = 0, dlyL = 0, dlyR = 0;
      float dk = 1.f - 1.f / (maxf(0.02f, params[G_DUCKTIME]) * sr * 0.4f); duckEnv *= dk;
      for (int t = 0; t < NT; t++) {
        float s = 0;
        for (auto& v : vo[t]) {
          if (!v.on) continue;
          float y = v.S ? sampleVoice(v, t) : synth(v, t);
          y *= v.vel; if (v.fadeK > 0) { v.fade -= v.fadeK; if (v.fade <= 0) { v.on = false; v.fade = 0; } y *= v.fade; }
          v.age += 1.f / sr; s += y;
        }
        const float* p = params + TPID(t, 0);
        // per-channel: drive, filter, extra crush (ERA on synths), duck
        // DRIVE (PULSAR 3.1): blended in, so a little is colour and not a wall of distortion (it was tanh x4 at 25 %)
        if (p[T_DRIVE] > 0.001f) { const float d = p[T_DRIVE], g = 1.f + d * 6.f, w = minf(1.f, d * 1.6f); s = s + (tanhf_(s * g) / tanhf_(g) * 0.95f - s) * w; }
        float cut = p[T_CUT]; int ft = (int)p[T_FTYPE];
        if (cut < 0.995f || ft != 0 || p[T_RES] > 0.12f) { float fc = 30.f * powf_(600.f, ft == 1 ? 1.f - cut : cut); tf[t][0].set(fc, 0.6f + clampf(p[T_RES], 0.f, 1.f) * 12.f, sr);
          s = ft == 0 ? tf[t][0].lp(s) : ft == 1 ? tf[t][0].hp(s) : tf[t][0].bp(s) * 1.6f; }
        if ((int)p[T_MODE] == M_SYNTH && (int)p[T_ERA] != E_CLEAN) { int era = (int)p[T_ERA]; float q = era == E_AMIGA ? 128.f : 2048.f; s = floorf_(s * q + 0.5f) / q; }
        { const float* x = params + TXID(t, 0);
          if (x[XT_PUNCH] > 0.001f) {                                 // PUNCH: a transient shaper, the attack lifted over the body
            float a = absf(s); pkFast[t] += (a - pkFast[t]) * (a > pkFast[t] ? kAtkF : kRelF); pkSlow[t] += (a - pkSlow[t]) * (a > pkSlow[t] ? kAtkS : kRelS);
            float tr = pkSlow[t] > 1e-6f ? clampf(pkFast[t] / pkSlow[t] - 1.f, 0.f, 2.f) : 0.f; s *= 1.f + x[XT_PUNCH] * tr * 1.2f; }
          if (x[XT_COMP] > 0.001f) {                                  // COMP: a fast compressor (ratio up to 8:1 from -14 dB), made up
            float c = absf(s); cpEnv[t] += (c - cpEnv[t]) * (c > cpEnv[t] ? kCpA : kCpR);
            const float th = 0.2f, ratio = 1.f + x[XT_COMP] * 7.f, ex = 1.f / ratio - 1.f;
            float g = cpEnv[t] > th ? powf_(cpEnv[t] / th, ex) : 1.f; s *= g * powf_(1.f / th, -ex * 0.75f); }
          if (x[XT_LOW] != 0.f || x[XT_HIGH] != 0.f) {                 // two shelves at 120 Hz and 6 kHz, +-12 dB
            eqLo[t] += (s - eqLo[t]) * kLo; eqHi[t] += (s - eqHi[t]) * kHi;
            s += eqLo[t] * (dbToGain(x[XT_LOW] * 12.f) - 1.f) + (s - eqHi[t]) * (dbToGain(x[XT_HIGH] * 12.f) - 1.f); } }
        if (p[T_DUCK] > 0.001f && (int)params[G_DUCKSRC] != t) s *= 1.f - p[T_DUCK] * duckEnv;
        float lv = p[T_LEVEL] * p[T_LEVEL] * 1.4f; s *= lv;
        float pan = clampf(clampf(p[T_PAN], -1.f, 1.f) * params[G_WIDTH], -1.f, 1.f);   /* (WIDTH above 100 % pushed it past the edge: NaN) */ float gl = sqrtf_(0.5f * (1.f - pan)), gr = sqrtf_(0.5f * (1.f + pan));
        float l = s * gl * 1.414f, r = s * gr * 1.414f;
        const int ob = (int)params[TXID(t, XT_OUT)];
        if (ob >= 1 && ob <= NBUS && busL && busL[ob - 1]) { busL[ob - 1][i] += l; busR[ob - 1][i] += r; } else { mixL += l; mixR += r; }
        float sd = p[T_SENDD]; if (fxNow & (1 << F_DUB)) sd = maxf(sd, 0.7f);
        revIn += s * (p[T_SENDR] + xyY * 0.9f); sd += xyY * 0.6f; dlyL += l * sd; dlyR += r * sd;
        float a = absf(s); meter[t] = a > meter[t] ? a : meter[t] * 0.9995f;
      }
      // reverb: 8-line feedback network, a small studio room to a big hall
      { float size = 0.55f + params[G_REVSIZE] * 0.43f, damp = 0.15f + (1.f - params[G_REVTONE]) * 0.6f; float o[8], sum = 0;
        for (int k = 0; k < 8; k++) { int L = (int)(rvLen[k] * (0.6f + params[G_REVSIZE] * 1.4f)); if (L >= RLEN / 4 * 4) L = RLEN / 4 * 4 - 1; int ri = (rvW - L + RLEN * 64) % (RLEN / 4 * 4); o[k] = rv[k][ri]; sum += o[k]; }
        float hh = sum * 0.25f;
        for (int k = 0; k < 8; k++) { float x = (o[k] - hh) * size + revIn * 0.18f; rvLp[k] += (x - rvLp[k]) * (1.f - damp); rv[k][rvW % (RLEN / 4 * 4)] = rvLp[k]; }
        rvW = (rvW + 1) % (RLEN / 4 * 4);
        mixL += (o[0] + o[2] + o[4] + o[6]) * 0.35f; mixR += (o[1] + o[3] + o[5] + o[7]) * 0.35f; }
      // delay: tempo-synced, ping-pong, darker each repeat; DUB pushes it
      { static const float divs[8] = {0.25f, 0.5f, 0.75f, 1.f, 1.5f, 2.f, 3.f, 4.f};   // in 1/16
        int di = clampi((int)params[G_DLYTIME], 0, 7); float dt = 60.f / bpm() / 4.f * divs[di] * 2.f * sr; if (dt > DLEN - 4) dt = DLEN - 4;
        float fb = params[G_DLYFB]; if (fxNow & (1 << F_DUB)) fb = 0.86f;
        int ri = (int)(dW - dt + DLEN) % DLEN; float yl = dl[0][ri], yr = dl[1][ri];
        float tc = 0.1f + params[G_DLYTONE] * 0.8f; dLp[0] += (yl - dLp[0]) * tc; dLp[1] += (yr - dLp[1]) * tc;
        dl[0][dW] = tanhf_(dlyL + dLp[1] * fb); dl[1][dW] = tanhf_(dlyR + dLp[0] * fb); dW = (dW + 1) % DLEN;
        mixL += yl * 0.8f; mixR += yr * 0.8f; }
      masterFX(mixL, mixR);
      xyFX(mixL, mixR, xyOn);
      dirtyVoltage(mixL, mixR);
      // PULSAR 3 gain staging: 16 tracks summed peak well over full scale, which drove the glue's tanh into constant
      // distortion. The mix gets 6 dB of headroom before the glue, the drive curve is gentler, and a make-up after it
      // brings the level back; the safety limiter (-1 dBFS) catches only what is left of the peaks.
      mixL *= 0.5f; mixR *= 0.5f;
      // glue: compressor + drive + soft limit
      float lvl = maxf(absf(mixL), absf(mixR)); if (lvl > mixPk) mixPk = lvl;     // the mix's peak into the glue: the headroom meter
      compEnv += (lvl - compEnv) * (lvl > compEnv ? 0.004f : 0.00012f);                // (PULSAR 3.1: this line had been swallowed by the comment above, so COMP did nothing)
      float thr = 0.5f - params[G_COMP] * 0.35f; float g = compEnv > thr ? powf_(thr / compEnv, params[G_COMP] * 0.75f) : 1.f;
      mixL *= g; mixR *= g;
      const float drv = clampf(params[G_DRIVE], 0.f, 1.f), dr = 1.f + drv * 1.6f, mv = params[G_MASTER] * 1.6f;
      // the drive blends in: at 0 the glue is clean (only a soft knee near full scale), turned up it saturates
      auto glue = [&](float x) {
        const float ax = absf(x), soft = ax < 0.6f ? x : (x > 0 ? 1.f : -1.f) * (0.6f + 0.4f * tanhf_((ax - 0.6f) / 0.4f));   // clean, a soft knee near full scale
        const float hot = tanhf_(x * dr) / tanhf_(dr) * 0.9f;                                                               // the drive's colour
        return soft + (hot - soft) * minf(0.6f, drv * 1.2f); };                             // at most 60 % of the drive's colour
      float oL = glue(mixL) * mv, oR = glue(mixR) * mv;
      limiter(oL, oR); outL[i] = oL; outR[i] = oR;
      if ((i & 3) == 0) { scope[scopeW] = (outL[i] + outR[i]) * 0.5f; scopeW = (scopeW + 1) & 511; }
    }
    teleUpdate();
  }

  // DIRTY VOLTAGE: safety high-pass (30 Hz), the lows below 140 Hz in mono and only lightly saturated, the rest through two
  // saturation stages run at twice the sample rate (the midpoint is saturated too and the pair averaged), a tone low-pass,
  // and a slow loudness match (in vs out RMS) so that more drive is not simply louder. Off (amount 0) it is bypassed.
  void dirtyVoltage(float& L, float& R) {
    const float amt = clampf(params[XG_ID(XG_DV)], 0.f, 1.f);
    if (amt < 0.001f) { dvPrev[0] = L; dvPrev[1] = R; dvMk = 1; return; }
    const float tone = clampf(params[XG_ID(XG_DVTONE)], 0.f, 1.f);
    if (tone != dvToneK || sr != dvSr) { dvToneK = tone; dvSr = sr; dvAH = 1.f - expf_(-TAU * 30.f / sr); dvAL = 1.f - expf_(-TAU * 140.f / sr); dvTC = 1.f - expf_(-TAU * (2500.f * powf_(7.f, tone)) / sr); }
    const float aH = dvAH; dvHp[0] += (L - dvHp[0]) * aH; dvHp[1] += (R - dvHp[1]) * aH;
    float x[2] = { L - dvHp[0], R - dvHp[1] };
    const float aL = dvAL;
    for (int c = 0; c < 2; c++) { dvLp[c] += (x[c] - dvLp[c]) * aL; dvLp2[c] += (dvLp[c] - dvLp2[c]) * aL; }   // the lows: 12 dB/oct at 140 Hz
    const float low = (dvLp2[0] + dvLp2[1]) * 0.5f, lowS = tanhf_(low * (1.f + amt * 2.5f)) / (1.f + amt * 0.9f);
    const float g = 1.f + amt * 14.f, bias = 0.2f * amt, b0 = tanhf_(bias);
    auto sat = [&](float v) { float y = tanhf_(v * g + bias) - b0; y = y * 1.4f; return y / (1.f + absf(y)) * 1.35f; };   // stage 1 asymmetric, stage 2 soft clip
    const float tc = dvTC;
    float o[2];
    for (int c = 0; c < 2; c++) {
      float hi = x[c] - dvLp2[c];                                              // the rest, kept clear of the lows (2 x HP at 140 Hz)
      dvHq[c] += (hi - dvHq[c]) * aL; hi -= dvHq[c]; dvHq2[c] += (hi - dvHq2[c]) * aL; hi -= dvHq2[c];
      const float mid = (hi + dvPrev[c]) * 0.5f; dvPrev[c] = hi;
      float hs = (sat(mid) + sat(hi)) * 0.5f;
      dvHo[c] += (hs - dvHo[c]) * aL; hs -= dvHo[c]; dvHo2[c] += (hs - dvHo2[c]) * aL; hs -= dvHo2[c];   // and after: what the saturation made below 140 Hz goes too
      dvTone[c] += (hs - dvTone[c]) * tc;
      o[c] = lowS + dvTone[c];
    }
    const float inL = L * L + R * R, outE = o[0] * o[0] + o[1] * o[1], k = 1.f / (0.3f * sr);
    dvIn += (inL - dvIn) * k; dvOut += (outE - dvOut) * k;
    float want = sqrtf_(dvIn / maxf(dvOut, 1e-9f)); want = clampf(want, 0.25f, 1.5f);
    dvMk += (want - dvMk) * (1.f / (0.05f * sr));
    const float wet = clampf(amt * 3.f, 0.f, 1.f);             // the first third of the knob fades the chain in
    L = L * (1.f - wet) + o[0] * dvMk * wet; R = R * (1.f - wet) + o[1] * dvMk * wet;
  }
  // the safety limiter: -1 dBFS ceiling, instant attack, 80 ms release; and the meter (RMS, dBFS, 300 ms)
  void limiter(float& L, float& R) {
    rmsAcc += L * L + R * R; if (++rmsN >= (int)(0.3f * sr)) { rmsDb = 10.f * 0.30103f * log2f_(rmsAcc / (2.f * rmsN) + 1e-12f); rmsAcc = 0; rmsN = 0; }
    if (params[XG_ID(XG_LIMIT)] < 0.5f) { limG = 1; return; }
    const float ceil = 0.891f, pk = maxf(absf(L), absf(R));
    if (pk * limG > ceil) limG = ceil / pk; else limG += (1.f - limG) * (1.f / (0.08f * sr));
    if (limG < limMin) limMin = limG;
    L *= limG; R *= limG;
  }
  void masterFX(float& L, float& R) {
    hist[0][hW] = L; hist[1][hW] = R; int w = hW; hW = (hW + 1) & (HLEN - 1);
    uint16_t f = fxNow, rise = f & ~fxPrev; fxPrev = f;
    float beat = 60.f / bpm() * sr;
    if (rise & (1 << F_STUTTER)) { static const float ls[4] = {0.5f, 0.25f, 0.125f, 1.f / 12.f}; stutLen = beat * ls[clampi((int)params[G_STUTLEN], 0, 3)]; stutStart = (float)w - stutLen; stutPos = 0; }
    if (rise & (1 << F_REVERSE)) { revPos = 0; }
    if (rise & (1 << F_TAPESTOP)) { tapeRate = 1; tapePos = 0; }
    if (f & (1 << F_STUTTER)) { int ri = ((int)(stutStart + stutPos) % HLEN + HLEN) & (HLEN - 1); L = hist[0][ri]; R = hist[1][ri]; stutPos += 1; if (stutPos >= stutLen) stutPos = 0; }
    else if (f & (1 << F_REVERSE)) { revPos += 1; if (revPos > beat) revPos = 0; int ri = ((w - (int)(2 * revPos)) % HLEN + HLEN) & (HLEN - 1); L = hist[0][ri]; R = hist[1][ri]; }
    else if (f & (1 << F_TAPESTOP)) { tapeRate = maxf(0.f, tapeRate - 1.f / beat); tapePos += 1.f - tapeRate; int ri = ((w - (int)tapePos) % HLEN + HLEN) & (HLEN - 1); L = hist[0][ri] * minf(1.f, tapeRate * 3.f); R = hist[1][ri] * minf(1.f, tapeRate * 3.f); }
    if (f & (1 << F_GATE)) { gatePh += 4.f / beat; if (gatePh >= 1) gatePh -= 1; float g = gatePh < 0.5f ? 1.f : 0.f; L *= g; R *= g; } else gatePh = 0;
    float tgt = (f & (1 << F_FILTER)) ? 0.0f : 1.f; fxCut += (tgt - fxCut) * (1.f / (beat * 0.6f));
    if (fxCut < 0.995f) { float fc = 120.f * powf_(150.f, fxCut); float a = 1.f - expf_(-TAU * fc / sr); fxLpZ[0] += (L - fxLpZ[0]) * a; fxLpZ[1] += (R - fxLpZ[1]) * a; L = fxLpZ[0] * 1.2f; R = fxLpZ[1] * 1.2f; } else { fxLpZ[0] = L; fxLpZ[1] = R; }
    float ht = (f & (1 << F_RISE)) ? 1.f : 0.f; fxHp += (ht - fxHp) * (ht > fxHp ? 1.f / (beat * 4.f) : 1.f / (beat * 0.1f));
    if (fxHp > 0.005f) { float fc = 20.f * powf_(200.f, fxHp); float a = 1.f - expf_(-TAU * fc / sr); fxHpZ[0] += (L - fxHpZ[0]) * a; fxHpZ[1] += (R - fxHpZ[1]) * a; L -= fxHpZ[0]; R -= fxHpZ[1]; }
    if (f & (1 << F_CRUSH)) { crushPh += 8000.f / sr; if (crushPh >= 1) { crushPh -= 1; crushHold[0] = floorf_(L * 24.f + 0.5f) / 24.f; crushHold[1] = floorf_(R * 24.f + 0.5f) / 24.f; } L = crushHold[0]; R = crushHold[1]; }
  }

  // the performance pad: X sweeps a DJ filter (left: low-pass, right: high-pass), Y throws everything into the space
  void xyFX(float& L, float& R, float on) {
    xyAmt += (on * clampf(params[XG_ID(XG_XYX)], -1.f, 1.f) - xyAmt) * 0.002f;
    if (xyAmt < -0.01f) { float fc = 20000.f * powf_(0.0075f, -xyAmt); float a = 1.f - expf_(-TAU * fc / sr); xyLp[0] += (L - xyLp[0]) * a; xyLp[1] += (R - xyLp[1]) * a; L = xyLp[0]; R = xyLp[1]; }
    else { xyLp[0] = L; xyLp[1] = R; }
    if (xyAmt > 0.01f) { float fc = 20.f * powf_(300.f, xyAmt); float a = 1.f - expf_(-TAU * fc / sr); xyHp[0] += (L - xyHp[0]) * a; xyHp[1] += (R - xyHp[1]) * a; L -= xyHp[0]; R -= xyHp[1]; }
    else { xyHp[0] = L; xyHp[1] = R; }
  }
  // note repeat: a held pad plays again on the grid at the chosen rate (1/8 1/16 1/32 1/16T), running or not
  float repeatLen() const { static const float m[5] = {0.f, 2.f, 1.f, 0.5f, 2.f / 3.f}; int r = clampi((int)params[XG_ID(XG_REPEAT)], 0, 4); return m[r] * stepSamples(1); }
  void repeatTick() {
    if (!held) return; float L = repeatLen(); if (L <= 0) return;
    for (int t = 0; t < NT; t++) if ((held >> t) & 1) { rClock[t] -= 1; if (rClock[t] <= 0) { rClock[t] += L; hit(t, heldVel[t]); } }
  }
  void padDown(int t, int vel) {      // a pad pressed: plays (and records); with repeat on it keeps playing while held
    if (t < 0 || t >= NT) return; if (params[XG_ID(XG_VELSENS)] < 0.5f) vel = 110;
    hit(t, vel); float L = repeatLen();
    if (L > 0) { held |= (uint16_t)(1 << t); heldVel[t] = (int8_t)clampi(vel, 1, 127);
      rClock[t] = playing ? (mClock > 0 ? (double)((int)(mClock) % (int)(L < 1 ? 1 : L)) : L) : L; if (rClock[t] < 1) rClock[t] = L; }
  }
  void padUp(int t) { if (t >= 0 && t < NT) held &= (uint16_t)~(1 << t); }

  void teleUpdate() {
    tele[0] = playing; tele[1] = bpm(); tele[2] = (float)cur; tele[3] = (float)(queued); tele[4] = (float)(mStep > 0 ? (mStep - 1) % NS : 0);
    tele[5] = (float)fxNow; tele[6] = (float)dirty; tele[7] = (float)songPos; tele[8] = rec;
    for (int t = 0; t < NT; t++) { tele[16 + t] = (float)lastTrig[t]; tele[32 + t] = meter[t]; }
    tele[48] = (float)mLoop; tele[50] = rmsDb; tele[51] = 20.f * 0.30103f * log2f_(maxf(limMin, 1e-6f)); limMin = 1; tele[52] = dvMk; tele[53] = 20.f * 0.30103f * log2f_(maxf(mixPk, 1e-6f)); mixPk = 0;
  }

  // live play (pads, MIDI): plays now; while recording, lands on the nearest step (quantized)
  void pad(int t, int vel) { padDown(t, vel); }
  void hit(int t, int vel) {
    if (t < 0 || t >= NT) return;
    trigger(t, vel / 127.f, 0, 255, false);
    if ((int)params[G_DUCKSRC] == t) duckEnv = 1.f;
    if (rec && playing) {
      TrackPat& T = pat[cur].t[t]; int len = T.len < 1 ? 1 : T.len;
      float stepLen = stepSamples(speedMul(T.speed)); int s = (tStep[t] - 1 + (tClock[t] < stepLen * 0.5f ? 1 : 0)) % len; if (s < 0) s += len;
      Step& st = T.s[s]; st.vel = (int8_t)clampi(vel, 1, 127); if (st.prob == 0) st.prob = 100; dirty++;
    }
  }
};

}  // namespace pulsar
