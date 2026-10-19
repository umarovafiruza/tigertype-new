import { Metrics } from "./metrics.js";

/**
 * Deterministic, high-performance Typing Engine
 */
export class TypingEngine {
  constructor(containerElement, caretRenderer, soundEngine) {
    this.container = containerElement;
    this.caretRenderer = caretRenderer;
    this.soundEngine = soundEngine;

    this.words = [];
    this.wordIndex = 0;
    this.charIndex = 0;
    this.wordElements = [];

    this.totalTypedChars = 0;
    this.correctChars = 0;
    this.incorrectChars = 0;
    this.extraChars = 0;
    this.totalErrorsMade = 0;

    this.isStarted = false;
    this.isFinished = false;

    // Callbacks
    this.onStart = null;
    this.onKeystroke = null;
    this.onWordFinish = null;
    this.onFinish = null;

    this.baseLineHeight = 52;
    this.lastTargetScroll = 0;
  }

  /**
   * Initializes words and builds the DOM elements
   * @param {Array<string>} words 
   */
  loadWords(words, mode = "time") {
    this.words = [...words];
    this.mode = mode;
    this.wordIndex = 0;
    this.charIndex = 0;
    this.totalTypedChars = 0;
    this.correctChars = 0;
    this.incorrectChars = 0;
    this.extraChars = 0;
    this.totalErrorsMade = 0;
    this.isStarted = false;
    this.isFinished = false;

    this.container.scrollTop = 0;
    this.lastTargetScroll = 0;
    this.wordElements = [];

    // Reset caret renderer state
    if (this.caretRenderer) {
      this.caretRenderer.reset();
    }

    // Retain or create Caret inside words-container so it scrolls naturally
    let caretEl = this.container.querySelector("#caret");
    this.container.replaceChildren();
    if (!caretEl) {
      caretEl = document.createElement("div");
      caretEl.id = "caret";
      caretEl.className = "blink";
    }
    this.container.appendChild(caretEl);
    this.caretRenderer.setCaretElement(caretEl);

    const fragment = document.createDocumentFragment();

    this.words.forEach((wordText) => {
      const wordSpan = document.createElement("span");
      wordSpan.className = "word";

      for (let i = 0; i < wordText.length; i++) {
        const charSpan = document.createElement("span");
        charSpan.className = "char";
        charSpan.textContent = wordText[i];
        wordSpan.appendChild(charSpan);
      }

      fragment.appendChild(wordSpan);
      this.wordElements.push(wordSpan);
    });

    this.container.appendChild(fragment);

    // Initial caret positioning
    requestAnimationFrame(() => {
      this.updateCaret();
      this.caretRenderer.show();
    });
  }

  appendWords(moreWords) {
    if (!moreWords || !moreWords.length) return;
    this.words.push(...moreWords);
    const fragment = document.createDocumentFragment();

    moreWords.forEach((wordText) => {
      const wordSpan = document.createElement("span");
      wordSpan.className = "word";

      for (let i = 0; i < wordText.length; i++) {
        const charSpan = document.createElement("span");
        charSpan.className = "char";
        charSpan.textContent = wordText[i];
        wordSpan.appendChild(charSpan);
      }

      fragment.appendChild(wordSpan);
      this.wordElements.push(wordSpan);
    });

    this.container.appendChild(fragment);
  }

  normalizeChar(c) {
    if (!c) return c;
    // Normalize smart apostrophes, backticks, and modifier apostrophes to standard ASCII single quote
    if (c === "’" || c === "‘" || c === "`" || c === "´" || c === "ʻ" || c === "ʼ") {
      return "'";
    }
    return c;
  }

  handleKeyDown(event) {
    if (this.isFinished) return;

    const key = event.key;

    // Mobile / Virtual keyboard IME composition indicator: let beforeinput/input handle it!
    if (key === "Unidentified" || event.keyCode === 229) {
      return;
    }

    // Prevent default scrolling on space or tab
    if (key === " " || key === "Tab") {
      event.preventDefault();
    }

    // Ignore modifier keys alone
    if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Escape"].includes(key)) {
      return;
    }

    // Start trigger on first actual character or space
    if (!this.isStarted && (key.length === 1 || key === "Backspace")) {
      this.isStarted = true;
      if (this.onStart) this.onStart();
    }

    if (key === "Backspace") {
      this.handleBackspace(event.ctrlKey || event.metaKey);
      this.soundEngine.playKeystroke("Backspace");
      return;
    }

