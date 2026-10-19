import { CONFIG } from "./config.js";
import { Metrics } from "./core/metrics.js";
import { PrecisionTimer } from "./core/timer.js";
import { WordBank } from "./core/wordBank.js";
import { TypingEngine } from "./core/typingEngine.js";
import { SoundEngine } from "./audio/soundEngine.js";
import { CaretRenderer } from "./ui/caretRenderer.js";
import { ModalManager, Toast } from "./ui/modalManager.js";
import { StorageManager } from "./storage/storage.js";
import { BotRacer } from "./multiplayer/botRacer.js";
import { PeerManager } from "./multiplayer/peerManager.js";

/**
 * Cross-platform clipboard copy helper with fallback for non-secure HTTP contexts
 */
function copyToClipboard(text, fallbackInput = null) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      if (fallbackInput && typeof fallbackInput.select === "function") {
        fallbackInput.focus();
        fallbackInput.select();
        const ok = document.execCommand("copy");
        if (ok) return resolve();
      }
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (ok) resolve();
      else reject(new Error("Nusxalab bo'lmadi"));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * TigerType Orchestrator
 */
class TigerTypeApp {
  constructor() {
    // State
    this.mode = CONFIG.DEFAULT_MODE; // "time" | "words"
    this.modeValue = CONFIG.DEFAULT_TIME; // 30
    this.language = CONFIG.DEFAULT_LANGUAGE; // "uzbek"
    this.currentSwitch = CONFIG.DEFAULT_SWITCH; // "blue"
    this.botSpeed = CONFIG.DEFAULT_BOT_WPM; // 65
    this.currentTheme = CONFIG.DEFAULT_THEME; // "dark-graphite"
    this.hasPunctuation = false;
    this.hasNumbers = false;
    this.isRaceMode = false;
    this.raceOpponentType = "none"; // "none" | "bot" | "peer"

    // Timelines for Canvas Chart
    this.speedTimeline = [];
    this.errorTimeline = [];
    this.errorsThisSecond = 0;

    // DOM Elements
    this.typingWrapper = document.getElementById("typing-wrapper");
    this.typingInput = document.getElementById("typing-input");
    this.wordsContainer = document.getElementById("words-container");
    this.caretElement = document.getElementById("caret");
    this.focusWarning = document.getElementById("focus-warning");

    // HUD Elements
    this.hudTimer = document.getElementById("hud-timer");
    this.hudTimerLabel = document.getElementById("hud-timer-label");
    this.hudWpm = document.getElementById("hud-wpm");
    this.hudAcc = document.getElementById("hud-acc");

    // Race Track Elements
    this.raceSection = document.getElementById("race-tracks-section");
    this.raceModeLabel = document.getElementById("race-mode-label");
    this.raceRoomCodeTag = document.getElementById("race-room-code-tag");
    this.playerTrackFill = document.getElementById("player-track-fill");
    this.playerRunner = document.getElementById("player-runner");
    this.playerLiveWpm = document.getElementById("player-live-wpm");
    this.opponentTrackFill = document.getElementById("opponent-track-fill");
    this.opponentRunner = document.getElementById("opponent-runner");
    this.opponentLiveWpm = document.getElementById("opponent-live-wpm");
    this.opponentNameDisplay = document.getElementById("opponent-name-display");
    this.opponentAvatar = document.getElementById("opponent-avatar");

    // Modules
    this.soundEngine = new SoundEngine();
    this.caretRenderer = new CaretRenderer(this.caretElement, this.wordsContainer);
    this.timer = new PrecisionTimer();
    this.modals = new ModalManager();
    this.typingEngine = new TypingEngine(this.wordsContainer, this.caretRenderer, this.soundEngine);
    this.botRacer = new BotRacer("TigerBot", this.botSpeed);
    this.peerManager = new PeerManager();
    this.remoteFinished = false;
    this.isCountdownActive = false;
    this._countdownInterval = null;
    this._lastRaceConfig = null;
    this._guestReceivedConfig = false;

    this.init();
  }

  init() {
    this._loadSavedPreferences();
    this._bindDOMEvents();
    this._setupTypingEngineCallbacks();
    this._setupMultiplayerCallbacks();
    this._checkURLParamsForRoom();
    this.resetTest();
    this.typingInput.focus();
  }

  _loadSavedPreferences() {
    const prefs = StorageManager.getPreferences();
    if (prefs) {
      if (prefs.language) this.language = prefs.language;
      if (prefs.mode) this.mode = prefs.mode;
      if (prefs.modeValue) this.modeValue = prefs.modeValue;
      if (prefs.currentSwitch) this.currentSwitch = prefs.currentSwitch;
      if (prefs.theme) this.currentTheme = prefs.theme;
      if (prefs.hasPunctuation !== undefined) this.hasPunctuation = prefs.hasPunctuation;
      if (prefs.hasNumbers !== undefined) this.hasNumbers = prefs.hasNumbers;
    }

    this._applyTheme(this.currentTheme, false);
    this.soundEngine.setProfile(this.currentSwitch);
    this._updateSoundButtonUI();
    this._updateControlPillsUI();
    this._updateLanguageUI();
  }

