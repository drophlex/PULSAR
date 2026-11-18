#include "../engine/pulsar.h"
#include <cstdio>
#include <cmath>
using namespace pulsar;
static float POOLMEM[1024];
int main() {
  static Engine E; E.init(48000, POOLMEM); E.params[G_COMP] = 0; E.params[G_DRIVE] = 0; E.params[G_MASTER] = 1;
  const char* nm[] = {"KICK","BOOM","HARD","SNARE","CLAP","HAT","OPEN","RIDE","TOM","RIM","COWBELL","FM","ZAP","NOISE"};
  static float L[48000 * 4], R[48000 * 4];
  for (int s = 0; s < S_COUNT; s++) {
    E.init(48000, POOLMEM); E.params[G_COMP] = 0; E.params[G_DRIVE] = 0; E.params[G_MASTER] = 1; E.params[TPID(0, T_SYN)] = s; E.params[TPID(0, T_LEVEL)] = 0.85f;
    E.pad(0, 127); for (int i = 0; i < 48000 * 4; i += 128) E.process(L + i, R + i, 128);
    float pk = 0; int last = 0; for (int i = 0; i < 48000 * 4; i++) { float a = fabsf(L[i]); if (a > pk) pk = a; } for (int i = 0; i < 48000 * 4; i++) if (fabsf(L[i]) > pk * 0.001f) last = i;
    float rms = 0; for (int i = 0; i < 2400; i++) rms += L[i] * L[i]; printf("%-8s peak %.2f  rms(50ms) %.3f  -60dB at %.0f ms\n", nm[s], pk, sqrtf(rms / 2400), last / 48.0); }
}
