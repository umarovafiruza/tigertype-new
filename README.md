# 🐯 TigerType

<p align="center">
  <img src="assets/logo.png" width="100" alt="TigerType Logo" style="border-radius: 50%;">
</p>

> **Apple Minimalist Monkeytype + TypeRacer Hybrid Web Application**  
> *Built with Pure Vanilla JavaScript (ES Modules), Modern CSS, Web Audio API, and PeerJS (WebRTC).*

---

## ⚡ Asosiy Imkoniyatlar (Key Features)

1. **Solo Mashq Rejimi (Monkeytype Style)**:
   - **Rejimlar**: Vaqt bo'yicha (15s, 30s, 60s) va so'zlar soni bo'yicha (10, 25, 50, 100).
   - **Lug'atlar**: Ingliz tili (English), O'zbek tili (lotin yozuvida), Dasturlash sintaksisi (HTML, CSS, JavaScript).
   - **Silliq Animatsiyali Caret**: Harakatlanuvchi kursor (`translate3d`), har bir harfni real-vaqtda tekshirish (to'g'ri, xato, qo'shimcha belgilar) va 3 qatorli silliq siljish (smooth scroll).
   - **Live HUD**: Jonli WPM, Aniqlik foizi va qolgan vaqt / so'zlar hisoblagichi.

2. **Real-Vaqt Poyga Rejimi (Multiplayer PvP & AI Bot)**:
   - **WebRTC DataChannel (PeerJS)**: Hech qanday backend serverisiz, xona kodi yoki to'g'ridan-to'g'ri havola orqali do'stlar bilan poyga qilish (< 30ms kechikish).
   - **Jonli Poyga Yo'lakchasi**: O'yinchilarning real-vaqtdagi o'rni, poyga mashinalari/avatarlari va jonli WPM tezligi.
   - **Sun'iy Intellekt (AI Bot) Fallback**: Do'st bo'lmaganda 30 WPM dan 110+ WPM gacha sozlangan aqlli bot bilan poygalashish imkoniyati.

3. **Post-Test Analitika & Xulosalar**:
   - **Metrikalar**: Net WPM, Gross WPM, CPM, Aniqlik %, Barqarorlik (Consistency %) va xatolar hisobi.
   - **HTML5 Canvas Grafik**: Har bir soniyadagi tezlik dinamikasi va xatolar nuqtalarini ifodalovchi interaktiv grafik.
   - **Tarix va Rekordlar**: Mahalliy xotirada (LocalStorage) saqlanuvchi shaxsiy rekordlar (PB) va JSON eksport qilish.

4. **Apple Minimalist Dizayn & Web Audio SFX**:
   - Apple Human Interface Design talablariga mos yuqori sifatli qorong'i (dark graphite) fon, `JetBrains Mono` va `SF Pro` tipografiyasi.
   - Web Audio API orqali sintez qilingan nol-kechikishli (zero-latency) mexanik klaviatura tovushlari: **Clicky Blue**, **Linear Red**, **Tactile Brown** yoki Ovozni o'chirish.

---

## 🚀 Loyihani Ishga Tushirish (Quick Start)

Loyiha sof Vanilla JavaScript (ES Modules) stakida yozilganligi sababli uni istalgan lokal statik server orqali ishga tushirish mumkin:

### 1-usul: VS Code Live Server
`index.html` faylini oching va pastki o'ng burchakdagi **"Go Live"** tugmasini bosing.

### 2-usul: Python orqali (Terminalda)
```bash
python -m http.server 8080
```
Brauzerda oching: `http://localhost:8080`

### 3-usul: Node / npx orqali
```bash
npx serve .
```

---

## 📁 Fayllar Strukturasi

```
tigertype/
├── index.html                 # Asosiy sahifa va modallar
├── README.md                  # Hujjat
├── css/
│   ├── variables.css          # Apple Minimalist dizayn tokenlari
│   ├── base.css               # Reset va umumiy maket
│   ├── components.css         # Tugmalar, selektorlar, HUD va modallar
│   ├── typing-area.css        # 3 qatorli so'zlar bloki va silliq kursor
│   ├── race-track.css         # Poyga yo'lakchalari va avatarlar
│   └── results-modal.css      # Natijalar oynasi va Canvas grafik
├── js/
│   ├── main.js                # Ilova boshqaruv markazi (Orchestrator)
│   ├── config.js              # Rejimlar va konfiguratsiya
│   ├── core/
│   │   ├── typingEngine.js    # Klaviatura bosishlari, tekshiruv, kursor
│   │   ├── metrics.js         # Net/Gross WPM, Accuracy, Consistency formulalari
│   │   ├── timer.js           # performance.now() asosidagi yuqori aniqlikdagi taymer
│   │   └── wordBank.js        # Ko'p tilli lug'at generatori (PRNG seed bilan)
│   ├── audio/
│   │   └── soundEngine.js     # Web Audio API mexanik switch sintezatori
│   ├── multiplayer/
│   │   ├── peerManager.js     # PeerJS WebRTC P2P xonalari
│   │   └── botRacer.js        # Sozlanuvchi AI Bot poygachisi (30–110 WPM)
│   ├── ui/
│   │   ├── caretRenderer.js   # Silliq transform kursor animatsiyasi
│   │   ├── chartRenderer.js   # Canvas 2D tezlik grafigi
│   │   └── modalManager.js    # Natijalar, xona va tarix modallari
│   └── storage/
│       └── storage.js         # Shaxsiy rekordlar va natijalar tarixi
└── words/
    ├── english.js             # Inglizcha mashhur so'zlar
    ├── uzbek.js               # O'zbek tili so'zlari
    └── code.js                # HTML, CSS, JavaScript kod parchalari
```
