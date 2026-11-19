// native test of PULSAR 3's engine additions: DIRTY VOLTAGE (bypass, loudness match, mono lows, no NaN) and the safety limiter
#include "../engine/pulsar.h"
#include <cstdio>
#include <cmath>
#include <vector>
using namespace pulsar;
static float POOLMEM[1 << 20];
static int fails = 0;
static void check(const char* what, bool ok) { printf("%-70s %s\n", what, ok ? "ok" : "FAIL"); if (!ok) fails++; }
static double rms(const std::vector<float>& v, int from = 0) { double e = 0; for (size_t i = from; i < v.size(); i++) e += (double)v[i] * v[i]; return std::sqrt(e / (v.size() - from)); }
static double peak(const std::vector<float>& v) { double m = 0; for (float x : v) m = std::fmax(m, std::fabs(x)); return m; }

// a loud groove: kick, snare, hat on every track type, master drive up
static Engine* groove(float dv, float limit, float drive = 0.4f) {
  static Engine* last = nullptr; delete last; last = new Engine(); Engine& E = *last; E.init(48000, POOLMEM);
  E.params[TPID(0, T_SYN)] = S_KICK; E.params[TPID(1, T_SYN)] = S_SNARE; E.params[TPID(2, T_SYN)] = S_HAT; E.params[TPID(3, T_SYN)] = S_ZAP;
  for (int t = 0; t < 4; t++) { E.params[TPID(t, T_MODE)] = M_SYNTH; E.params[TPID(t, T_LEVEL)] = 1; }
  for (int s = 0; s < 16; s += 4) E.pat[0].t[0].s[s].vel = 127;
  E.pat[0].t[1].s[4].vel = 120; E.pat[0].t[1].s[12].vel = 120;
  for (int s = 0; s < 16; s += 2) E.pat[0].t[2].s[s].vel = 100;
  E.pat[0].t[3].s[7].vel = 110;
  E.params[G_DRIVE] = drive; E.params[G_MASTER] = 1;
  E.params[XG_ID(XG_DV)] = dv; E.params[XG_ID(XG_LIMIT)] = limit;
  return last;
}
static void run(Engine& E, std::vector<float>& L, std::vector<float>& R) { E.play(); for (size_t o = 0; o < L.size(); o += 256) E.process(L.data() + o, R.data() + o, 256); }

