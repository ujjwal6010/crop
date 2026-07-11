# AgriScan — AI-Powered Crop Diagnostic Engine

> **Edge-AI crop disease classification for precision agriculture.**  
> 100% offline-capable PWA with IndexedDB sync queue and Twilio SMS escalation.

**MSME Udyam:** UDYAM-HR-06-0087998 | **NIC Code:** 62011

---

## Architecture

```
agriscan/
├── docs/                     # Academic compliance documentation
│   ├── TOC.md                # Master documentation index
│   ├── SPECIFICATIONS.md     # IEEE 830 SRS + DFD architecture
│   └── DEVELOPER_LOG.md      # Engineering journal & ADRs
├── public/                   # Static app shell (serve this directory)
│   ├── assets/               # Fonts, icons, stylesheet
│   ├── models/               # TF.js GraphModel (YOLOv8n-cls)
│   ├── vendor/               # TensorFlow.js v4.17.0 (local)
│   ├── index.html            # App shell (zero CDN dependencies)
│   ├── manifest.json         # PWA manifest
│   └── service-worker.js     # Cache-First service worker
├── src/
│   └── app.js                # Client logic, IndexedDB sync queue, geolocation
├── server/
│   ├── server.js             # Express/Twilio SMS gateway
│   └── package.json          # Server dependencies
└── README.md
```

## Quick Start

### Client (PWA)
```bash
# Serve the public directory with any static HTTP server
cd public
npx http-server ./ -p 8080
# Open http://localhost:8080 — works offline after first load
```

### SMS Gateway (Backend)
```bash
cd server
npm install
# Configure environment variables:
cp .env.example .env
# Edit .env with your Twilio credentials
npm start
```

## Key Features

- **100% Offline Inference:** TF.js GraphModel runs entirely in-browser via WebGL.
- **Cache-First Service Worker:** All assets pre-cached — instant startup, no network needed.
- **IndexedDB Sync Queue:** SMS alerts persist locally when offline, auto-flush on reconnect.
- **Tri-Lingual UI:** English, Hindi, Punjabi — full localization of all user-facing strings.
- **Zero CDN Dependencies:** Fonts, JS libraries, model weights — all self-hosted.

## Documentation

| Document | Purpose |
|----------|---------|
| [TOC.md](docs/TOC.md) | Master index |
| [SPECIFICATIONS.md](docs/SPECIFICATIONS.md) | IEEE 830 SRS + system architecture |
| [DEVELOPER_LOG.md](docs/DEVELOPER_LOG.md) | Engineering timeline + ADRs |

---

© 2026 AgriScan — Banitt Technologies | MSME Udyam UDYAM-HR-06-0087998
