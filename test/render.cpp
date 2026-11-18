// native test: build a groove, render 8 bars, write a WAV, check for NaN / clipping / time
#include "../engine/pulsar.h"
#include <cstdio>
#include <cstdlib>
#include <vector>
#include <cmath>
#include <chrono>
#include <cstring>
using namespace pulsar;
static float POOLMEM[POOL];
std::vector<float> loadWav(const char* path, float& sr) {
  FILE* f = fopen(path, "rb"); if (!f) { printf("no %s\n", path); exit(1); } std::vector<unsigned char> b; int c; while ((c = fgetc(f)) != EOF) b.push_back((unsigned char)c); fclose(f);
  sr = (float)(b[24] | b[25] << 8 | b[26] << 16); size_t i = 12; std::vector<float> o;
  while (i + 8 < b.size()) { int n = b[i + 4] | b[i + 5] << 8 | b[i + 6] << 16 | b[i + 7] << 24; if (b[i] == 'd' && b[i + 1] == 'a') { for (int k = 0; k < n / 2; k++) o.push_back((short)(b[i + 8 + 2 * k] | b[i + 9 + 2 * k] << 8) / 32768.f); break; } i += 8 + n; }
  return o; }
int load(Engine& E, const char* p, float bpm = 0, int sl = 16) { float sr; auto v = loadWav(p, sr); float* w = E.poolWrite(); for (size_t i = 0; i < v.size(); i++) w[i] = v[i]; return E.addSample((int)v.size(), sr, bpm, sl); }
int main(int argc, char** argv) {
  static Engine E; E.init(48000, POOLMEM);
  int brk = load(E, "sounds/breaks/brk funky 101.wav", 101, 32), snr = load(E, "sounds/70s kit/snare.wav"), kk = load(E, "sounds/80s studio/kick.wav");
  auto tp = [&](int t, int k, float v) { E.setParam(TPID(t, k), v); };
  E.params[G_BPM] = argc > 1 ? atof(argv[1]) : 170;
  tp(0, T_SYN, S_BOOM); tp(0, T_ROLE, R_KICK); tp(0, T_DECAY, 0.5f);
  tp(1, T_MODE, M_BREAK); tp(1, T_SMP, brk); tp(1, T_ROLE, R_BREAK); tp(1, T_DECAY, 0.3f); tp(1, T_ERA, E_SP12);
  tp(2, T_MODE, M_SAMPLE); tp(2, T_SMP, snr); tp(2, T_ROLE, R_SNARE); tp(2, T_DECAY, 1); tp(2, T_SENDR, 0.3f);
  tp(3, T_SYN, S_HAT); tp(3, T_ROLE, R_HAT); tp(3, T_LEVEL, 0.5f); tp(4, T_SYN, S_HARD); tp(4, T_LEVEL, 0.6f);
  tp(5, T_SYN, S_CLAP); tp(6, T_SYN, S_FM); tp(7, T_SYN, S_ZAP); tp(8, T_MODE, M_SAMPLE); tp(8, T_SMP, kk); tp(8, T_ERA, E_AMIGA);
  Pattern& P = E.pat[0];
  const char* kick = "X.........X..X..";
  for (int s = 0; s < 16; s++) { if (kick[s] == 'X') P.t[0].s[s].vel = 120; P.t[1].s[s].vel = 100; P.t[1].s[s].slice = (uint8_t)((s * 5) % 32); if (s % 2 == 0) P.t[3].s[s].vel = 70; }
  P.t[2].s[4].vel = 110; P.t[2].s[12].vel = 110; P.t[2].s[15].vel = 90; P.t[2].s[15].rat = 0x36;
  P.t[3].len = 12; P.t[6].s[7].vel = 80; P.t[7].s[14].vel = 90; P.t[5].s[12].vel = 60; P.t[8].s[8].vel = 100;
  P.perf[40 % 16] = 0;
  E.play();
  int N = 48000 * 12; std::vector<float> L(N), R(N); auto t0 = std::chrono::steady_clock::now();
  for (int i = 0; i < N; i += 128) {
    int bar = i / (int)(48000 * 60 / E.params[G_BPM] * 4);
    E.liveFX = bar == 3 ? (1 << F_DRILL) : bar == 4 ? (1 << F_STUTTER) : bar == 5 ? (1 << F_TAPESTOP) : bar == 6 ? ((1 << F_GLITCH) | (1 << F_CRUSH)) : bar == 7 ? (1 << F_FILTER) : 0;
    E.process(&L[i], &R[i], 128); }
  double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
  float pk = 0; int nan = 0; for (int i = 0; i < N; i++) { if (!std::isfinite(L[i])) nan++; pk = fmaxf(pk, fabsf(L[i])); }
  printf("render %.0f ms for %.1f s audio (%.1f%% realtime), peak %.3f, nan %d\n", ms, N / 48000.0, ms / (N / 48.0) * 100, pk, nan);
  FILE* f = fopen("/tmp/ht/pulsar.wav", "wb"); int bytes = N * 4; unsigned char h[44] = {'R','I','F','F'}; auto w32 = [&](int o, int v) { for (int k = 0; k < 4; k++) h[o + k] = (v >> (8 * k)) & 255; };
  w32(4, 36 + bytes); memcpy(h + 8, "WAVEfmt ", 8); w32(16, 16); h[20] = 1; h[22] = 2; w32(24, 48000); w32(28, 48000 * 4); h[32] = 4; h[34] = 16; memcpy(h + 36, "data", 4); w32(40, bytes);
  fwrite(h, 1, 44, f); for (int i = 0; i < N; i++) { short a = (short)(fmaxf(-1, fminf(1, L[i])) * 32767), b = (short)(fmaxf(-1, fminf(1, R[i])) * 32767); fwrite(&a, 2, 1, f); fwrite(&b, 2, 1, f); } fclose(f);
}
