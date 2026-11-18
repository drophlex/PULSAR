cmake_minimum_required(VERSION 3.22)
project(PULSAR VERSION 1.0.0)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "")
include(FetchContent)
FetchContent_Declare(juce GIT_REPOSITORY https://github.com/juce-framework/JUCE.git GIT_TAG 8.0.4 GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(juce)

juce_add_plugin(Pulsar
  COMPANY_NAME "Polaris Sound Lab"
  COMPANY_WEBSITE "https://drophlex.github.io/PULSAR/"
  BUNDLE_ID com.polarissoundlab.pulsar
  PLUGIN_MANUFACTURER_CODE Plsl
  PLUGIN_CODE Puls
  FORMATS VST3 AU Standalone
  PRODUCT_NAME "PULSAR"
  DESCRIPTION "a drum machine for broken beats"
  IS_SYNTH TRUE
  NEEDS_MIDI_INPUT TRUE
  NEEDS_MIDI_OUTPUT FALSE
  IS_MIDI_EFFECT FALSE
  EDITOR_WANTS_KEYBOARD_FOCUS TRUE
  NEEDS_WEB_BROWSER TRUE
  VST3_CATEGORIES Instrument Drum
  AU_MAIN_TYPE kAudioUnitType_MusicDevice
  COPY_PLUGIN_AFTER_BUILD FALSE)

juce_add_binary_data(PulsarData SOURCES ui/index.html sounds.bin.gz)

target_sources(Pulsar PRIVATE Source/PluginProcessor.cpp Source/PluginEditor.cpp)
target_include_directories(Pulsar PRIVATE ../engine)
target_compile_definitions(Pulsar PUBLIC
  JUCE_WEB_BROWSER=1 JUCE_USE_CURL=0 JUCE_VST3_CAN_REPLACE_VST2=0 JUCE_DISPLAY_SPLASH_SCREEN=0)
target_link_libraries(Pulsar PRIVATE PulsarData juce::juce_audio_utils juce::juce_gui_extra
  PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_lto_flags juce::juce_recommended_warning_flags)
if(APPLE)
  target_compile_options(Pulsar PRIVATE -ffast-math)
endif()
