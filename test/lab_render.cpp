// PULSAR 3 · renders the 36 family patterns (4 bars A, 3 bars B, 1 bar fill each) through the engine with their kits and the
// whole library; reports level, peak, density and NaN, and writes /tmp/lab/<n>.wav to listen to.  node test/lab_dump.mjs first.
#include "../engine/pulsar.h"
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cmath>
#include <vector>
#include <string>
using namespace pulsar;
static float POOLMEM[POOL];
static std::vector<unsigned char> B; static size_t at = 0;
static uint32_t u32() { uint32_t v; memcpy(&v, &B[at], 4); at += 4; return v; }
static float f32() { float v; memcpy(&v, &B[at], 4); at += 4; return v; }
static std::string str() { uint32_t n = u32(); std::string s((const char*)&B[at], n); at += n; return s; }
static std::vector<float> loadWav(const std::string& path, float& sr) {
  FILE* f = fopen(path.c_str(), "rb"); if (!f) { printf("no %s\n", path.c_str()); exit(1); } std::vector<unsigned char> b; int c; while ((c = fgetc(f)) != EOF) b.push_back((unsigned char)c); fclose(f);
  sr = (float)(b[24] | b[25] << 8 | b[26] << 16); size_t i = 12; std::vector<float> o;
  while (i + 8 < b.size()) { int n = b[i + 4] | b[i + 5] << 8 | b[i + 6] << 16 | b[i + 7] << 24; if (b[i] == 'd' && b[i + 1] == 'a') { for (int k = 0; k < n / 2; k++) o.push_back((short)(b[i + 8 + 2 * k] | b[i + 9 + 2 * k] << 8) / 32768.f); break; } i += 8 + n; }
  return o; }
static void wav(const char* path, const std::vector<float>& L, const std::vector<float>& R) {
  FILE* f = fopen(path, "wb"); int N = (int)L.size(), bytes = N * 4; unsigned char h[44] = {'R','I','F','F'}; auto w32 = [&](int o, int v) { for (int k = 0; k < 4; k++) h[o + k] = (v >> (8 * k)) & 255; };
  w32(4, 36 + bytes); memcpy(h + 8, "WAVEfmt ", 8); w32(16, 16); h[20] = 1; h[22] = 2; w32(24, 48000); w32(28, 48000 * 4); h[32] = 4; h[34] = 16; memcpy(h + 36, "data", 4); w32(40, bytes);
  fwrite(h, 1, 44, f); for (int i = 0; i < N; i++) { short a = (short)(fmaxf(-1, fminf(1, L[i])) * 32767), b = (short)(fmaxf(-1, fminf(1, R[i])) * 32767); fwrite(&a, 2, 1, f); fwrite(&b, 2, 1, f); } fclose(f); }
int main() {
  FILE* f = fopen("/tmp/lab.bin", "rb"); int c; while ((c = fgetc(f)) != EOF) B.push_back((unsigned char)c); fclose(f);
  static Engine E;
  int ns = (int)u32(); std::vector<std::string> path(ns); std::vector<float> bpm(ns); std::vector<int> sl(ns);
  for (int i = 0; i < ns; i++) { path[i] = "sounds/" + str() + ".wav"; bpm[i] = f32(); sl[i] = (int)u32(); }
  int np = (int)u32(), fails = 0; system("mkdir -p /tmp/lab");
  printf("%-52s %6s %6s %6s %7s %5s\n", "pattern", "bpm", "rms", "peak", "hits/b", "nan");
  for (int p = 0; p < np; p++) {
    std::string name = str(); E.init(48000, POOLMEM);
    for (int i = 0; i < ns; i++) { float sr; auto v = loadWav(path[i], sr); float* w = E.poolWrite(); for (size_t k = 0; k < v.size(); k++) w[k] = v[k]; E.addSample((int)v.size(), sr, bpm[i], sl[i]); }
    int ne = (int)u32(); for (int k = 0; k < ne; k++) { int id = (int)u32(); float v = f32(); E.setParam(id, v); }
    for (int k = 0; k < 3; k++) { uint32_t n = u32(); if (n != sizeof(Pattern)) { printf("pattern size %u vs %zu\n", n, sizeof(Pattern)); return 1; } memcpy(&E.pat[k], &B[at], n); at += n; }
    E.song[0] = { 0, 4 }; E.song[1] = { 1, 3 }; E.song[2] = { 2, 1 }; E.songLen = 3; E.songOn = true;
    const float bp = E.params[G_BPM]; const int N = (int)(48000.0 * 60.0 / bp * 4 * 8);
    std::vector<float> L(N), R(N); E.play();
    for (int i = 0; i < N; i += 128) E.process(&L[i], &R[i], std::min(128, N - i));
    double e = 0, pk = 0; int nan = 0; for (int i = 0; i < N; i++) { if (!std::isfinite(L[i])) nan++; e += L[i] * L[i] + R[i] * R[i]; pk = fmax(pk, fmax(fabs(L[i]), fabs(R[i]))); }
    int hits = 0; for (int t = 0; t < NT; t++) for (int s = 0; s < 16; s++) if (E.pat[0].t[t].s[s].vel) hits++;
    const double rms = 10 * log10(e / (2.0 * N) + 1e-12);
    const bool ok = nan == 0 && pk <= 0.8915 && rms > -24 && rms < -6 && hits >= 12;
    if (!ok) fails++;
    printf("%-52s %6.1f %6.1f %6.3f %7d %5d %s\n", name.c_str(), bp, rms, pk, hits, nan, ok ? "" : " <-- check");
    char fn[64]; snprintf(fn, sizeof fn, "/tmp/lab/%02d.wav", p + 1); wav(fn, L, R);
  }
  printf(fails ? "lab_render: %d to check\n" : "lab_render ok (36 patterns: audible, no clip over -1 dBFS, no NaN)\n", fails);
  return fails ? 1 : 0;
}
