/**
 * Lightweight, high-DPI Canvas 2D chart renderer for typing speed timeline and errors.
 */
export class SpeedChart {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext("2d");
  }

  /**
   * Render WPM progression and error markers
   * @param {Array<number>} speedTimeline - Array of WPM numbers sampled each second
   * @param {Array<number>} errorTimeline - Array of error count per second
   */
  render(speedTimeline = [], errorTimeline = []) {
    if (!this.canvas || !this.ctx) return;
    if (speedTimeline.length === 0) return;

    // High-DPI crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width > 100 ? rect.width : (this.canvas.parentElement?.clientWidth || 640);
    const height = rect.height > 50 ? rect.height : 220;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 25, bottom: 30, left: 45 };
    const plotWidth = Math.max(10, width - padding.left - padding.right);
    const plotHeight = Math.max(10, height - padding.top - padding.bottom);

    // Resolve active theme colors dynamically
    const styles = window.getComputedStyle(document.documentElement);
    const accentColor = styles.getPropertyValue('--accent-gold').trim() || '#e5a93b';
    const textLabelColor = styles.getPropertyValue('--text-secondary').trim() || '#86868b';
    const gridLineColor = styles.getPropertyValue('--bg-glass-border').trim() || 'rgba(128, 128, 128, 0.15)';
    const errorColor = styles.getPropertyValue('--char-incorrect').trim() || '#ff453a';

    // Helper for gradient alpha calculation
    const getRgba = (color, alpha) => {
      if (color.startsWith('#')) {
        let hex = color.slice(1);
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const num = parseInt(hex, 16);
        if (!isNaN(num)) {
          return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
        }
      }
      return color;
    };

    // Calculate axis bounds
    const maxSpeed = Math.max(60, Math.ceil((Math.max(...speedTimeline) + 15) / 20) * 20);
    const totalPoints = speedTimeline.length;

    this.ctx.clearRect(0, 0, width, height);

    // 1. Draw horizontal gridlines & labels
    const gridSteps = 4;
    this.ctx.font = '11px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
    this.ctx.fillStyle = textLabelColor;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridSteps; i++) {
      const yVal = Math.round((maxSpeed / gridSteps) * i);
      const y = padding.top + plotHeight - (yVal / maxSpeed) * plotHeight;

      this.ctx.strokeStyle = gridLineColor;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(padding.left, y);
      this.ctx.lineTo(width - padding.right, y);
      this.ctx.stroke();

      this.ctx.fillText(yVal.toString(), padding.left - 10, y);
    }

    // 2. Draw Time X-axis labels
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    const timeStep = Math.max(1, Math.ceil(totalPoints / 6));
    for (let i = 0; i < totalPoints; i += timeStep) {
      const x = padding.left + (i / Math.max(1, totalPoints - 1)) * plotWidth;
      this.ctx.fillText(`${i + 1}s`, x, height - padding.bottom + 8);
    }

    // 3. Draw gradient area under the curve
    const gradient = this.ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, getRgba(accentColor, 0.32));
    gradient.addColorStop(1, getRgba(accentColor, 0.0));

    this.ctx.beginPath();
    this.ctx.moveTo(padding.left, height - padding.bottom);

    const points = speedTimeline.map((wpm, idx) => {
      const x = padding.left + (idx / Math.max(1, totalPoints - 1)) * plotWidth;
      const y = padding.top + plotHeight - (wpm / maxSpeed) * plotHeight;
      return { x, y, wpm };
    });

    points.forEach((pt, i) => {
      if (i === 0) {
        this.ctx.lineTo(pt.x, pt.y);
      } else {
        // Smooth bezier interpolation
        const prev = points[i - 1];
        const cx = (prev.x + pt.x) / 2;
        this.ctx.bezierCurveTo(cx, prev.y, cx, pt.y, pt.x, pt.y);
      }
    });

    this.ctx.lineTo(padding.left + plotWidth, height - padding.bottom);
    this.ctx.closePath();
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // 4. Draw primary speed line
    this.ctx.beginPath();
    points.forEach((pt, i) => {
      if (i === 0) {
        this.ctx.moveTo(pt.x, pt.y);
      } else {
        const prev = points[i - 1];
        const cx = (prev.x + pt.x) / 2;
        this.ctx.bezierCurveTo(cx, prev.y, cx, pt.y, pt.x, pt.y);
      }
    });
    this.ctx.strokeStyle = accentColor;
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();

    // 5. Draw error marks
    if (errorTimeline && errorTimeline.length) {
      errorTimeline.forEach((errCount, idx) => {
        if (errCount > 0 && points[idx]) {
          const pt = points[idx];
          this.ctx.fillStyle = errorColor;
          this.ctx.beginPath();
          this.ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          this.ctx.fill();
        }
      });
    }
  }
}
