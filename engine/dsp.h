// ANDROMEDA engine · dsp.h — math and building blocks (no libc, no allocation: runs native, in WebAssembly and on small chips)
// Created at Polaris Sound Lab · Dark Funk Durcal design
#pragma once
#include <stdint.h>

namespace pulsar {

constexpr float PI = 3.14159265358979f, TAU = 6.28318530717958f;
inline float clampf(float x, float a, float b) { return x < a ? a : x > b ? b : x; }
inline int clampi(int x, int a, int b) { return x < a ? a : x > b ? b : x; }
inline int maxi(int a, int b) { return a > b ? a : b; }
inline int mini(int a, int b) { return a < b ? a : b; }
inline float minf(float a, float b) { return a < b ? a : b; }
inline float maxf(float a, float b) { return a > b ? a : b; }
inline float absf(float x) { return __builtin_fabsf(x); }
inline float sqrtf_(float x) { return __builtin_sqrtf(x); }
inline float floorf_(float x) { return __builtin_floorf(x); }
inline float lerpf(float a, float b, float t) { return a + (b - a) * t; }

// 2^x, accurate to ~1e-5 relative over the audio range
inline float exp2f_(float x) {
  x = clampf(x, -126.f, 126.f);
  float fi = floorf_(x), f = x - fi;
  float p = 1.f + f * (0.6931472f + f * (0.2402265f + f * (0.0555041f + f * (0.0096181f + f * 0.0013334f))));
  union { float f; int32_t i; } u; u.i = (int32_t)(fi + 127.f) << 23; return p * u.f;
}
inline float expf_(float x) { return exp2f_(x * 1.4426950f); }
inline float log2f_(float x) {
  if (x <= 0.f) return -126.f;
  union { float f; int32_t i; } u{x}; float e = (float)(((u.i >> 23) & 255) - 127); u.i = (u.i & 0x007FFFFF) | 0x3F800000; float m = u.f;
  float t = (m - 1.f) / (m + 1.f), t2 = t * t; return e + 2.8853901f * t * (1.f + t2 * (0.33333333f + t2 * (0.2f + t2 * (0.14285714f + t2 * 0.11111111f))));
}
inline float powf_(float a, float b) { return a <= 0.f ? 0.f : exp2f_(b * log2f_(a)); }
inline float mtof(float m) { return 440.f * exp2f_((m - 69.f) / 12.f); }
inline float dbToGain(float db) { return exp2f_(db * 0.16609640f); }
// smooth saturator: tanh-like, exact limits ±1, unity slope at 0
inline float tanhf_(float x) { if (x > 4.97f) return 1.f; if (x < -4.97f) return -1.f; float x2 = x * x; return x * (27.f + x2) / (27.f + 9.f * x2); }
inline float softclip(float x, float ceil) { return ceil * tanhf_(x / ceil); }

// sine via a 2048-point table with linear interpolation (phase 0..1)
struct SinTab { float t[2049]; SinTab() { // generated with a recursive oscillator (no libm)
    float c = 1.f, s = 0.f, k = TAU / 2048.f; float ck = 1.f - k * k / 2.f + k * k * k * k / 24.f, sk = k - k * k * k / 6.f + k * k * k * k * k / 120.f;
    for (int i = 0; i <= 2048; i++) { t[i] = s; float ns = s * ck + c * sk, nc = c * ck - s * sk; s = ns; c = nc; if ((i & 255) == 255) { float n = 1.f / sqrtf_(s * s + c * c); s *= n; c *= n; } } } };
inline const SinTab& sintab() { static SinTab T; return T; }
inline float sinp(float ph) { ph -= floorf_(ph); float x = ph * 2048.f; int i = (int)x; if (i < 0) i = 0; if (i > 2047) i = 2047; float f = x - i; const float* t = sintab().t; return t[i] + (t[i + 1] - t[i]) * f; }
inline float cosp(float ph) { return sinp(ph + 0.25f); }

struct Rng { uint32_t s = 22222; float next() { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (float)(s >> 8) * (1.f / 16777216.f) * 2.f - 1.f; } float uni() { return next() * 0.5f + 0.5f; }
  int range(int a, int b) { return a + (int)(uni() * (b - a + 1 - 1e-4f)); } bool chance(float p) { return uni() < p; } };

// one-pole smoother for every control (no zipper, no jumps)
struct Smooth { float v = 0, t = 0, k = 0.002f; void set(float x) { t = x; } void snap(float x) { v = t = x; } void time(float sec, float sr) { k = 1.f - expf_(-1.f / maxf(1.f, sec * sr)); } inline float tick() { v += (t - v) * k; return v; } };

// TPT state variable filter (Zavalishin): stable under fast modulation
struct SVF {
  float ic1 = 0, ic2 = 0, g = 0, k = 1, a1 = 0, a2 = 0, a3 = 0;
  void set(float fc, float q, float sr) { fc = clampf(fc, 10.f, sr * 0.45f); float ph = 0.5f * fc / sr; g = sinp(ph) / cosp(ph);   /* tan(pi fc / sr) */
    k = 1.f / maxf(0.05f, q); a1 = 1.f / (1.f + g * (g + k)); a2 = g * a1; a3 = g * a2; }
  inline void tick(float x, float& lp, float& bp, float& hp) { float v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; lp = v2; bp = v1; hp = x - k * v1 - v2; }
  inline float lp(float x) { float l, b, h; tick(x, l, b, h); return l; }
  inline float bp(float x) { float l, b, h; tick(x, l, b, h); return b; }
  inline float hp(float x) { float l, b, h; tick(x, l, b, h); return h; }
  void reset() { ic1 = ic2 = 0; }
};
struct OnePole { float z = 0, a = 0; void setLP(float fc, float sr) { a = 1.f - expf_(-TAU * clampf(fc, 1.f, sr * 0.49f) / sr); } inline float lp(float x) { z += (x - z) * a; return z; } inline float hp(float x) { return x - lp(x); } };
struct DCBlock { float x1 = 0, y1 = 0; inline float tick(float x) { float y = x - x1 + 0.995f * y1; x1 = x; y1 = y; return y; } };

// shelving EQ (bilinear one-pole shelves, cheap and smooth)
struct Shelf { OnePole lp; float g = 1; bool low = true; void set(bool isLow, float fc, float db, float sr) { low = isLow; lp.setLP(fc, sr); g = dbToGain(db); }
  inline float tick(float x) { float l = lp.lp(x); return low ? x + (g - 1.f) * l : x + (g - 1.f) * (x - l); } };

// Moog-style ladder (4 cascaded one-poles with tanh feedback)
struct Ladder { float s[4] = {0, 0, 0, 0}, g = 0, res = 0;
  void set(float fc, float r, float sr) { g = 1.f - expf_(-TAU * clampf(fc, 20.f, sr * 0.45f) / sr); res = clampf(r, 0.f, 1.f) * 3.9f; }
  inline float tick(float x) { float in = tanhf_(x - res * s[3]); s[0] += g * (in - s[0]); s[1] += g * (s[0] - s[1]); s[2] += g * (s[1] - s[2]); s[3] += g * (s[2] - s[3]); return s[3] * (1.f + res * 0.25f); } };

// fixed-size delay line with fractional (hermite) read
template <int N> struct Delay {
  float b[N]; int w = 0;
  Delay() { for (int i = 0; i < N; i++) b[i] = 0; }
  inline void push(float x) { b[w] = x; w = (w + 1) % N; }
  inline float tap(int d) const { int i = w - 1 - d; while (i < 0) i += N; return b[i]; }
  inline float read(float d) const { d = clampf(d, 1.f, (float)(N - 4)); int i = (int)d; float f = d - i;
    float y0 = tap(i - 1), y1 = tap(i), y2 = tap(i + 1), y3 = tap(i + 2);
    float c0 = y1, c1 = 0.5f * (y2 - y0), c2 = y0 - 2.5f * y1 + 2.f * y2 - 0.5f * y3, c3 = 0.5f * (y3 - y0) + 1.5f * (y1 - y2);
    return ((c3 * f + c2) * f + c1) * f + c0; }
  void clear() { for (int i = 0; i < N; i++) b[i] = 0; }
};
struct Allpass { float* buf = nullptr; int n = 1, i = 0; float g = 0.6f; inline float tick(float x) { float d = buf[i], v = x + g * d; buf[i] = v; i = (i + 1) % n; return d - g * v; } };

// band-limited oscillators (polyBLEP)
inline float blep(float t, float dt) { if (t < dt) { t /= dt; return t + t - t * t - 1.f; } if (t > 1.f - dt) { t = (t - 1.f) / dt; return t * t + t + t + 1.f; } return 0.f; }
enum Wave { W_SAW = 0, W_SQR, W_TRI, W_SINE, W_PULSE };
struct Osc { float ph = 0, tri = 0;
  inline float tick(int w, float dt, float pw = 0.5f) {
    float y;
    switch (w) {
      case W_SAW: y = 2.f * ph - 1.f - blep(ph, dt); break;
      case W_SINE: y = sinp(ph); break;
      case W_TRI: { float sq = (ph < 0.5f ? 1.f : -1.f) + blep(ph, dt) - blep(ph + (ph < 0.5f ? 0.5f : -0.5f), dt); tri = tri * 0.999f + sq * dt * 4.f; y = tri; break; }
      default: { float p2 = ph + (1.f - pw); p2 -= floorf_(p2); y = (ph < pw ? 1.f : -1.f) + blep(ph, dt) - blep(p2, dt); y -= (2.f * pw - 1.f); break; }
    }
    ph += dt; if (ph >= 1.f) ph -= 1.f; return y; } };

// ADSR with exponential segments and a click-free fast release (for voice stealing)
struct Env {
  enum { IDLE, ATT, DEC, SUS, REL, FAST } st = IDLE; float v = 0, a = 0.01f, d = 0.1f, s = 0.7f, r = 0.3f, ka, kd, kr, kf, sr = 48000;
  void setSR(float x) { sr = x; kf = 1.f - expf_(-1.f / (0.004f * sr)); }
  void set(float A, float D, float S, float R) { a = maxf(A, 0.002f); d = D; s = S; r = maxf(R, 0.005f); ka = 1.f / (a * sr); kd = 1.f - expf_(-1.f / (maxf(d, 0.001f) * 0.3f * sr)); kr = 1.f - expf_(-1.f / (r * 0.3f * sr)); }
  void on() { st = ATT; } void off() { if (st != IDLE && st != FAST) st = REL; } void kill() { if (st != IDLE) st = FAST; }
  inline float tick() { switch (st) {
      case ATT: v += ka * 1.02f; if (v >= 1.f) { v = 1.f; st = DEC; } break;
      case DEC: v += (s - v) * kd; if (absf(v - s) < 1e-4f) st = SUS; break;
      case SUS: v = s; break;
      case REL: v -= v * kr; if (v < 1e-5f) { v = 0; st = IDLE; } break;
      case FAST: v -= v * kf; if (v < 1e-5f) { v = 0; st = IDLE; } break;
      default: break; } return v; }
  bool active() const { return st != IDLE; }
};
inline float tSec(int v) { return 0.002f * powf_(10.f, clampf(v / 127.f, 0.f, 1.f) * 3.9f); }   // 2 ms .. 16 s
inline float u127(int v) { return clampf(v / 127.f, 0.f, 1.f); }
inline float expMap(int v, float lo, float hi) { return lo * powf_(hi / lo, u127(v)); }

} // namespace pulsar
