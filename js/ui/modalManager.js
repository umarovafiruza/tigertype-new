import { SpeedChart } from "./chartRenderer.js";

/**
 * Toast Notifications (Disabled per request)
 */
export class Toast {
  static show() {
    // No-op: All notifications are disabled across the project
    return;
  }
}

/**
 * UI Modal Manager for Results, Multiplayer, Room Lobby, and History
 */
export class ModalManager {
  constructor() {
    this.resultsModal = document.getElementById("results-modal");
    this.multiplayerModal = document.getElementById("multiplayer-modal");
    this.roomLobbyModal = document.getElementById("room-lobby-modal");
    this.historyModal = document.getElementById("history-modal");

    this.chartCanvas = document.getElementById("speed-chart");
    this.chart = this.chartCanvas ? new SpeedChart(this.chartCanvas) : null;

    this.onClose = null;

    this._bindCloseEvents();
    this._bindTabs();
  }

  _bindCloseEvents() {
    document.querySelectorAll(".modal-close-btn, .modal-backdrop-close").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.closeAll();
      });
    });

    // Close on backdrop overlay click
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          this.closeAll();
        }
      });
    });

    // Close on Escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeAll();
      }
    });
  }

  _bindTabs() {
    // Segmented tab switcher inside multiplayer modal
    document.querySelectorAll("#multiplayer-tabs .modal-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#multiplayer-tabs .modal-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const targetId = btn.dataset.tabTarget;
        document.querySelectorAll(".modal-tab-pane").forEach(pane => {
          pane.classList.remove("active");
        });

        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add("active");
      });
    });
  }

  closeAll() {
    let hadOpenModal = false;
    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      if (modal.classList.contains("active")) hadOpenModal = true;
      modal.classList.remove("active");
    });
    if (hadOpenModal && this.onClose) {
      this.onClose();
    }
  }

  showResults(stats, isNewPb = false) {
    this.closeAll();
    if (!this.resultsModal) return;

    // Helper for safe element text updates
    const setSafeText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    // Populate data
    setSafeText("res-net-wpm", stats.netWpm);
    setSafeText("res-acc", `${stats.accuracy}%`);
    setSafeText("res-gross-wpm", stats.grossWpm);
    setSafeText("res-cpm", stats.cpm);
    setSafeText("res-consistency", `${stats.consistency}%`);
    setSafeText("res-time", `${Math.round(stats.time)}s`);
    setSafeText("res-errors", stats.totalErrors);

    const modeDetail = document.getElementById("res-mode-detail");
    if (modeDetail) {
      const modeStr = stats.mode === "time" ? `${stats.modeValue}s` : `${stats.modeValue} so'z`;
      const langStr = stats.language ? stats.language.toUpperCase() : "ENGLISH";
      modeDetail.textContent = `${modeStr} • ${langStr}`;
    }

    const pbBadge = document.getElementById("res-pb-badge");
    if (pbBadge) {
      pbBadge.style.display = isNewPb ? "inline-flex" : "none";
    }

    this.resultsModal.classList.add("active");

    // Render Canvas chart
    if (this.chart && stats.speedTimeline && stats.speedTimeline.length > 0) {
      setTimeout(() => {
        this.chart.render(stats.speedTimeline, stats.errorTimeline);
      }, 50);
    }
  }

  showMultiplayer() {
    this.closeAll();
    if (this.multiplayerModal) {
      this.multiplayerModal.classList.add("active");
    }
  }

  showRoomLobby(roomId, directUrl) {
    this.closeAll();
    if (!this.roomLobbyModal) return;

    const codeEl = document.getElementById("lobby-room-code");
    if (codeEl) codeEl.textContent = roomId;

    const linkInput = document.getElementById("lobby-room-link-input");
    if (linkInput) linkInput.value = directUrl;

    const statusBox = document.getElementById("lobby-status-box");
    if (statusBox) statusBox.classList.remove("connected");

    const statusText = document.getElementById("lobby-status-text");
    if (statusText) statusText.textContent = "do'stingiz ulanishi kutilmoqda...";

    this.roomLobbyModal.classList.add("active");
  }

  updateLobbyConnected(opponentName) {
    const statusBox = document.getElementById("lobby-status-box");
    if (statusBox) statusBox.classList.add("connected");

    const statusText = document.getElementById("lobby-status-text");
    if (statusText) statusText.textContent = `${opponentName} xonaga ulandi. poyga boshlanmoqda...`;
  }

  showHistory(historyList = []) {
    this.closeAll();
    if (!this.historyModal) return;

    const tableBody = document.getElementById("history-table-body");
    if (tableBody) {
      tableBody.innerHTML = "";
      if (historyList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-tertiary); padding: 20px;">Hozircha natijalar mavjud emas</td></tr>`;
      } else {
        historyList.slice(0, 20).forEach((item) => {
          const row = document.createElement("tr");
          const dateStr = new Date(item.timestamp).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          row.innerHTML = `
            <td style="color: var(--accent-gold); font-weight: 700; font-family: var(--font-mono);">${item.netWpm} WPM</td>
            <td>${item.accuracy}%</td>
            <td>${item.mode} (${item.modeValue})</td>
            <td style="text-transform: capitalize;">${item.language}</td>
            <td style="color: var(--text-secondary); font-size: 12px;">${dateStr}</td>
          `;
          tableBody.appendChild(row);
        });
      }
    }

    this.historyModal.classList.add("active");
  }
}