  _bindDOMEvents() {
    // Focus management
    const focusInput = () => {
      if (document.querySelector(".modal-overlay.active")) return;
      this.typingInput.focus();
      this.typingWrapper.classList.remove("unfocused");
    };

    this.modals.onClose = () => {
      focusInput();
    };

    // Clicking anywhere outside header/controls/footer focuses typing area
    window.addEventListener("click", (e) => {
      if (document.querySelector(".modal-overlay.active")) return;
      if (!e.target.closest(".app-header") && !e.target.closest(".controls-container") && !e.target.closest(".app-footer") && !e.target.closest(".restart-bar")) {
        focusInput();
      }
    });

    // Explicit typing wrapper & focus warning click handlers
    this.typingWrapper.addEventListener("click", () => {
      focusInput();
    });

    const focusWarning = document.getElementById("focus-warning");
    if (focusWarning) {
      focusWarning.addEventListener("click", () => {
        focusInput();
      });
    }

    // Brand logo click
    const brandLogo = document.getElementById("brand-logo");
    if (brandLogo) {
      brandLogo.addEventListener("click", () => {
        this.resetTest();
        focusInput();
      });
    }

    this.typingInput.addEventListener("blur", () => {
      this.typingWrapper.classList.add("unfocused");
    });

    this.typingInput.addEventListener("focus", () => {
      this.typingWrapper.classList.remove("unfocused");
    });

    let lastKeydownTime = 0;

    // Keystrokes on typingInput (Physical Desktop Keyboard)
    this.typingInput.addEventListener("keydown", (e) => {
      if (this.isCountdownActive) {
        e.preventDefault();
        return;
      }
      if (e.key === "Unidentified" || e.keyCode === 229) {
        return;
      }
      if (e.key.length === 1 || e.key === "Backspace" || e.key === " ") {
        lastKeydownTime = performance.now();
        this.typingEngine.handleKeyDown(e);
      }
    });

    // Mobile / Virtual keyboard input events (beforeinput & input for Android/iOS soft keyboards)
    this.typingInput.addEventListener("beforeinput", (e) => {
      if (this.isCountdownActive) {
        e.preventDefault();
        return;
      }
      // If a physical keydown just handled this within 50ms, do NOT double-process!
      if (performance.now() - lastKeydownTime < 50) {
        return;
      }
      if (e.inputType === "deleteContentBackward" || e.inputType === "deleteWordBackward") {
        this.typingEngine.handleMobileInput("", e.inputType);
      }
    });

    this.typingInput.addEventListener("input", (e) => {
      if (this.isCountdownActive) {
        this.typingInput.value = "";
        return;
      }
      // If a physical keydown just handled this within 50ms, do NOT double-process!
      if (performance.now() - lastKeydownTime < 50) {
        this.typingInput.value = "";
        return;
      }
      const val = this.typingInput.value;
      if (val) {
        this.typingEngine.handleMobileInput(val, e.inputType || "insertText");
        this.typingInput.value = "";
      }
    });

    // Mobile quick keyboard trigger pill
    const mobileKbdPill = document.getElementById("mobile-keyboard-pill");
    if (mobileKbdPill) {
      mobileKbdPill.addEventListener("click", () => {
        focusInput();
      });
      mobileKbdPill.addEventListener("touchend", (e) => {
        e.preventDefault();
        focusInput();
      });
    }

    // Touch listener directly on typing container for instant soft keyboard invocation on mobile
    this.typingWrapper.addEventListener("pointerdown", (e) => {
      if (!document.querySelector(".modal-overlay.active")) {
        focusInput();
      }
    });

    // Global keyboard handling & seamless auto-focus capture
    window.addEventListener("keydown", (e) => {
      const resultsActive = document.getElementById("results-modal")?.classList.contains("active");
      if (resultsActive && (e.key === "Tab" || e.key === "Enter")) {
        e.preventDefault();
        this.modals.closeAll();
        this.resetTest();
        focusInput();
        return;
      }

      if (document.querySelector(".modal-overlay.active")) {
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        this.resetTest();
        focusInput();
        return;
      }

      // Seamless typing auto-capture:
      // If typingInput is blurred and user presses a printable character, space, or backspace,
      // instantly restore focus and dispatch keydown directly so no keystroke is ever dropped!
      if (document.activeElement !== this.typingInput) {
        if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
          return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) {
          return;
        }
        if (e.key.length === 1 || e.key === "Backspace" || e.key === " ") {
          focusInput();
          lastKeydownTime = performance.now();
          this.typingEngine.handleKeyDown(e);
          e.preventDefault();
        }
      }
    });

