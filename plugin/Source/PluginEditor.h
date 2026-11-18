#pragma once
#include "PluginProcessor.h"

// The editor is the same page as the web version, running in the system web view and calling the native engine.
class PulsarEditor : public juce::AudioProcessorEditor, private juce::Timer {
public:
  explicit PulsarEditor(PulsarProcessor&);
  ~PulsarEditor() override;
  void resized() override;
  void paint(juce::Graphics& g) override { g.fillAll(juce::Colour(0xff07080b)); }
private:
  void timerCallback() override;
  juce::WebBrowserComponent::Options makeOptions();
  std::optional<juce::WebBrowserComponent::Resource> getResource(const juce::String& url);
  PulsarProcessor& proc;
  std::unique_ptr<juce::FileChooser> chooser;
  std::unique_ptr<juce::WebBrowserComponent> web;
  std::vector<float> tele, scope;
  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PulsarEditor)
};
