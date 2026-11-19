#include "PluginEditor.h"
#include "BinaryData.h"
using Completion = juce::WebBrowserComponent::NativeFunctionCompletion;

PulsarEditor::PulsarEditor(PulsarProcessor& p) : AudioProcessorEditor(p), proc(p) {
  web = std::make_unique<juce::WebBrowserComponent>(makeOptions());
  addAndMakeVisible(*web);
  setResizable(true, true);
  setResizeLimits(800, 500, 2880, 1800);
  setSize(1440, 900);   // the page is laid out at 1440 x 900 and scaled to fit the window (any size)
  web->goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
  startTimerHz(30);
}
PulsarEditor::~PulsarEditor() { stopTimer(); }
void PulsarEditor::resized() { web->setBounds(getLocalBounds()); }

std::optional<juce::WebBrowserComponent::Resource> PulsarEditor::getResource(const juce::String& url) {
  if (url == "/" || url.startsWith("/index.html")) {
    std::vector<std::byte> data((size_t)BinaryData::index_htmlSize);
    std::memcpy(data.data(), BinaryData::index_html, data.size());
    return juce::WebBrowserComponent::Resource { std::move(data), "text/html; charset=utf-8" };
  }
  return std::nullopt;
}

static juce::File lastDir() {
  auto d = juce::File::getSpecialLocation(juce::File::userMusicDirectory).getChildFile("PULSAR");
  d.createDirectory(); return d;
}

juce::WebBrowserComponent::Options PulsarEditor::makeOptions() {
  auto o = juce::WebBrowserComponent::Options {}
    .withNativeIntegrationEnabled()
    .withKeepPageLoadedWhenBrowserIsHidden()
    .withResourceProvider([this](const auto& url) { return getResource(url); })
    .withNativeFunction("msg", [this](const juce::Array<juce::var>& a, Completion done) {
      if (a.size() > 0) proc.message(juce::JSON::parse(a[0].toString())); done(juce::var()); })
    .withNativeFunction("sampleRate", [this](const juce::Array<juce::var>&, Completion done) { done(proc.rate()); })
    .withNativeFunction("getPats", [this](const juce::Array<juce::var>&, Completion done) {
      juce::MemoryOutputStream mo; for (int p = 0; p < pulsar::NPAT; p++) { juce::MemoryOutputStream one; juce::Base64::convertFromBase64(one, proc.patternB64(p)); mo.write(one.getData(), one.getDataSize()); }
      juce::DynamicObject::Ptr r = new juce::DynamicObject(); r->setProperty("bytes", juce::Base64::toBase64(mo.getData(), mo.getDataSize())); r->setProperty("size", (int)sizeof(pulsar::Pattern));
      done(juce::var(r.get())); })
    .withNativeFunction("getPat", [this](const juce::Array<juce::var>& a, Completion done) { done(proc.patternB64(a.size() > 0 ? (int)a[0] : 0)); })
    .withNativeFunction("setPat", [this](const juce::Array<juce::var>& a, Completion done) { if (a.size() >= 2) proc.setPattern((int)a[0], a[1].toString()); done(juce::var()); })
    .withNativeFunction("getProject", [this](const juce::Array<juce::var>&, Completion done) { done(proc.projectForPage()); })
    .withNativeFunction("setUi", [this](const juce::Array<juce::var>& a, Completion done) { if (a.size() > 0) proc.setUi(a[0].toString()); done(juce::var()); })
    .withNativeFunction("addSample", [this](const juce::Array<juce::var>& a, Completion done) {
      juce::MemoryOutputStream mo; int idx = -1;
      if (a.size() >= 5 && juce::Base64::convertFromBase64(mo, a[0].toString()))
        idx = proc.addUserSampleFloats(a[4].toString(), (const float*)mo.getData(), (int)(mo.getDataSize() / 4), (float)(double)a[1], (float)(double)a[2], (int)a[3]);
      done(idx); })
    .withNativeFunction("openSample", [this](const juce::Array<juce::var>&, Completion done) {
      chooser = std::make_unique<juce::FileChooser>("A sample for PULSAR", juce::File::getSpecialLocation(juce::File::userMusicDirectory), "*.wav;*.aif;*.aiff;*.flac;*.mp3;*.m4a;*.ogg");
      chooser->launchAsync(juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles, [this, done](const juce::FileChooser& fc) {
        auto f = fc.getResult(); done(f.existsAsFile() ? proc.loadUserSample(f) : juce::var()); }); })
    .withNativeFunction("openFile", [this](const juce::Array<juce::var>& a, Completion done) {
      chooser = std::make_unique<juce::FileChooser>("Open", lastDir(), a.size() > 0 ? a[0].toString() : "*.pulsar");
      chooser->launchAsync(juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles, [done](const juce::FileChooser& fc) {
        auto f = fc.getResult(); if (!f.existsAsFile()) { done(juce::var()); return; }
        juce::DynamicObject::Ptr r = new juce::DynamicObject(); r->setProperty("name", f.getFileName()); r->setProperty("text", f.loadFileAsString()); done(juce::var(r.get())); }); })
    .withNativeFunction("saveFile", [this](const juce::Array<juce::var>& a, Completion done) {
      // a[0] file name, a[1] base64 contents
      if (a.size() < 2) { done(false); return; }
      auto bytes = std::make_shared<juce::MemoryOutputStream>(); juce::Base64::convertFromBase64(*bytes, a[1].toString());
      chooser = std::make_unique<juce::FileChooser>("Save", lastDir().getChildFile(juce::File::createLegalFileName(a[0].toString())), "*" + juce::File(a[0].toString()).getFileExtension());
      chooser->launchAsync(juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::canSelectFiles | juce::FileBrowserComponent::warnAboutOverwriting, [bytes, done](const juce::FileChooser& fc) {
        auto f = fc.getResult(); bool ok = f != juce::File() && f.replaceWithData(bytes->getData(), bytes->getDataSize());
        if (ok) f.revealToUser();
        done(ok); }); })
    .withNativeFunction("dragWav", [this](const juce::Array<juce::var>&, Completion done) {
      // the loop rendered as audio and dragged out of the plug-in onto an audio track
      auto f = proc.renderLoop(); const bool ok = f.existsAsFile();
      if (ok) juce::DragAndDropContainer::performExternalDragDropOfFiles({ f.getFullPathName() }, false, this);
      done(ok); })
    .withNativeFunction("dragMidi", [this](const juce::Array<juce::var>& a, Completion done) {
      // a[0] file name, a[1] base64 .mid: written to a temporary folder and dragged out of the plug-in, onto a track in the DAW
      if (a.size() < 2) { done(false); return; }
      juce::MemoryOutputStream mo; juce::Base64::convertFromBase64(mo, a[1].toString());
      auto dir = juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile("PULSAR MIDI"); dir.createDirectory();
      auto f = dir.getChildFile(juce::File::createLegalFileName(a[0].toString()));
      const bool ok = f.replaceWithData(mo.getData(), mo.getDataSize());
      if (ok) juce::DragAndDropContainer::performExternalDragDropOfFiles({ f.getFullPathName() }, false, this);
      done(ok); })
    .withNativeFunction("openUrl", [](const juce::Array<juce::var>& a, Completion done) {
      // only the donation page, the project's pages and Polaris Sound Lab open outside the plug-in
      auto url = a.size() > 0 ? a[0].toString() : juce::String();
      if (url.startsWith("https://www.paypal.com/donate/") || url.startsWith("https://github.com/drophlex/") || url.startsWith("https://drophlex.github.io/")
          || url.startsWith("https://www.instagram.com/polaris.sound.lab") || url.startsWith("https://www.youtube.com/@PolarisSoundLab"))
        juce::URL(url).launchInDefaultBrowser();
      done(juce::var()); });
  return o;
}

