/**
 * High-performance animated caret renderer with hardware-accelerated transforms.
 * Uses zero-reflow offset geometry and line-wrap detection for silky smooth typing.
 */
export class CaretRenderer {
  constructor(caretElement, containerElement) {
    this.caret = caretElement;
    this.container = containerElement;
    this.idleTimer = null;
    this.lastTarget = null;
    this.lastY = null;
    this.lastX = null;
  }

  setCaretElement(caretElement) {
    this.caret = caretElement;
  }

  reset() {
    this.lastTarget = null;
    this.lastY = null;
    this.lastX = null;
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  updatePosition(targetElement, isEndOfWord = false) {
    if (!this.caret || !targetElement) return;

    this.lastTarget = { targetElement, isEndOfWord };

    const wordEl = targetElement.parentElement;
    if (!wordEl) return;

    // Fast zero-reflow coordinate resolution relative to container
    let targetX = wordEl.offsetLeft + targetElement.offsetLeft;
    const targetY = wordEl.offsetTop + 8; // optical vertical center (52px line height, 36px caret)

    if (isEndOfWord) {
      targetX += targetElement.offsetWidth;
    }

    // Detect line wrap or significant jump across lines
    const isLineJump = this.lastY !== null && Math.abs(targetY - this.lastY) > 8;

    if (isLineJump) {
      // Temporarily disable transition during line wrap to prevent distracting diagonal swoop
      this.caret.style.transition = "none";
      this.caret.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      // Force instant commit before re-enabling transition
      void this.caret.offsetWidth;
      this.caret.style.transition = "";
    } else {
      this.caret.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
    }

    this.lastX = targetX;
    this.lastY = targetY;

    // Smooth blink pause while actively typing
    this.caret.classList.remove("blink");
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.caret.classList.add("blink");
    }, 450);
  }

  recalculate() {
    if (this.lastTarget && this.lastTarget.targetElement) {
      this.lastY = null; // force clean reposition
      this.updatePosition(this.lastTarget.targetElement, this.lastTarget.isEndOfWord);
    }
  }

  hide() {
    if (this.caret) this.caret.style.opacity = "0";
  }

  show() {
    if (this.caret) {
      this.caret.style.opacity = "1";
      this.caret.classList.add("blink");
    }
  }
}
