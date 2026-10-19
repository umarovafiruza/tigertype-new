import { CONFIG } from "../config.js";

/**
 * PeerJS WebRTC P2P Manager for multiplayer racing.
 * Uses direct data channels with <30ms latency without requiring custom backend servers.
 */
export class PeerManager {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.isHost = false;
    this.roomId = null;
    this.playerId = "racer_" + Math.random().toString(36).substr(2, 6);
    this.playerName = "Racer";
    this.remotePlayerName = "Opponent";
    this.isConnected = false;
    this.pendingSendQueue = [];

    // Callbacks
    this.onPeerReady = null;
    this.onConnected = null;
    this.onGuestJoined = null;
    this.onCountdownStart = null;
    this.onRaceStart = null;
    this.onRemoteProgress = null;
    this.onRemoteFinish = null;
    this.onDisconnected = null;
  }

  /**
   * Initializes Peer connection with free public signaling server
   */
  init(customRoomId = null) {
    return new Promise((resolve, reject) => {
      if (typeof window.Peer === "undefined") {
        reject(new Error("PeerJS kutubxonasi yuklanmadi. Internet aloqasini tekshiring."));
        return;
      }

      // If already initialized and connected, return existing
      if (this.peer && !this.peer.destroyed && this.roomId) {
        resolve(this.roomId);
        return;
      }

      // Cleanup prior dead peer if any
      if (this.peer) {
        try { this.peer.destroy(); } catch (e) {}
        this.peer = null;
      }

      const generatedId = customRoomId || "tiger-" + Math.random().toString(36).substr(2, 6);
      this.roomId = generatedId;

      try {
        this.peer = new window.Peer(generatedId, CONFIG.PEER_CONFIG);

        this.peer.on("open", (id) => {
          this.roomId = id;
          if (this.onPeerReady) this.onPeerReady(id);
          resolve(id);
        });

        this.peer.on("connection", (conn) => {
          this.isHost = true;
          this.connection = conn;

          // Critical: Wait until incoming connection data channel is fully OPEN before transmitting
          conn.on("open", () => {
            this._setupConnectionHandlers(conn);
            this._flushSendQueue();
            if (this.onConnected) {
              this.onConnected({ isHost: true, peerId: conn.peer });
            }
          });
        });

        this.peer.on("error", (err) => {
          console.error("PeerJS error:", err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  joinRoom(hostRoomId, playerName = "Challenger") {
    return new Promise((resolve, reject) => {
      if (!this.peer || this.peer.destroyed) {
        this.init().then(() => {
          this._connectToHost(hostRoomId, playerName, resolve, reject);
        }).catch(reject);
      } else {
        this._connectToHost(hostRoomId, playerName, resolve, reject);
      }
    });
  }

  _connectToHost(hostRoomId, playerName, resolve, reject) {
    this.isHost = false;
    this.playerName = playerName;
    let isSettled = false;

    // Timeout: if cannot connect in 12s, reject with clear error
    const timeoutId = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        reject(new Error("Xonaga ulanish vaqti tugadi. Xona kodi to'g'riligini va do'stingiz kutayotganini tekshiring."));
      }
    }, 12000);

    const onPeerError = (err) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timeoutId);
        if (err.type === "peer-unavailable") {
          reject(new Error("Bunday xona topilmadi. Xona kodi noto'g'ri yoki do'stingiz xonani yopgan."));
        } else {
          reject(new Error(err.message || "Xonaga ulanishda xatolik yuz berdi"));
        }
      }
    };

    this.peer.once("error", onPeerError);

    try {
      const conn = this.peer.connect(hostRoomId, { reliable: true });

      conn.on("open", () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          this.connection = conn;
          this._setupConnectionHandlers(conn);
          this._flushSendQueue();

          // Send guest join info
          this.send({ type: "GUEST_JOIN", name: playerName });

          if (this.onConnected) {
            this.onConnected({ isHost: false, peerId: conn.peer });
          }
          resolve(conn);
        }
      });

      conn.on("error", (err) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          reject(err);
        }
      });
    } catch (err) {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timeoutId);
        reject(err);
      }
    }
  }

  _setupConnectionHandlers(conn) {
    this.isConnected = true;

    conn.on("data", (data) => {
      this._handleIncomingMessage(data);
    });

    conn.on("close", () => {
      this.isConnected = false;
      if (this.onDisconnected) this.onDisconnected();
    });
  }

  _handleIncomingMessage(msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case "GUEST_JOIN":
        this.remotePlayerName = msg.name || "Do'stingiz";
        if (this.onGuestJoined) {
          this.onGuestJoined(this.remotePlayerName);
        }
        break;

      case "RACE_CONFIG":
        // Guest receives exact words and synchronized settings from host
        if (this.onRaceStart) {
          this.onRaceStart(msg);
        }
        break;

      case "START_COUNTDOWN":
        // Synchronized countdown command
        if (this.onCountdownStart) {
          this.onCountdownStart(msg);
        }
        break;

      case "PROGRESS":
        if (this.onRemoteProgress) {
          this.onRemoteProgress(msg);
        }
        break;

      case "FINISH":
        if (this.onRemoteFinish) {
          this.onRemoteFinish(msg);
        }
        break;

      default:
        break;
    }
  }

  send(data) {
    if (this.connection && this.connection.open) {
      this.connection.send(data);
    } else {
      this.pendingSendQueue.push(data);
    }
  }

  _flushSendQueue() {
    if (this.connection && this.connection.open && this.pendingSendQueue.length > 0) {
      while (this.pendingSendQueue.length > 0) {
        const item = this.pendingSendQueue.shift();
        try {
          this.connection.send(item);
        } catch (e) {
          console.warn("Error sending queued peer message:", e);
        }
      }
    }
  }

  broadcastProgress(progress, liveWpm) {
    this.send({
      type: "PROGRESS",
      name: this.playerName,
      progress,
      liveWpm
    });
  }

  broadcastFinish(finalWpm, accuracy, time) {
    this.send({
      type: "FINISH",
      name: this.playerName,
      finalWpm,
      accuracy,
      time
    });
  }

  disconnect() {
    this.pendingSendQueue = [];
    if (this.connection) {
      try { this.connection.close(); } catch (e) {}
      this.connection = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
    this.isConnected = false;
  }
}