// telemetry -> page (same shape as the web worklet: tele[64], scope[256])
void PulsarEditor::timerCallback() {
  proc.snapshot(tele, scope);
  juce::DynamicObject::Ptr o = new juce::DynamicObject();
  juce::Array<juce::var> t, s;
  for (float v : tele) t.add(v);
  for (float v : scope) s.add(v);
  o->setProperty("tele", t); o->setProperty("scope", s);
  web->emitEventIfBrowserIsVisible("tele", juce::var(o.get()));
  // MIDI learn: a CC just bound to a control; a learned CC moved a control (the page and the DAW follow)
  if (const int c = proc.takeLearnDone(); c >= 0) { juce::DynamicObject::Ptr l = new juce::DynamicObject(); l->setProperty("cc", c); web->emitEventIfBrowserIsVisible("learned", juce::var(l.get())); }
  if (const int i = proc.takeCcTouched(); i >= 0) { proc.syncHost(i); web->emitEventIfBrowserIsVisible("ccMoved", proc.ccInfo(i)); }
  if (auto r = proc.takeResample(); r.isObject()) web->emitEventIfBrowserIsVisible("resampled", r);
  // HYPERLINK: what the TR-8 played since the last frame (note, velocity, PULSAR's step) for GHOST GROOVE and the MIDI monitor
  if (auto hw = proc.takeHwIn(); !hw.empty()) { juce::Array<juce::var> a; for (auto& x : hw) { juce::Array<juce::var> e; e.add(x.note); e.add(x.vel); e.add(x.step); a.add(e); }
    juce::DynamicObject::Ptr h = new juce::DynamicObject(); h->setProperty("list", a); web->emitEventIfBrowserIsVisible("hwIn", juce::var(h.get())); }
}
