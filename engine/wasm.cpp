// PULSAR · WebAssembly entry (no libc)
#include "pulsar.h"
extern "C" {
void* memset(void* d, int c, unsigned long n) { unsigned char* p = (unsigned char*)d; while (n--) *p++ = (unsigned char)c; return d; }
void* memcpy(void* d, const void* s, unsigned long n) { unsigned char* a = (unsigned char*)d; const unsigned char* b = (const unsigned char*)s; while (n--) *a++ = *b++; return d; }
void* memmove(void* d, const void* s, unsigned long n) { unsigned char* a = (unsigned char*)d; const unsigned char* b = (const unsigned char*)s; if (a < b) while (n--) *a++ = *b++; else { a += n; b += n; while (n--) *--a = *--b; } return d; }
}
using namespace pulsar;
static Engine E;
static float POOLMEM[POOL];
static float outL[128], outR[128];
#define EXPORT extern "C" __attribute__((visibility("default")))
EXPORT void px_init(float sr) { E.init(sr, POOLMEM); }
EXPORT void px_process(int n) { E.process(outL, outR, n); }
EXPORT float* px_out_l() { return outL; }
EXPORT float* px_out_r() { return outR; }
EXPORT float* px_params() { return E.params; }
EXPORT int px_param_count() { return P_COUNT; }
EXPORT void px_param(int id, float v) { E.setParam(id, v); }
EXPORT float* px_tele() { return E.tele; }
EXPORT float* px_scope() { return E.scope; }
EXPORT int px_scope_w() { return E.scopeW; }
EXPORT uint8_t* px_pattern(int p) { return (uint8_t*)&E.pat[p < 0 ? 0 : p >= NPAT ? NPAT - 1 : p]; }
EXPORT int px_pattern_size() { return (int)sizeof(Pattern); }
EXPORT uint8_t* px_song() { return (uint8_t*)E.song; }
EXPORT void px_song_set(int n, int on) { E.songLen = n; E.songOn = on; }
EXPORT float* px_pool_write() { return E.poolWrite(); }
EXPORT int px_pool_free() { return E.poolFree(); }
EXPORT int px_add_sample(int len, float sr, float bpm, int slices) { return E.addSample(len, sr, bpm, slices); }
EXPORT int px_sample_count() { return E.nSmp; }
EXPORT void px_reset_samples(int keep) { if (keep < E.nSmp) { E.nSmp = keep; E.poolUsed = keep > 0 ? E.smp[keep - 1].off + E.smp[keep - 1].len : 0; } }
EXPORT void px_play() { E.play(); }
EXPORT void px_stop() { E.stop(); }
EXPORT void px_select(int p, int now) { E.select(p, now); }
EXPORT void px_rec(int on) { E.rec = on; E.perfTake = false; }
EXPORT void px_fx(int mask) { E.liveFX = (uint16_t)mask; if (!E.playing) E.fxNow = (uint16_t)mask; }
EXPORT void px_fill(int on) { E.fillHeld = on; }
EXPORT void px_pad(int t, int vel) { E.padDown(t, vel); }
EXPORT void px_pad_up(int t) { E.padUp(t); }
EXPORT int px_x_base() { return X_BASE; }
EXPORT int px_loop_at() { return E.loopAt; }
EXPORT void px_clear(int p) { E.clearPattern(p); }
EXPORT void px_host(int playing, float bpm, int sync) { E.hostSync = sync; E.hostPlaying = playing; E.hostBpm = bpm; }
EXPORT int px_dirty() { return E.dirty; }
