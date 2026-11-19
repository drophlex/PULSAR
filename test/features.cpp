// native test of PULSAR 2's engine features: multi-out, note repeat, XY pad, PUNCH / COMP / EQ, trigger events
#include "../engine/pulsar.h"
#include <cstdio>
#include <cmath>
#include <vector>
#include <cstdlib>
using namespace pulsar;
static float POOLMEM[1 << 20];
static int fails = 0;
static void check(const char* what, bool ok) { printf("%-64s %s\n", what, ok ? "ok" : "FAIL"); if (!ok) fails++; }
static double energy(const std::vector<float>& v) { double e = 0; for (float x : v) e += (double)x * x; return e; }
static Engine* fresh() { static Engine* last = nullptr; delete last; last = new Engine(); last->init(48000, POOLMEM); return last; }

int main() {
  check("v2 parameters come after the original 400", X_BASE == 400 && TPID(15, T_NPARAM - 1) == 399 && P_COUNT == 400 + 8 + 16 * 8);
  const int N = 48000;
  // ---- multi-out: track 2 on bus 3, the main mix without it
  {
    Engine& E = *fresh();
    E.params[TPID(1, T_SYN)] = S_SNARE; E.params[TXID(1, XT_OUT)] = 3;
    E.pat[0].t[1].s[0].vel = 120; E.pat[0].t[1].s[4].vel = 120;
    std::vector<float> L(N), R(N), b[NBUS * 2]; float* bl[NBUS]; float* br[NBUS];
    for (int k = 0; k < NBUS; k++) { b[k].assign(N, 0); b[NBUS + k].assign(N, 0); bl[k] = b[k].data(); br[k] = b[NBUS + k].data(); }
    E.play(); E.process(L.data(), R.data(), N, bl, br);
    check("multi-out: the track plays on its bus", energy(b[2]) > 1.0);
    check("multi-out: other buses silent", energy(b[0]) == 0 && energy(b[7]) == 0);
    check("multi-out: the main mix has no dry snare (only its reverb / delay, none set)", energy(L) < energy(b[2]) * 1e-3);
    Engine& F = *fresh(); F.params[TPID(1, T_SYN)] = S_SNARE; F.params[TXID(1, XT_OUT)] = 3; F.pat[0].t[1].s[0].vel = 120;
    std::vector<float> L2(N), R2(N); F.play(); F.process(L2.data(), R2.data(), N);
    check("without buses (web) every track is in the main mix", energy(L2) > 1.0);
  }
  // ---- note repeat: hold a pad for one bar at 1/16, 120 BPM: 16 hits; at 1/32: 32
  for (int rate : { 2, 3, 1 }) {
    Engine& E = *fresh(); E.params[G_BPM] = 120; E.params[XG_ID(XG_REPEAT)] = (float)rate;
    std::vector<float> L(N * 2), R(N * 2);
    E.padDown(0, 100); E.process(L.data(), R.data(), 48000 * 2); E.padUp(0);
    const int want = rate == 2 ? 16 : rate == 3 ? 32 : 8;
    char m[96]; snprintf(m, sizeof m, "note repeat %s: a 2 s hold at 120 BPM plays %d hits (got %d)", rate == 2 ? "1/16" : rate == 3 ? "1/32" : "1/8", want + 1, E.nev);
    check(m, std::abs(E.nev - (want + 1)) <= 1);
    E.nev = 0; E.process(L.data(), R.data(), 24000); check("note repeat stops when the pad is let go", E.nev == 0);
  }
  { Engine& E = *fresh(); E.params[XG_ID(XG_REPEAT)] = 0; std::vector<float> L(N), R(N); E.padDown(0, 100); E.process(L.data(), R.data(), N);
    check("repeat OFF: one hit", E.nev == 1); }
  { Engine& E = *fresh(); E.params[XG_ID(XG_VELSENS)] = 0; std::vector<float> L(64), R(64); E.padDown(0, 20); E.process(L.data(), R.data(), 64);
    check("velocity OFF: a soft pad plays full", E.nev == 1 && E.ev[0].vel >= 105); }
  // ---- events: a pattern's triggers with their sample positions
  { Engine& E = *fresh(); E.params[G_BPM] = 120; for (int s = 0; s < 16; s += 4) E.pat[0].t[0].s[s].vel = 100;
    std::vector<float> L(N * 2), R(N * 2); E.play(); E.process(L.data(), R.data(), N * 2);
    check("events: four kicks in a bar at 120 BPM", E.nev == 4 && E.ev[0].t == 0 && E.ev[1].at > 23000 && E.ev[1].at < 25000); }
  // ---- XY pad: left darkens, right thins, Y adds space
  auto render = [&](float on, float x, float y, int syn) {
    Engine& E = *fresh(); E.params[TPID(0, T_SYN)] = (float)syn; E.params[XG_ID(XG_XYON)] = on; E.params[XG_ID(XG_XYX)] = x; E.params[XG_ID(XG_XYY)] = y;
    E.xyAmt = on * x;
    for (int s = 0; s < 16; s += 2) E.pat[0].t[0].s[s].vel = 110;
    std::vector<float> L(N), R(N); E.play(); E.process(L.data(), R.data(), N);
    double hf = 0, lf = 0, z = 0, lp = 0; for (float v : L) { lp += (v - lp) * 0.05; lf += lp * lp; hf += (v - lp) * (v - lp); z += v * v; }
    return std::vector<double>{ hf, lf, z };
  };
  { auto a = render(0, 0, 0, S_HAT), b = render(1, -0.9f, 0, S_HAT), c = render(1, 0.9f, 0, S_KICK), d = render(0, 0, 0, S_KICK), e = render(1, 0, 1, S_HAT);
    check("XY left: the highs go", b[0] < a[0] * 0.2);
    check("XY right: the lows go", c[1] < d[1] * 0.3);
    check("XY up: more sound (the space)", e[2] > a[2] * 1.1);
    auto f = render(0, -0.9f, 1, S_HAT); check("XY off: no change", std::abs(f[2] - a[2]) < a[2] * 1e-6); }
  // ---- PUNCH, COMP, EQ
  auto crest = [&](int k, float v, int syn = S_SNARE) {
    Engine& E = *fresh(); E.params[G_COMP] = 0; E.params[G_DRIVE] = 0; E.params[G_MASTER] = 0.4f; E.params[TPID(0, T_LEVEL)] = 0.2f; E.params[TPID(0, T_SYN)] = (float)syn; E.params[TXID(0, k)] = v; for (int s = 0; s < 16; s += 4) E.pat[0].t[0].s[s].vel = 110;
    std::vector<float> L(N), R(N); E.play(); E.process(L.data(), R.data(), N);
    double pk = 0, e = 0, lp = 0, lo = 0; for (float x : L) { pk = std::max(pk, (double)std::fabs(x)); e += x * x; lp += (x - lp) * 0.01; lo += lp * lp; }
    return std::vector<double>{ pk / std::sqrt(e / N), e, lo };
  };
  { auto a = crest(XT_PUNCH, 0, S_TOM), b = crest(XT_PUNCH, 1, S_TOM); check("PUNCH: a tom's attack over its body (crest factor up)", b[0] > a[0] * 1.08); }
  { auto a = crest(XT_COMP, 0), b = crest(XT_COMP, 1); printf("  comp crest %.2f -> %.2f, energy %.3g -> %.3g\n", a[0], b[0], a[1], b[1]); check("COMP: denser (crest factor down), about as loud", b[0] < a[0] * 0.95 && b[1] > a[1] * 0.4); }
  { auto a = crest(XT_LOW, 0), b = crest(XT_LOW, 1), c = crest(XT_LOW, -1); check("EQ LOW +: the lows up", b[2] > a[2] * 1.5); (void)c; }
  { auto a = crest(XT_LOW, 0, S_KICK), b = crest(XT_LOW, -1, S_KICK); check("EQ LOW -: a kick loses its lows", b[2] < a[2] * 0.3); }
  { auto a = crest(XT_HIGH, 0, S_HAT), b = crest(XT_HIGH, -1, S_HAT), c = crest(XT_HIGH, 1, S_HAT); check("EQ HIGH -/+: a hat quieter / louder", b[1] < a[1] * 0.5 && c[1] > a[1] * 1.5); }
  // ---- no NaN anywhere with everything on
  { Engine& E = *fresh(); for (int t = 0; t < NT; t++) { E.params[TPID(t, T_SYN)] = (float)(t % S_COUNT); E.params[TXID(t, XT_PUNCH)] = 1; E.params[TXID(t, XT_COMP)] = 1; E.params[TXID(t, XT_LOW)] = 1; E.params[TXID(t, XT_HIGH)] = 1; for (int s = 0; s < 16; s++) E.pat[0].t[t].s[s].vel = 127; }
    E.params[XG_ID(XG_XYON)] = 1; E.params[XG_ID(XG_XYY)] = 1; E.params[XG_ID(XG_XYX)] = -1;
    std::vector<float> L(N * 4), R(N * 4); E.play(); E.process(L.data(), R.data(), N * 4);
    bool ok = true; for (float x : L) if (!std::isfinite(x) || std::fabs(x) > 1.01f) ok = false; check("everything on, every track every step: finite, within full scale", ok); }
  // ---- random automation (as pluginval does): every parameter within its range, FX on and off, no NaN
  { bool ok = true; srand(1);
    auto rnd = [](float a, float b) { return a + (b - a) * (rand() / (float)RAND_MAX); };
    for (int trial = 0; trial < 60 && ok; trial++) { Engine& E = *fresh(); for (int t = 0; t < NT; t++) for (int s = 0; s < 16; s++) if (rand() % 3 == 0) E.pat[0].t[t].s[s].vel = 100;
      E.play(); std::vector<float> L(512), R(512);
      for (int b = 0; b < 120 && ok; b++) {
        E.setParam(G_WIDTH, rnd(0, 1.5f)); E.setParam(G_DRIVE, rnd(0, 1)); E.setParam(G_COMP, rnd(0, 1)); E.setParam(G_DLYFB, rnd(0, .95f)); E.setParam(G_STUTLEN, (float)(rand() % 4));
        const int t = rand() % NT; E.setParam(TPID(t, T_PAN), rnd(-1, 1)); E.setParam(TPID(t, T_TUNE), rnd(-24, 24)); E.setParam(TPID(t, T_RES), rnd(0, 1)); E.setParam(TPID(t, T_CUT), rnd(0, 1));
        E.setParam(TXID(t, XT_PUNCH), rnd(0, 1)); E.setParam(TXID(t, XT_COMP), rnd(0, 1)); E.setParam(TXID(t, XT_LOW), rnd(-1, 1)); E.setParam(TXID(t, XT_HIGH), rnd(-1, 1));
        E.setParam(XG_ID(XG_XYON), (float)(rand() % 2)); E.setParam(XG_ID(XG_XYX), rnd(-1, 1)); E.setParam(XG_ID(XG_XYY), rnd(0, 1)); E.setParam(XG_ID(XG_REPEAT), (float)(rand() % 5));
        if (rand() % 4 == 0) { E.liveFX = (uint16_t)(rand() & 0xffff); }
        if (rand() % 6 == 0) E.padDown(rand() % NT, 1 + rand() % 127); if (rand() % 6 == 0) E.padUp(rand() % NT);
        E.process(L.data(), R.data(), 512); for (int i = 0; i < 512; i++) if (!std::isfinite(L[i]) || !std::isfinite(R[i])) ok = false; } }
    check("random automation of every parameter, FX and pads: no NaN (60 x 120 blocks)", ok); }
  printf(fails ? "FEATURES: %d FAILED\n" : "features ok\n", fails);
  return fails ? 1 : 0;
}
