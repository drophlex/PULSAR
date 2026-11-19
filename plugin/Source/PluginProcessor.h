#pragma once
#include <juce_audio_utils/juce_audio_utils.h>
#include <juce_gui_extra/juce_gui_extra.h>
#include <array>
#include <atomic>
#include "pulsar.h"

// PULSAR plug-in: the same header-only engine the web version runs as WebAssembly, with the library built in.
class PulsarProcessor : public juce::AudioProcessor {
public:
  PulsarProcessor();
  ~PulsarProcessor() override = default;

  void prepareToPlay(double sampleRate, int samplesPerBlock) override;
  void releaseResources() override {}
  bool isBusesLayoutSupported(const BusesLayout&) const override;
  void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
  using AudioProcessor::processBlock;

  juce::AudioProcessorEditor* createEditor() override;
  bool hasEditor() const override { return true; }
  const juce::String getName() const override { return "PULSAR"; }
  bool acceptsMidi() const override { return true; }
  bool producesMidi() const override { return true; }
  bool isMidiEffect() const override { return false; }
  double getTailLengthSeconds() const override { return 4.0; }
  int getNumPrograms() override { return 1; }
  int getCurrentProgram() override { return 0; }
  void setCurrentProgram(int) override {}
  const juce::String getProgramName(int) override { return "PULSAR"; }
  void changeProgramName(int, const juce::String&) override {}
  void getStateInformation(juce::MemoryBlock&) override;
  void setStateInformation(const void*, int) override;

  // ---- called from the editor (message thread)
  void message(const juce::var& m);                       // the page's messages, same shapes as the web worklet's
  juce::String patternB64(int p);
  void setPattern(int p, const juce::String& b64);
  juce::var projectForPage();                             // what the page needs to show this instance's project
  void setUi(const juce::String& json) { const juce::SpinLock::ScopedLockType sl(lock); uiJson = json; }
  juce::var loadUserSample(const juce::File& f);          // {name, idx, bpm, bars} or void
  int addUserSampleFloats(const juce::String& name, const float* d, int len, float rate, float bpm, int slices);
  void snapshot(std::vector<float>& tele, std::vector<float>& scope);
  int takeLearnDone() { return learnDone.exchange(-1); }    // a CC just learned (for the page), or -1
  int takeCcTouched() { return ccTouched.exchange(-1); }
  void syncHost(int i) { if (i >= 0 && i < (int)hp.size()) setHostFromEngine(i, false); }
  juce::var ccInfo(int i);                                    // {key, id, v, fx}: what a learned CC just moved
  juce::String paramKey(int i) const { return i >= 0 && i < (int)params.size() ? params[(size_t)i]->getParameterID() : juce::String(); }
  double rate() const { return sr; }

private:
  struct HostP { int eng; float lo, hi; int steps; };        // eng: engine param id, or -1 - k for perform FX k, or -100 for PATTERN
  std::vector<HostP> hp; std::vector<juce::RangedAudioParameter*> params;
  std::unique_ptr<std::atomic<float>[]> lastHost;                  // normalised value last applied (audio thread) or set from the page
  int hostOf[pulsar::P_COUNT];
  void setHostFromEngine(int i, bool gesture);
  void applyHost();                                           // audio thread: host automation -> engine
  float denorm(int i, float v) const { auto& h = hp[(size_t)i]; float x = h.lo + (h.hi - h.lo) * v; return h.steps > 1 ? std::round(x) : x; }
  float normOf(int i, float x) const { auto& h = hp[(size_t)i]; return juce::jlimit(0.f, 1.f, (x - h.lo) / (h.hi - h.lo)); }

  std::unique_ptr<pulsar::Engine> eng;
  std::vector<float> pool;
  int bundled = 0, bundledUsed = 0;
  struct UserSample { juce::String name; float sr, bpm; int slices; std::vector<float> d; };
  std::vector<UserSample> user;
  juce::String uiJson;
  juce::SpinLock lock;
  double sr = 48000;
  bool hostWasPlaying = false, hostStarted = false; double lastPpq = 0, lastBlockBeats = 0;
  uint16_t uiFX = 0;
  juce::AudioFormatManager formats;
  static BusesProperties busesProps();
  void startAt(double ppq, double bpm);
  void midiCC(int cc, int v);
  std::array<int, 128> learn;                                 // CC -> host parameter index, -1 none
  int learnArm = -1; std::atomic<int> learnDone { -1 }; std::atomic<int> ccTouched { -1 };
  struct Off { int note, at, ch = 10; }; std::vector<Off> offs;
  // PULSAR 3 HYPERLINK (the original TR-8): on, MIDI channel, MIDI clock out, the offset that lines the TR-8 up with PULSAR
  struct Hyper { bool on = false, clock = false; int ch = 10, offMs = 0; } hl;
  struct Later { juce::MidiMessage m; int at; }; std::vector<Later> later;     // MIDI waiting for the offset
  double clkPh = 0; bool wasPlaying = false;
  struct HwIn { int note, vel, step; }; std::vector<HwIn> hwIn; juce::SpinLock hwLock;   // what the TR-8 played (GHOST GROOVE)
public:
  std::vector<HwIn> takeHwIn() { const juce::SpinLock::ScopedLockType l(hwLock); std::vector<HwIn> v; v.swap(hwIn); return v; }
private:
  std::vector<float> rsBuf; int rsLen = 0, rsN = 0; bool rsArm = false; std::atomic<bool> rsDone { false };
public:
  juce::var takeResample();                                  // message thread: a finished resample becomes one of your samples
private:
  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PulsarProcessor)
};
