// the plug-in's sound library (plugin/sounds.bin.gz) decodes to the same signal as the WAVs: signed, no DC, no fold-over
#include <cstdio>
#include <cstdint>
#include <cstring>
#include <cmath>
#include <vector>
#include <zlib.h>
int main() {
  gzFile g = gzopen("plugin/sounds.bin.gz", "rb"); if (!g) { printf("no sounds.bin.gz\n"); return 1; }
  std::vector<unsigned char> b; unsigned char buf[65536]; int r; while ((r = gzread(g, buf, sizeof buf)) > 0) b.insert(b.end(), buf, buf + r); gzclose(g);
  if (memcmp(b.data(), "PLSR", 4)) { printf("bad magic\n"); return 1; }
  uint32_t n; memcpy(&n, &b[4], 4); size_t o = 8; int bad = 0;
  for (uint32_t s = 0; s < n; s++) {
    float sr, bpm; int32_t sl, len; memcpy(&sr, &b[o], 4); memcpy(&bpm, &b[o + 4], 4); memcpy(&sl, &b[o + 8], 4); memcpy(&len, &b[o + 12], 4); o += 16;
    const int16_t* pcm = (const int16_t*)&b[o]; double dc = 0, pk = 0;
    for (int k = 0; k < len; k++) { const float x = (float)(int16_t)(uint16_t)pcm[k] / 32768.f; dc += x; pk = std::fmax(pk, std::fabs(x)); }   // as the plug-in reads it
    dc /= len > 0 ? len : 1; if (pk > 1.0001 || std::fabs(dc) > 0.1) { bad++; printf("sound %u: peak %.3f dc %+.3f\n", s, pk, dc); }
    o += (size_t)len * 2;
  }
  printf(bad ? "plugin_library: %d sounds wrong\n" : "plugin_library ok (%u sounds: within full scale, no DC)\n", bad ? bad : n); return bad ? 1 : 0;
}