    // Punctuation toggle button
    const puncBtn = document.getElementById("btn-toggle-punc");
    if (puncBtn) {
      puncBtn.addEventListener("click", () => {
        this.hasPunctuation = !this.hasPunctuation;
        puncBtn.classList.toggle("active", this.hasPunctuation);
        this._savePrefs();
        this.resetTest();
        focusInput();
      });
    }

    // Numbers toggle button
    const numBtn = document.getElementById("btn-toggle-num");
    if (numBtn) {
      numBtn.addEventListener("click", () => {
        this.hasNumbers = !this.hasNumbers;
        numBtn.classList.toggle("active", this.hasNumbers);
        this._savePrefs();
        this.resetTest();
        focusInput();
      });
    }

    // Language indicator button (Monkeytype style, above words)
    const langBtn = document.getElementById("lang-indicator-btn");
    if (langBtn) {
      langBtn.addEventListener("click", () => {
        const langs = ["uzbek", "english", "code"];
        const nextIdx = (langs.indexOf(this.language) + 1) % langs.length;
        this.language = langs[nextIdx];
        this._updateLanguageUI();
        this._savePrefs();
        this.resetTest();
        focusInput();
      });
    }

    // Mode Type pills (Time / Words / Quote / Zen / Custom)
    document.querySelectorAll("#mode-type-selector .pill-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#mode-type-selector .pill-option").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const chosenMode = btn.dataset.modeType;
        if (chosenMode === "time" || chosenMode === "words") {
          this.mode = chosenMode;
        } else {
          this.mode = "words";
        }
        this._updateModeValuesPillOptions();
        this._savePrefs();
        this.resetTest();
        focusInput();
      });
    });

    // Mode Value pills (15, 30, 60, 120 or 10, 25, 50, 100)
    document.getElementById("mode-val-selector").addEventListener("click", (e) => {
      const btn = e.target.closest(".pill-option");
      if (!btn) return;
      document.querySelectorAll("#mode-val-selector .pill-option").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      this.modeValue = parseInt(btn.dataset.val, 10);
      this._savePrefs();
      this.resetTest();
      focusInput();
    });

    // Auto-unlock Web Audio on first user interaction (click, keydown, pointer)
    const unlockAudio = () => {
      this.soundEngine.init();
      this.soundEngine.resume();
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("pointerdown", unlockAudio);
    };
    window.addEventListener("keydown", unlockAudio, { passive: true });
    window.addEventListener("pointerdown", unlockAudio, { passive: true });

    // Theme switch toggle (cycles through 4 themes)
    const cycleTheme = () => {
      const themes = CONFIG.THEMES;
      const currentIndex = themes.findIndex(t => t.id === this.currentTheme);
      const nextIndex = (currentIndex + 1) % themes.length;
      const nextTheme = themes[nextIndex];
      this._applyTheme(nextTheme.id);
      this._savePrefs();
    };

    const themeBtn = document.getElementById("theme-toggle-btn");
    if (themeBtn) themeBtn.addEventListener("click", cycleTheme);

    const footerThemeBtn = document.getElementById("footer-theme-btn");
    if (footerThemeBtn) footerThemeBtn.addEventListener("click", cycleTheme);

    // Switch sound toggle
    document.getElementById("sound-toggle-btn").addEventListener("click", () => {
      this.soundEngine.init();
      this.soundEngine.resume();
      const order = ["blue", "red", "brown", "off"];
      const nextIndex = (order.indexOf(this.currentSwitch) + 1) % order.length;
      this.currentSwitch = order[nextIndex];
      this.soundEngine.setProfile(this.currentSwitch);
      this._updateSoundButtonUI();
      this._savePrefs();
      // Test sound preview
      if (this.currentSwitch !== "off") {
        this.soundEngine.playKeystroke("a");
      }
    });

    // Restart button
    document.getElementById("restart-test-btn").addEventListener("click", () => {
      this.resetTest();
      focusInput();
    });

    // Results modal "Next" button
    document.getElementById("res-next-btn").addEventListener("click", () => {
      this.modals.closeAll();
      this.resetTest();
      focusInput();
    });

    // Open Multiplayer modal
    document.getElementById("open-race-btn").addEventListener("click", () => {
      this.modals.showMultiplayer();
    });

    // Open History modal
    document.getElementById("open-history-btn").addEventListener("click", () => {
      this.modals.showHistory(StorageManager.getHistory());
    });

    // Export history
    document.getElementById("export-history-btn").addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(StorageManager.exportData());
      const dlAnchor = document.createElement("a");
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `tigertype_history_${Date.now()}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
    });

    // Bot speed selection cards in modal
    document.querySelectorAll("#bot-speed-pills .bot-speed-card, #bot-speed-pills .pill-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#bot-speed-pills .bot-speed-card, #bot-speed-pills .pill-option").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.botSpeed = parseInt(btn.dataset.botWpm, 10);
        this.botRacer.setSpeed(this.botSpeed);
      });
    });

    // Start Bot Race button
    document.getElementById("start-bot-race-btn").addEventListener("click", () => {
      this.modals.closeAll();
      this.startBotRace();
      focusInput();
    });

    // Leave race button
    document.getElementById("leave-race-btn").addEventListener("click", () => {
      this.leaveRace();
      focusInput();
    });

    // Copy room link on race track
    const copyRaceBtn = document.getElementById("copy-room-link-btn");
    if (copyRaceBtn) {
      copyRaceBtn.addEventListener("click", () => {
        if (this.peerManager.roomId) {
          const url = `${window.location.origin}${window.location.pathname}?room=${this.peerManager.roomId}`;
          copyToClipboard(url).then(() => {
            const orig = copyRaceBtn.textContent;
            copyRaceBtn.textContent = "nusxalandi!";
            setTimeout(() => {
              copyRaceBtn.textContent = orig;
            }, 2000);
          }).catch(() => {
            prompt("Ushbu xona havolasidan nusxa oling:", url);
          });
        }
      });
    }

    // Host room button
    document.getElementById("create-room-btn").addEventListener("click", () => {
      this.createPeerRoom();
    });

    // Join room button & Enter key
    const joinInput = document.getElementById("join-room-input");
    const doJoin = () => {
      if (joinInput) {
        this.joinPeerRoom(joinInput.value.trim());
      }
    };

    document.getElementById("join-room-btn").addEventListener("click", doJoin);
    if (joinInput) {
      joinInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          doJoin();
        }
      });
    }

    // Lobby: Copy Code button
    const lobbyCopyCodeBtn = document.getElementById("lobby-copy-code-btn");
    if (lobbyCopyCodeBtn) {
      lobbyCopyCodeBtn.addEventListener("click", () => {
        if (this.peerManager.roomId) {
          copyToClipboard(this.peerManager.roomId).then(() => {
            lobbyCopyCodeBtn.textContent = "nusxalandi";
            setTimeout(() => {
              lobbyCopyCodeBtn.textContent = "nusxalash";
            }, 2000);
          }).catch(() => {
            prompt("Xona kodi:", this.peerManager.roomId);
          });
        }
      });
    }

    // Lobby: Copy Link button
    const lobbyCopyLinkBtn = document.getElementById("lobby-copy-link-btn");
    if (lobbyCopyLinkBtn) {
      lobbyCopyLinkBtn.addEventListener("click", () => {
        const linkInput = document.getElementById("lobby-room-link-input");
        if (linkInput && linkInput.value) {
          copyToClipboard(linkInput.value, linkInput).then(() => {
            lobbyCopyLinkBtn.textContent = "nusxalandi";
            setTimeout(() => {
              lobbyCopyLinkBtn.textContent = "nusxalash";
            }, 2000);
          }).catch(() => {
            prompt("Xona havolasi:", linkInput.value);
          });
        }
      });
    }

    // Lobby: Cancel / Close buttons
    const cancelLobby = () => {
      this.leaveRace();
      this.modals.closeAll();
      focusInput();
    };

    const lobbyCancelBtn = document.getElementById("lobby-cancel-btn");
    if (lobbyCancelBtn) lobbyCancelBtn.addEventListener("click", cancelLobby);

    const closeLobbyBtn = document.getElementById("close-lobby-btn");
    if (closeLobbyBtn) closeLobbyBtn.addEventListener("click", cancelLobby);

    // Window resize recalculates caret
    window.addEventListener("resize", () => {
      this.caretRenderer.recalculate();
    });
  }

  _setupTypingEngineCallbacks() {
    this.typingEngine.onStart = () => {
      document.querySelector(".app-container")?.classList.add("typing-active");
      this.speedTimeline = [];
      this.errorTimeline = [];
      this.errorsThisSecond = 0;

      const duration = this.mode === "time" ? this.modeValue : 0;
      
      this.timer.start(
        duration,
        // On tick (frame update: only update timer text when integer second changes)
        (displayVal, elapsedSec) => {
          if (this._lastTimerDisplay !== displayVal) {
            this._lastTimerDisplay = displayVal;
            this.hudTimer.textContent = displayVal;
          }
        },
        // On second sample (for Canvas Chart)
        (sec, elapsedSec) => {
          this._updateLiveMetrics(elapsedSec);
          const liveWpm = Metrics.getNetWPM(
            this.typingEngine.correctChars,
            elapsedSec
          );
          this.speedTimeline.push(liveWpm);
          this.errorTimeline.push(this.errorsThisSecond);
          this.errorsThisSecond = 0;
        },
        // On countdown complete
        () => {
          this.typingEngine.finish();
        }
      );

      // Start Bot if in bot race mode
      if (this.isRaceMode && this.raceOpponentType === "bot") {
        this.botRacer.start(this.typingEngine.words);
      }
    };

    this.typingEngine.onWordFinish = (wordIndex, totalWords) => {
      // In time mode, replenish words continuously so words never run out
      if (this.mode === "time" && wordIndex >= totalWords - 8) {
        const more = WordBank.generateWords(this.language, 25, null, {
          punctuation: this.hasPunctuation,
          numbers: this.hasNumbers
        });
        this.typingEngine.appendWords(more);
      }
    };

    this.typingEngine.onKeystroke = (info) => {
      if (info && info.isError) {
        this.errorsThisSecond += (info.errorCount || 1);
      }
      this._updateLiveMetrics(this.timer.getElapsedSeconds());

      // Sync progress in race mode
      if (this.isRaceMode) {
        const liveWpm = Metrics.getNetWPM(
          this.typingEngine.correctChars,
          this.timer.getElapsedSeconds()
        );
        this._updatePlayerTrack(info.progress, liveWpm);

        if (this.raceOpponentType === "peer") {
          this.peerManager.broadcastProgress(info.progress, liveWpm);
        }
      }
    };

    this.typingEngine.onFinish = (summary) => {
      document.querySelector(".app-container")?.classList.remove("typing-active");
      this.timer.stop();
      if (this.isRaceMode && this.raceOpponentType === "bot") {
        this.botRacer.stop();
      }

      const elapsed = this.timer.getElapsedSeconds();
      // Gross WPM measures total physical typing output
      const grossWpm = Metrics.getGrossWPM(summary.correct + summary.incorrect, elapsed);
      // Net WPM only counts accurately completed characters (letters + spaces)
      const netWpm = Metrics.getNetWPM(summary.correct, elapsed);
      // Accuracy = correct / (correct + totalErrorsMade) * 100
      const accuracy = Metrics.getAccuracy(summary.correct, summary.totalErrors);
      // CPM = correct characters per minute = netWpm * 5
      const cpm = Metrics.getCPM(summary.correct, elapsed);
      const consistency = Metrics.getConsistency(this.speedTimeline);

      // Determine race placement
      let racePlacement = null;
      if (this.isRaceMode) {
        if (this.raceOpponentType === "peer") {
          racePlacement = this.remoteFinished ? 2 : 1;
          this.peerManager.broadcastFinish(netWpm, accuracy, elapsed);
        } else if (this.raceOpponentType === "bot") {
          racePlacement = this.botRacer.isFinished ? 2 : 1;
        }
      }

      const fullResult = {
        grossWpm,
        netWpm,
        accuracy,
        cpm,
        consistency,
        time: elapsed,
        totalErrors: summary.totalErrors,
        mode: this.mode,
        modeValue: this.modeValue,
        language: this.language,
        speedTimeline: this.speedTimeline,
        errorTimeline: this.errorTimeline,
        racePlacement
      };

      const { isNewPb } = StorageManager.saveTestResult(fullResult);
      this.modals.showResults(fullResult, isNewPb);
    };
  }

  _setupMultiplayerCallbacks() {
    this.botRacer.onProgress = (data) => {
      this._updateOpponentTrack(data.progress, data.liveWpm);
    };

    this.botRacer.onFinish = (data) => {
      this._updateOpponentTrack(1, data.finalWpm);
    };

    this.peerManager.onPeerReady = (id) => {
      this.raceRoomCodeTag.textContent = `#${id}`;
    };

    this.peerManager.onConnected = (info) => {
      this.raceOpponentType = "peer";
      this.isRaceMode = true;
      this.raceSection.classList.add("active");
      this.raceModeLabel.textContent = "do'st bilan poyga";
      this.remoteFinished = false;

      if (!info.isHost) {
        this.opponentNameDisplay.textContent = "Mezbon";
        this.modals.updateLobbyConnected("Mezbon");

        // Self-healing check: if guest hasn't received config after 1200ms, request it again
        setTimeout(() => {
          if (!this._guestReceivedConfig && this.peerManager.isConnected) {
            this.peerManager.send({ type: "REQUEST_CONFIG" });
          }
        }, 1200);
      }
    };

    this.peerManager.onGuestJoined = (guestName) => {
      this.opponentNameDisplay.textContent = guestName;
      this.modals.updateLobbyConnected(guestName);

      // Host generates words and transmits exact words array to guest
      const wordCount = this.mode === "words" ? this.modeValue : Math.max(40, Math.ceil(this.modeValue * 2.5));
      const seed = Math.floor(Math.random() * 100000);
      const words = WordBank.generateWords(this.language, wordCount, seed, {
        punctuation: this.hasPunctuation,
        numbers: this.hasNumbers
      });

      this.typingEngine.loadWords(words, this.mode);
      this._resetHUDState();

      // Cache race config for potential re-transmission
      this._lastRaceConfig = {
        type: "RACE_CONFIG",
        hostName: "Mezbon",
        words,
        mode: this.mode,
        modeValue: this.modeValue,
        language: this.language
      };

      // Transmit RACE_CONFIG to guest
      this.peerManager.send(this._lastRaceConfig);

      // Synchronized countdown trigger after short delay so guest UI stabilizes
      setTimeout(() => {
        if (this.peerManager.isConnected) {
          this.peerManager.send({ type: "START_COUNTDOWN" });
          this._startSynchronizedCountdown();
        }
      }, 1200);
    };

    this.peerManager.onRequestConfig = () => {
      if (this._lastRaceConfig && this.peerManager.isConnected) {
        this.peerManager.send(this._lastRaceConfig);
      }
    };

    this.peerManager.onConfigAck = () => {
      // Guest confirmed receipt of words
    };

    this.peerManager.onRaceStart = (config) => {
      this._guestReceivedConfig = true;
      this.mode = config.mode;
      this.modeValue = config.modeValue;
      this.language = config.language;
      this.opponentNameDisplay.textContent = config.hostName || "Mezbon";
      this._updateControlPillsUI();
      this._updateLanguageUI();

      // Guest loads the exact same words
      this.typingEngine.loadWords(config.words, this.mode);
      this._resetHUDState();

      // Acknowledge receipt
      this.peerManager.send({ type: "CONFIG_ACK" });
    };

    this.peerManager.onCountdownStart = () => {
      this._startSynchronizedCountdown();
    };

    this.peerManager.onRemoteProgress = (data) => {
      this._updateOpponentTrack(data.progress, data.liveWpm);
    };

    this.peerManager.onRemoteFinish = (data) => {
      this.remoteFinished = true;
      this._updateOpponentTrack(1, data.finalWpm);
    };

    this.peerManager.onDisconnected = () => {
      this.leaveRace();
    };
  }

  _startSynchronizedCountdown() {
    if (this._countdownInterval) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }

    this.isCountdownActive = true;
    this.remoteFinished = false;
    this.modals.closeAll();

    const overlay = document.getElementById("race-countdown-overlay");
    const countNum = document.getElementById("countdown-num");
    if (!overlay || !countNum) {
      this.isCountdownActive = false;
      this.typingInput.focus();
      return;
    }

    overlay.style.display = "flex";
    let count = 3;
    countNum.textContent = count;
    countNum.style.color = "var(--accent-gold)";

    this._countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        countNum.textContent = count;
      } else if (count === 0) {
        countNum.textContent = "START!";
        countNum.style.color = "var(--accent-green)";
      } else {
        clearInterval(this._countdownInterval);
        this._countdownInterval = null;
        overlay.style.display = "none";
        countNum.style.color = "";
        this.isCountdownActive = false;
        this.typingInput.focus();
      }
    }, 1000);
  }

  _resetHUDState() {
    this._lastTimerDisplay = null;
    this._lastWpm = null;
    this._lastAcc = null;

    if (this.hudTimer) {
      this.hudTimer.textContent = this.mode === "time" ? this.modeValue : "0";
    }
    if (this.hudWpm) this.hudWpm.textContent = "0";
    if (this.hudAcc) this.hudAcc.textContent = "100%";
    this._updatePlayerTrack(0, 0);
    this._updateOpponentTrack(0, 0);
  }

  startBotRace() {
    this.isRaceMode = true;
    this.raceOpponentType = "bot";
    this.raceSection.classList.add("active");
    this.raceModeLabel.textContent = `ai poygasi (${this.botSpeed} wpm)`;
    this.raceRoomCodeTag.textContent = "";
    this.opponentNameDisplay.textContent = `tigerbot (${this.botSpeed} wpm)`;
    if (this.opponentAvatar) this.opponentAvatar.textContent = "";
    this.resetTest();
  }

  leaveRace() {
    this.isRaceMode = false;
    this.raceOpponentType = "none";
    this.raceSection.classList.remove("active");
    this.remoteFinished = false;
    this.isCountdownActive = false;
    this._guestReceivedConfig = false;
    this._lastRaceConfig = null;
    if (this._countdownInterval) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
    const overlay = document.getElementById("race-countdown-overlay");
    if (overlay) overlay.style.display = "none";
    this.botRacer.stop();
    this.peerManager.disconnect();
    this.resetTest();
  }

  createPeerRoom() {
    const createBtn = document.getElementById("create-room-btn");
    const origText = createBtn ? createBtn.textContent : "xona yaratish";
    if (createBtn) {
      createBtn.textContent = "xona ochilmoqda...";
      createBtn.disabled = true;
    }

    this.peerManager.init().then((roomId) => {
      if (createBtn) {
        createBtn.textContent = origText;
        createBtn.disabled = false;
      }
      this.isRaceMode = true;
      this.raceOpponentType = "peer";
      this.raceSection.classList.add("active");
      this.raceModeLabel.textContent = "Xona kutilmoqda...";
      this.raceRoomCodeTag.textContent = `#${roomId}`;

      const fullUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
      this.modals.showRoomLobby(roomId, fullUrl);
    }).catch(err => {
      if (createBtn) {
        createBtn.textContent = origText;
        createBtn.disabled = false;
      }
      console.warn("Xona yaratishda xatolik:", err);
      alert("Xona yaratib bo'lmadi: " + (err.message || "Internet aloqasini tekshiring"));
    });
  }

  _parseRoomCode(input) {
    if (!input || typeof input !== "string") return "";
    let code = input.trim();

    // Check if it's a URL
    if (code.includes("room=")) {
      try {
        const url = new URL(code, window.location.origin);
        const r = url.searchParams.get("room");
        if (r) code = r.trim();
      } catch (e) {
        const match = code.match(/room=([^&#\s]+)/);
        if (match) code = match[1];
      }
    }

    // Strip leading hash
    if (code.startsWith("#")) {
      code = code.slice(1).trim();
    }

    // Remove internal spaces if user typed "tiger- abc123"
    code = code.replace(/\s+/g, "").toLowerCase();

    // If user just typed the raw suffix e.g. "abc123" without "tiger-"
    if (!code.startsWith("tiger-") && /^[a-z0-9]{4,12}$/i.test(code)) {
      code = `tiger-${code}`;
    }

    return code;
  }

  joinPeerRoom(code) {
    const errorMsgEl = document.getElementById("join-error-msg");
    const joinBtn = document.getElementById("join-room-btn");
    if (errorMsgEl) errorMsgEl.style.display = "none";

    const cleanCode = this._parseRoomCode(code);
    if (!cleanCode) {
      if (errorMsgEl) {
        errorMsgEl.textContent = "Iltimos, xona kodini kiriting";
        errorMsgEl.style.display = "block";
      }
      const input = document.getElementById("join-room-input");
      if (input) input.focus();
      return;
    }

    if (joinBtn) {
      joinBtn.textContent = "ulanmoqda...";
      joinBtn.disabled = true;
    }

    this.isRaceMode = true;
    this.raceOpponentType = "peer";
    this.raceSection.classList.add("active");
    this.raceModeLabel.textContent = "do'st bilan poyga";
    this.raceRoomCodeTag.textContent = `#${cleanCode}`;
    this.opponentNameDisplay.textContent = "Mezbon";

    this.peerManager.joinRoom(cleanCode).then(() => {
      if (joinBtn) {
        joinBtn.textContent = "kirish";
        joinBtn.disabled = false;
      }
      this.modals.closeAll();
      this.typingInput.focus();
    }).catch(err => {
      if (joinBtn) {
        joinBtn.textContent = "kirish";
        joinBtn.disabled = false;
      }
      if (errorMsgEl) {
        errorMsgEl.textContent = err.message || "Xonaga ulanib bo'lmadi. Kodni tekshiring.";
        errorMsgEl.style.display = "block";
      }
      if (!this.peerManager.isConnected) {
        this.raceSection.classList.remove("active");
        this.isRaceMode = false;
        this.raceOpponentType = "none";
      }
    });
  }

  _checkURLParamsForRoom() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
      try {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (e) {}

      setTimeout(() => {
        this.joinPeerRoom(room);
      }, 400);
    }
  }

  resetTest(seed = null) {
    document.querySelector(".app-container")?.classList.remove("typing-active");
    this.timer.stop();
    this.botRacer.stop();

    // Determine word count
    let wordCount = 30;
    if (this.mode === "words") {
      wordCount = this.modeValue;
    } else {
      // Time mode generates enough buffer words (approx 2.5 words per second)
      wordCount = Math.max(40, Math.ceil(this.modeValue * 2.5));
    }

    const words = WordBank.generateWords(this.language, wordCount, seed, {
      punctuation: this.hasPunctuation,
      numbers: this.hasNumbers
    });
    this.typingEngine.loadWords(words, this.mode);

    // Reset HUD and Tracks
    this._resetHUDState();
    this.typingInput.value = "";
  }

  _updateLiveMetrics(elapsedSec) {
    const netWpm = Metrics.getNetWPM(
      this.typingEngine.correctChars,
      elapsedSec
    );
    const accuracy = Metrics.getAccuracy(
      this.typingEngine.correctChars,
      this.typingEngine.totalErrorsMade
    );

    if (this._lastWpm !== netWpm) {
      this._lastWpm = netWpm;
      this.hudWpm.textContent = netWpm;
    }
    const accStr = `${accuracy}%`;
    if (this._lastAcc !== accStr) {
      this._lastAcc = accStr;
      this.hudAcc.textContent = accStr;
    }
  }

  _updatePlayerTrack(progress, liveWpm) {
    const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
    this.playerTrackFill.style.width = `${pct}%`;
    this.playerRunner.style.left = `${pct}%`;
    this.playerLiveWpm.textContent = `${liveWpm} wpm`;
  }

  _updateOpponentTrack(progress, liveWpm) {
    const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
    this.opponentTrackFill.style.width = `${pct}%`;
    this.opponentRunner.style.left = `${pct}%`;
    this.opponentLiveWpm.textContent = `${liveWpm} wpm`;
  }

  _updateSoundButtonUI() {
    const profiles = {
      blue: "ovoz: blue",
      red: "ovoz: red",
      brown: "ovoz: brown",
      off: "ovoz: o'chiq"
    };
    const btn = document.getElementById("sound-toggle-btn");
    if (btn) {
      btn.textContent = profiles[this.currentSwitch] || "ovoz";
      if (this.currentSwitch === "off") {
        btn.classList.remove("active");
        btn.style.opacity = "0.5";
      } else {
        btn.classList.add("active");
        btn.style.opacity = "1";
      }
    }
  }

  _updateControlPillsUI() {
    // Punctuation and Numbers toggles
    const puncBtn = document.getElementById("btn-toggle-punc");
    if (puncBtn) puncBtn.classList.toggle("active", !!this.hasPunctuation);

    const numBtn = document.getElementById("btn-toggle-num");
    if (numBtn) numBtn.classList.toggle("active", !!this.hasNumbers);

    // Language
    this._updateLanguageUI();

    // Mode
    document.querySelectorAll("#mode-type-selector .pill-option").forEach((b) => {
      b.classList.toggle("active", b.dataset.modeType === this.mode);
    });

    this._updateModeValuesPillOptions();
  }

  _updateLanguageUI() {
    const langDisplay = document.getElementById("lang-display-name");
    if (langDisplay) {
      langDisplay.textContent = this.language;
    }
  }

  _updateModeValuesPillOptions() {
    const container = document.getElementById("mode-val-selector");
    if (!container) return;

    const values = this.mode === "time" ? CONFIG.TIME_MODES : CONFIG.WORD_MODES;
    if (!values.includes(this.modeValue)) {
      this.modeValue = values[1] || values[0];
    }

    container.innerHTML = "";
    values.forEach((val) => {
      const btn = document.createElement("button");
      btn.className = `pill-option ${val === this.modeValue ? "active" : ""}`;
      btn.dataset.val = val;
      btn.textContent = val;
      container.appendChild(btn);
    });
  }

  _applyTheme(themeId) {
    const theme = CONFIG.THEMES.find(t => t.id === themeId) || CONFIG.THEMES[0];
    this.currentTheme = theme.id;
    document.documentElement.setAttribute("data-theme", this.currentTheme);
    this._updateThemeButtonUI();

    // Recalculate caret metrics if words are rendered
    if (this.caretRenderer) {
      this.caretRenderer.recalculate();
    }

    // If results chart modal is currently active, re-render chart with new palette
    const resultsModal = document.getElementById("results-modal");
    if (resultsModal && resultsModal.classList.contains("active") && this.modals?.chart && this.speedTimeline.length) {
      this.modals.chart.render(this.speedTimeline, this.errorTimeline);
    }
  }

  _updateThemeButtonUI() {
    const label = document.getElementById("theme-label");
    const footerLabel = document.getElementById("footer-theme-label");
    const current = CONFIG.THEMES.find(t => t.id === this.currentTheme) || CONFIG.THEMES[0];
    if (label) label.textContent = current.label;
    if (footerLabel) footerLabel.textContent = current.label;
  }

  _savePrefs() {
    StorageManager.savePreferences({
      language: this.language,
      mode: this.mode,
      modeValue: this.modeValue,
      currentSwitch: this.currentSwitch,
      theme: this.currentTheme,
      hasPunctuation: this.hasPunctuation,
      hasNumbers: this.hasNumbers
    });
  }
}

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.tigerTypeApp = new TigerTypeApp();
});