int main() {
  check("PULSAR 3 keeps every parameter id (DV / tone / limiter in the free v2 slots)", P_COUNT == 400 + 8 + 16 * 8 && XG_ID(XG_DV) == 405 && XG_ID(XG_LIMIT) == 407);
  const int N = 48000 * 4;
  std::vector<float> aL(N), aR(N), bL(N), bR(N);
  // ---- bypass: DIRTY VOLTAGE at 0 changes nothing (limiter off on both)
  run(*groove(0, 0), aL, aR);
  { Engine& E = *groove(0, 0); E.params[XG_ID(XG_DVTONE)] = 0.1f; run(E, bL, bR); }
  bool same = true; for (int i = 0; i < N; i++) if (aL[i] != bL[i]) { same = false; break; }
  check("DIRTY VOLTAGE at 0 is a true bypass (tone ignored)", same);
  const double r0 = rms(aL, 48000);
  // ---- on: loud, but loudness matched (within 3 dB of the dry groove), finite
  for (float dv : { 0.35f, 0.7f, 1.0f }) {
    run(*groove(dv, 0), bL, bR);
    bool fin = true; for (int i = 0; i < N; i++) if (!std::isfinite(bL[i]) || !std::isfinite(bR[i])) fin = false;
    const double r1 = rms(bL, 48000), db = 20 * std::log10(r1 / r0);
    char m[96]; snprintf(m, sizeof m, "DIRTY VOLTAGE %.2f: finite, loudness matched (%+.1f dB vs dry)", dv, db);
    check(m, fin && std::fabs(db) < 3.0);
  }
  // ---- the lows are mono: a hard-panned kick comes out centred below 140 Hz
  {
    Engine& E = *groove(1.0f, 0); E.params[TPID(0, T_PAN)] = -1; for (int t = 1; t < 4; t++) E.params[TPID(t, T_LEVEL)] = 0;
    run(E, bL, bR);
    double side = 0, mid = 0, lp[2] = { 0, 0 }; const double a = 1 - std::exp(-2 * M_PI * 80.0 / 48000);
    for (int i = 48000; i < N; i++) { lp[0] += (bL[i] - lp[0]) * a; lp[1] += (bR[i] - lp[1]) * a; side += (lp[0] - lp[1]) * (lp[0] - lp[1]); mid += (lp[0] + lp[1]) * (lp[0] + lp[1]); }
    printf("  side/mid %.4f\n", side / mid); check("DIRTY VOLTAGE: the lows (below 80 Hz) are mono, side < 2 % of mid", side < 0.02 * mid);
  }
  // ---- the limiter: everything at full drive never passes -1 dBFS; off, it does
  {
    run(*groove(1.0f, 1, 1.0f), bL, bR);
    check("safety limiter on: peak at or under -1 dBFS (0.891)", peak(bL) <= 0.8915 && peak(bR) <= 0.8915);
    Engine& E = *groove(0, 1, 0.1f); E.params[G_MASTER] = 0.3f; run(E, aL, aR);
    Engine& F = *groove(0, 0, 0.1f); F.params[G_MASTER] = 0.3f; run(F, bL, bR);
    bool same2 = true; for (int i = 0; i < N; i++) if (aL[i] != bL[i]) { same2 = false; break; }
    check("safety limiter: a quiet mix is untouched", same2);
    const float* tl = E.tele; check("the meter reports RMS in dBFS (between -60 and 0)", tl[50] < 0 && tl[50] > -60);
  }
  // ---- random parameter storms on the new parameters: no NaN
  {
    Engine& E = *groove(0.5f, 1); std::vector<float> L(256), R(256); bool fin = true; unsigned s = 7;
    E.play();
    for (int k = 0; k < 2000; k++) { s = s * 1664525u + 1013904223u; E.params[XG_ID(XG_DV)] = (s >> 8 & 255) / 255.f; E.params[XG_ID(XG_DVTONE)] = (s >> 16 & 255) / 255.f; E.params[XG_ID(XG_LIMIT)] = (s >> 24) & 1;
      E.process(L.data(), R.data(), 256); for (int i = 0; i < 256; i++) if (!std::isfinite(L[i])) fin = false; }
    check("DIRTY VOLTAGE / limiter automation storm: no NaN", fin);
  }
  // ---- a pattern switch queued "on the bar" happens at the next bar of a 64-step pattern, not at its end
  {
    static Engine E; E.init(48000, POOLMEM); E.params[G_BPM] = 120; E.pat[0].len = 64; E.pat[1].len = 16; E.play();
    std::vector<float> L(256), R(256); const int bar = (int)(48000 * 2.0);       // a bar at 120 BPM: 2 s
    int done = 0; for (; done < bar / 2; done += 256) E.process(L.data(), R.data(), 256);
    E.select(1, false, true); int at = -1;
    for (; done < bar * 3; done += 256) { E.process(L.data(), R.data(), 256); if (at < 0 && E.cur == 1) at = done; }
    check("select on the bar: pattern 2 starts at bar 2 (not after 4 bars)", at > bar - 600 && at < bar + 600);
    E.select(0, false, false); int at2 = -1;
    for (; done < bar * 6; done += 256) { E.process(L.data(), R.data(), 256); if (at2 < 0 && E.cur == 0) at2 = done; }
    check("select at the end (as before): after the 16-step pattern", at2 > 0);
  }
  // ---- HYPERLINK routes: TR-8 only (no sound here, a hit for the TR-8 on its note), BOTH, ALTERNATE, MUTE; CCs on the bar
  {
    auto routed = [&](int route, int& hw, int& own, double& e) {
      static Engine* EP = nullptr; delete EP; EP = new Engine(); Engine& E = *EP; E.init(48000, POOLMEM); E.params[TPID(0, T_SYN)] = S_KICK; E.params[TPID(0, T_LEVEL)] = 1; E.params[TXID(0, XT_ROUTE)] = (float)route;
      for (int s = 0; s < 16; s += 4) E.pat[0].t[0].s[s].vel = 120;
      std::vector<float> L(48128), R(48128); E.play(); hw = own = 0; e = 0;   /* (a whole number of 256-blocks) */
      for (int o = 0; o < 48000; o += 256) { E.nev = 0; E.process(L.data() + o, R.data() + o, 256); for (int k = 0; k < E.nev; k++) if (E.ev[k].kind == 0) { own++; if (E.ev[k].hw && E.ev[k].note == 36) hw++; } }
      for (float x : L) e += x * x; };
    int hw, own; double e;
    routed(RT_PULSAR, hw, own, e); check("route PULSAR: sound, nothing for the TR-8", e > 1 && hw == 0 && own == 3);
    routed(RT_HW, hw, own, e);     check("route TR-8: silent here, the kicks go to the TR-8 on note 36", e < 1e-6 && hw == 3);
    routed(RT_BOTH, hw, own, e);   check("route BOTH: sound and the kicks for the TR-8", e > 1 && hw == 3);
    routed(RT_ALT, hw, own, e);    check("route ALTERNATE: one here, the next on the TR-8", e > 1 && (hw == 1 || hw == 2));
    routed(RT_MUTE, hw, own, e);   check("route MUTE: silent, no event", e < 1e-6 && own == 0);
    static Engine E; E.init(48000, POOLMEM); E.params[G_BPM] = 120; std::vector<float> L(256), R(256); E.play();
    for (int k = 0; k < 40; k++) { E.nev = 0; E.process(L.data(), R.data(), 256); }   // into the bar
    E.hwCC(69, 100, true); int seen = -1, blocks = 0;
    for (int k = 0; k < 400 && seen < 0; k++, blocks++) { E.nev = 0; E.process(L.data(), R.data(), 256); for (int j = 0; j < E.nev; j++) if (E.ev[j].kind == 1 && E.ev[j].cc == 69 && E.ev[j].vel == 100) seen = E.mStep; }
    check("Scatter CC on the bar: sent at the downbeat (step 1 of the next bar)", seen == 1);
  }
  printf(fails ? "pulsar3 FAILED (%d)\n" : "pulsar3 ok\n", fails);
  return fails ? 1 : 0;
}