    if (key === " ") {
      this.handleSpace();
      this.soundEngine.playKeystroke(" ");
      return;
    }

    // Only process printable single characters
    if (key.length === 1) {
      this.handleCharacter(key);
      this.soundEngine.playKeystroke(key);
    }
  }

  handleMobileInput(text, inputType = "") {
    if (this.isFinished) return;

    if (!this.isStarted) {
      this.isStarted = true;
      if (this.onStart) this.onStart();
    }

    if (inputType === "deleteContentBackward") {
      this.handleBackspace(false);
      this.soundEngine.playKeystroke("Backspace");
      return;
    }

    if (inputType === "deleteWordBackward") {
      this.handleBackspace(true);
      this.soundEngine.playKeystroke("Backspace");
      return;
    }

    if (text) {
      for (const rawChar of text) {
        if (rawChar === " ") {
          this.handleSpace();
          this.soundEngine.playKeystroke(" ");
        } else {
          this.handleCharacter(rawChar);
          this.soundEngine.playKeystroke(rawChar);
        }
      }
    }
  }

  handleCharacter(char) {
    const currentWordEl = this.wordElements[this.wordIndex];
    if (!currentWordEl) return;

    const targetWord = this.words[this.wordIndex];
    this.totalTypedChars++;
    let isError = false;

    if (this.charIndex < targetWord.length) {
      const charEl = currentWordEl.children[this.charIndex];
      const expectedChar = targetWord[this.charIndex];

      const normTyped = this.normalizeChar(char);
      const normExpected = this.normalizeChar(expectedChar);

      if (normTyped === normExpected) {
        charEl.className = "char correct";
        this.correctChars++;
      } else {
        charEl.className = "char incorrect";
        this.incorrectChars++;
        this.totalErrorsMade++;
        isError = true;
      }
      this.charIndex++;
    } else {
      // Extra characters beyond target word
      if (this.charIndex < targetWord.length + 15) { // Prevent infinite spam
        const extraCharSpan = document.createElement("span");
        extraCharSpan.className = "char extra";
        extraCharSpan.textContent = char;
        currentWordEl.appendChild(extraCharSpan);
        this.charIndex++;
        this.extraChars++;
        this.totalErrorsMade++;
        isError = true;
      }
    }

    this.updateCaret();

    if (this.onKeystroke) {
      this.onKeystroke({
        totalTyped: this.totalTypedChars,
        correct: this.correctChars,
        incorrect: this.incorrectChars + this.extraChars,
        progress: this.getProgress(),
        isError: isError,
        errorCount: isError ? 1 : 0
      });
    }

    // Check if entire text completed (in words mode)
    if (this.mode === "words" && this.wordIndex === this.words.length - 1 && this.charIndex >= targetWord.length) {
      this.finish();
    }
  }

  handleSpace() {
    const currentWordEl = this.wordElements[this.wordIndex];
    if (!currentWordEl) return;

    const targetWord = this.words[this.wordIndex];

    // Don't advance on empty space if user hasn't typed anything in this word
    if (this.charIndex === 0) return;

    this.totalTypedChars++;
    let errorsAdded = 0;

    // Mark remaining un-typed characters in the word as incorrect/missed
    if (this.charIndex < targetWord.length) {
      for (let i = this.charIndex; i < targetWord.length; i++) {
        const charEl = currentWordEl.children[i];
        if (charEl && !charEl.classList.contains("correct") && !charEl.classList.contains("incorrect")) {
          charEl.className = "char incorrect";
          this.incorrectChars++;
          this.totalErrorsMade++;
          errorsAdded++;
        }
      }
    }

    // Standard Typing Metric: If the word was completed without uncorrected errors,
    // the space is a valid, correctly typed separator character!
    const hasWordErrors = currentWordEl.querySelector(".incorrect, .extra");
    if (!hasWordErrors) {
      this.correctChars++;
    }

    if (this.onWordFinish) {
      this.onWordFinish(this.wordIndex, this.words.length);
    }

    if (this.onKeystroke) {
      this.onKeystroke({
        totalTyped: this.totalTypedChars,
        correct: this.correctChars,
        incorrect: this.incorrectChars + this.extraChars,
        progress: this.getProgress(),
        isError: errorsAdded > 0,
        errorCount: errorsAdded
      });
    }

    // Move to next word
    if (this.wordIndex < this.words.length - 1) {
      this.wordIndex++;
      this.charIndex = 0;
      this.updateCaret();
      this.checkLineScroll();
    } else {
      if (this.mode === "words") {
        this.finish();
      }
    }
  }

  handleBackspace(ctrlKey = false) {
    const currentWordEl = this.wordElements[this.wordIndex];
    if (!currentWordEl) return;

    const targetWord = this.words[this.wordIndex];

    if (this.charIndex > 0) {
      if (ctrlKey) {
        // Ctrl+Backspace deletes entire current word's typed characters
        while (this.charIndex > 0) {
          this._backspaceSingleChar(currentWordEl, targetWord);
        }
      } else {
        this._backspaceSingleChar(currentWordEl, targetWord);
      }
      this.updateCaret();
    } else if (this.wordIndex > 0) {
      // Monkeytype behavior: backspace into previous word if it has errors
      const prevWordIndex = this.wordIndex - 1;
      const prevWordEl = this.wordElements[prevWordIndex];
      const prevTargetWord = this.words[prevWordIndex];

      const hasErrors = prevWordEl.querySelector(".incorrect, .extra");
      if (hasErrors) {
        this.wordIndex = prevWordIndex;
        this.charIndex = prevWordEl.children.length;
        this.updateCaret();
        this.checkLineScroll();
      }
    }

    if (this.onKeystroke) {
      this.onKeystroke({
        totalTyped: this.totalTypedChars,
        correct: this.correctChars,
        incorrect: this.incorrectChars + this.extraChars,
        progress: this.getProgress()
      });
    }
  }

  _backspaceSingleChar(currentWordEl, targetWord) {
    this.charIndex--;
    if (this.charIndex >= targetWord.length) {
      // Removing an extra char element
      const lastChild = currentWordEl.lastElementChild;
      if (lastChild && lastChild.classList.contains("extra")) {
        currentWordEl.removeChild(lastChild);
        this.extraChars = Math.max(0, this.extraChars - 1);
      }
    } else {
      // Resetting standard character
      const charEl = currentWordEl.children[this.charIndex];
      if (charEl) {
        if (charEl.classList.contains("correct")) {
          this.correctChars = Math.max(0, this.correctChars - 1);
        } else if (charEl.classList.contains("incorrect")) {
          this.incorrectChars = Math.max(0, this.incorrectChars - 1);
        }
        charEl.className = "char";
      }
    }
  }

  updateCaret() {
    const currentWordEl = this.wordElements[this.wordIndex];
    if (!currentWordEl) return;

    const targetWord = this.words[this.wordIndex];

    if (this.charIndex < currentWordEl.children.length) {
      const charEl = currentWordEl.children[this.charIndex];
      this.caretRenderer.updatePosition(charEl, false);
    } else {
      // Caret is at the end of the word
      const lastCharEl = currentWordEl.children[currentWordEl.children.length - 1];
      if (lastCharEl) {
        this.caretRenderer.updatePosition(lastCharEl, true);
      }
    }
  }

  getLineHeight() {
    if (this.wordElements.length > 0 && this.wordElements[0]) {
      const h = this.wordElements[0].offsetHeight;
      if (h > 12) return h;
    }
    return this.baseLineHeight || 52;
  }

  checkLineScroll() {
    const currentWordEl = this.wordElements[this.wordIndex];
    if (!currentWordEl) return;

    const lineHeight = this.getLineHeight();
    const currentOffsetTop = currentWordEl.offsetTop;
    // Calculate target scroll position (smoothly scroll when reaching second line)
    const targetScroll = currentOffsetTop > (lineHeight * 0.7)
      ? currentOffsetTop - (lineHeight * 0.7)
      : 0;

    // Only initiate smooth scroll if the line boundary actually shifted
    if (Math.abs(this.lastTargetScroll - targetScroll) > 4) {
      this.lastTargetScroll = targetScroll;
      this.container.scrollTo({
        top: targetScroll,
        behavior: "smooth"
      });
    }
  }

  getProgress() {
    if (!this.words.length) return 0;
    const progress = this.wordIndex / this.words.length;
    return Math.min(1, Math.max(0, progress));
  }

  finish() {
    if (this.isFinished) return;
    this.isFinished = true;
    this.caretRenderer.hide();
    if (this.onFinish) {
      this.onFinish({
        totalTyped: this.totalTypedChars,
        correct: this.correctChars,
        incorrect: this.incorrectChars + this.extraChars,
        totalErrors: this.totalErrorsMade
      });
    }
  }
}
