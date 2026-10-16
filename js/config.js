/**
 * TigerType Configuration & Global Constants
 */
export const CONFIG = {
  APP_NAME: "TigerType",
  DEFAULT_MODE: "time", // "time" | "words"
  DEFAULT_TIME: 30, // seconds
  DEFAULT_WORDS: 25, // count
  DEFAULT_LANGUAGE: "uzbek", // "uzbek" | "english" | "code"
  
  TIME_MODES: [15, 30, 60, 120],
  WORD_MODES: [10, 25, 50, 100],
  LANGUAGES: [
    { id: "uzbek", label: "uzbek" },
    { id: "english", label: "english" },
    { id: "code", label: "code syntax" }
  ],

  SWITCH_PROFILES: [
    { id: "off", label: "Mute" },
    { id: "blue", label: "Clicky Blue" },
    { id: "red", label: "Linear Red" },
    { id: "brown", label: "Tactile Brown" }
  ],
  DEFAULT_SWITCH: "blue",

  THEMES: [
    { id: "dark-graphite", label: "noir charcoal", type: "dark" },
    { id: "dark-oled", label: "pitch noir", type: "dark" },
    { id: "light-studio", label: "swiss studio", type: "light" },
    { id: "light-paper", label: "nordic paper", type: "light" }
  ],
  DEFAULT_THEME: "dark-graphite",

  BOT_SPEEDS: [30, 60, 85, 110], // WPM choices
  DEFAULT_BOT_WPM: 65,

  PEER_CONFIG: {
    debug: 0,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  }
};
