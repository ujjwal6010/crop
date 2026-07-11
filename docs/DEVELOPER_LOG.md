# AgriScan — Developer Log

## §1. Project Overview & Registration

**Name:** AgriScan — AI-Powered Crop Diagnostic Engine  
**MSME Registration:** Udyam UDYAM-HR-06-0087998  
**NIC Code:** 62011 (Computer Programming Activities)  
**Architecture:** Edge-AI PWA with Express.js SMS Escalation Gateway  
**Model:** YOLOv8n-cls (Ultralytics) → TensorFlow.js GraphModel  
**Version:** v50 (Production Hardened)  
**Last Updated:** 2026-07-11

---

## §2. Architectural Timeline

### §2.1 Phase 1: Client-Side Prototype (January–February 2026)

**Goal:** Build a minimum viable crop diagnosis tool as a single-page Progressive Web Application.

**Deliverables:**
- Single `index.html` with inline semantic sections (hero, how-it-works grid, diagnosis tool, footer).
- `style.css` implementing the "Stillpoint Studio" Japandi aesthetic: warm beige palette (`#F4EDE4`), forest green accent (`#264639`), Cormorant Garamond serif headings, Inter sans-serif body text.
- `app.js` with TensorFlow.js model loading (`tf.loadGraphModel()`), 224×224 image preprocessing, and basic classification output.
- `service-worker.js` with Network-First caching strategy.
- `manifest.json` for PWA installability.

**Known Issues (Phase 1):**
- Google Fonts loaded from CDN (`fonts.googleapis.com`) — breaks offline rendering.
- TensorFlow.js loaded from jsDelivr CDN — breaks offline inference.
- PWA icon sourced from external Flaticon URL — breaks offline installation.
- No SMS or alert functionality.
- Documentation limited to inline code comments.

**Design System Established:**

| Token          | Value         | Usage                           |
|----------------|---------------|---------------------------------|
| Primary Bg     | `#F4EDE4`     | Hero, Diagnosis, Navbar         |
| Secondary Bg   | `#F3E9DD`     | How it Works section            |
| Footer Bg      | `#E6DDD0`     | Footer grounding                |
| Card Bg        | `#F9F7F5`     | Diagnosis card (alabaster)      |
| Upload Zone    | `#F0EBE5`     | Specimen drop area              |
| Accent         | `#264639`     | Buttons, links, icons           |
| Text Black     | `#1C1C1C`     | Headings                        |
| Text Body      | `#4A4540`     | Body text                       |
| Border         | `#D1C7BD`     | All borders (1px solid)         |

---

### §2.2 Phase 2: SMS Gateway Integration (March 2026)

**Goal:** Enable farmers to escalate diagnosis results to KVK agricultural experts via SMS.

**Deliverables:**
- `server.js`: Express.js backend with a `POST /send-alert` endpoint.
- Twilio SDK integration for programmatic SMS delivery.
- `package.json` with `express`, `twilio`, `cors`, `dotenv` dependencies.
- Client-side `triggerTwistOption()` function with loading, success, and fallback button states.
- Phone number input with 10-digit validation and shake animation on error.
- Market linkage panel with mock shop data (name, distance, stock availability).

**Architecture Change:** The project transitioned from a pure client-side application to a **hybrid client-server architecture**. The Express backend is deployed on Render.com at `https://agriscan-backend-6iar.onrender.com`.

**Known Issues (Phase 2):**
- If the network is unavailable, the `fetch()` call to `/send-alert` fails silently — the SMS request is lost.
- No local persistence or retry mechanism for failed SMS attempts.
- Documentation (`DOCUMENTATION.md`) stated "no backend exists," which was now incorrect.

---

### §2.3 Phase 3: Tri-Lingual Localization (April 2026)

**Goal:** Extend the user interface to support Hindi and Punjabi in addition to English, targeting the Indo-Gangetic agrarian demographics.

**Deliverables:**
- Complete `translations` object in `app.js` with `en`, `hi`, and `pu` language codes.
- `CLASS_LABELS` array with localized disease names in all three languages.
- `REMEDIES` dictionary with localized remedy and advice strings.
- Language selector dropdown (`<select id="lang-select">`) in the navigation bar.
- `updateLanguageUI()` function performing DOM traversal with `data-i18n` attribute matching.
- SMS gateway button state text localized for all three languages.

**Known Issues (Phase 3):**
- Documentation still only mentioned English/Hindi — Punjabi was undocumented.
- The `DEVELOPER_LOG.md` still referenced the project as "CropHealth AI" instead of "AgriScan."

---

### §2.4 Phase 4: Production Hardening & Offline Refactoring (July 2026)

**Goal:** Eliminate all architectural flaws that prevented true offline operation and align the codebase with university engineering compliance standards.

**Critical Changes:**

#### 4.1 Directory Restructuring

The flat file layout was refactored into a modular directory structure:

```
agriscan/
├── docs/                     ← Academic compliance documentation
│   ├── TOC.md                ← Master documentation index
│   ├── SPECIFICATIONS.md     ← IEEE 830 SRS + DFD architecture
│   └── DEVELOPER_LOG.md      ← This file
├── public/                   ← Static app shell (served by HTTP server)
│   ├── assets/               ← Fonts, icons, stylesheet
│   │   ├── fonts/            ← Self-hosted .ttf files + @font-face CSS
│   │   ├── icons/            ← Local favicon/PWA icon
│   │   └── style.css         ← Stillpoint Design System
│   ├── models/               ← TF.js GraphModel (JSON + weight shards)
│   ├── vendor/               ← TensorFlow.js v4.17.0 (local copy)
│   ├── index.html            ← App shell (zero CDN dependencies)
│   ├── manifest.json         ← PWA manifest (local icon reference)
│   └── service-worker.js     ← Cache-First service worker
├── src/
│   └── app.js                ← Client logic + IndexedDB sync queue
├── server/
│   ├── server.js             ← Express/Twilio SMS gateway
│   └── package.json          ← Server dependency manifest
└── README.md
```

#### 4.2 CDN Dependency Elimination

| Asset                | Before (Phase 1–3)                               | After (Phase 4)                          |
|----------------------|--------------------------------------------------|------------------------------------------|
| TensorFlow.js        | `cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0`   | `vendor/tf.min.js` (local)               |
| Cormorant Garamond   | `fonts.googleapis.com` (7 variants)               | `assets/fonts/*.ttf` (self-hosted)       |
| Inter                | `fonts.googleapis.com` (2 variants)               | `assets/fonts/*.ttf` (self-hosted)       |
| PWA Icon             | `cdn-icons-png.flaticon.com` (external)           | `assets/icons/fav.png` (local)           |

#### 4.3 Service Worker Strategy Change

- **Before:** Network-First — tries network, falls back to cache. This meant offline users experienced a delay while the network request timed out.
- **After:** Cache-First (Stale-While-Revalidate) — serves from cache immediately, then updates the cache in the background from the network. This guarantees instant offline startup with zero latency.

The pre-cache asset list was expanded from 5 entries to 18+ entries, covering all fonts, the TF.js library, model weight shards, and the favicon.

#### 4.4 IndexedDB Sync Queue Implementation

A new `SyncQueue` module was added to `src/app.js` (§1–§2) providing:

- **`openDB()`**: Opens/creates the `AgriScanSyncDB` IndexedDB database with an `sms_queue` object store.
- **`enqueue(payload)`**: Writes an SMS payload with `status: 'pending'` and an ISO 8601 timestamp.
- **`flush()`**: Iterates over all pending records, POSTs each to the Express backend, and marks successes as `status: 'sent'`.
- **`pendingCount()`**: Returns the number of unsent records.

The `triggerTwistOption()` function now implements a dual-path dispatch:
1. Check `navigator.onLine`.
2. If online → POST to Express backend.
3. If offline or POST fails → `SyncQueue.enqueue()` + user notification banner.
4. On `window.addEventListener('online')` → `SyncQueue.flush()` auto-fires.

#### 4.5 Documentation Overhaul

- Created `docs/TOC.md`: Master index of all system documentation.
- Created `docs/SPECIFICATIONS.md`: IEEE 830 SRS with functional requirements, non-functional requirements, localization matrix, and Level-0/1/2 DFD hierarchy.
- Updated `docs/DEVELOPER_LOG.md` (this file): Corrected project name, documented all four phases, and aligned with the current codebase state.

---

## §3. Design System Reference

### Typography
- **Headings:** `'Cormorant Garamond'` (serif, 300 weight) — self-hosted from `/public/assets/fonts/`
- **Body:** `'Inter'` (sans-serif, 400 weight) — self-hosted from `/public/assets/fonts/`
- **Eyebrow:** Uppercase, 0.75rem, 3px letter-spacing

### Components

| Component     | Style                                                       |
|---------------|-------------------------------------------------------------|
| Buttons       | Sharp corners (0px radius), uppercase, 2px letter-spacing   |
| Cards         | Flat, bordered, no shadow, 60px padding                     |
| Grid          | 2×2 edge-to-edge with window-pane borders                   |
| Upload Zone   | Corner brackets using ::before/::after pseudo-elements      |

### Animations

| Class/Name          | Effect                                                      |
|---------------------|-------------------------------------------------------------|
| `.reveal`           | Fade-up on scroll (IntersectionObserver, 1.2s cubic-bezier) |
| `@keyframes float`  | Arrow breathing animation (2s infinite, -5px translateY)    |
| Navbar `::after`    | Sliding underline expands 0% → 100% on hover               |
| `@keyframes shake`  | Phone input validation shake (0.4s, ±5px translateX)        |
| `.loader-spinner`   | App loading spinner (1s linear infinite rotate)             |

### Quick Reference

```css
/* Primary Button */
.primary-btn {
    background: #264639;
    color: #FFFFFF;
    padding: 16px 32px;
    border-radius: 0;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

/* Reveal Animation */
.reveal {
    opacity: 0;
    transform: translateY(50px);
    transition: all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.reveal.active {
    opacity: 1;
    transform: translateY(0);
}
```

---

## §4. Architectural Decision Records

### ADR-001: Cache-First over Network-First Service Worker
- **Decision:** Switch from Network-First to Cache-First (Stale-While-Revalidate) caching strategy.
- **Rationale:** Network-First introduces a network timeout delay on every page load when offline. For a tool targeting rural areas with unreliable connectivity, the app must render instantly from cache. Background revalidation ensures cached assets are refreshed when connectivity is available.
- **Trade-off:** Users may see stale content until the background fetch completes. Acceptable because the app is a tool (not a content feed) and updates are infrequent.

### ADR-002: IndexedDB over localStorage for SMS Queue
- **Decision:** Use IndexedDB (via raw IDBDatabase API) instead of localStorage.
- **Rationale:** localStorage is synchronous, blocking, limited to 5 MB, and stores only strings. IndexedDB is asynchronous, supports structured cloning (objects), has a much higher storage quota, and supports indexed queries. The sync queue needs to store multiple records with status filtering.
- **Trade-off:** IndexedDB API is more verbose. Mitigated by the `SyncQueue` IIFE module pattern that encapsulates complexity.

### ADR-003: Self-Hosted Fonts over Google Fonts CDN
- **Decision:** Download and self-host all 7 font variants (5 Cormorant Garamond + 2 Inter) as `.ttf` files.
- **Rationale:** Google Fonts CDN introduces an external network dependency that breaks offline rendering. Self-hosting eliminates this single point of failure and ensures fonts are pre-cached by the service worker.
- **Trade-off:** Increases the initial download payload by ~500 KB. Acceptable because fonts are cached permanently after first load.

### ADR-004: Local TensorFlow.js Vendor Copy
- **Decision:** Download `tf.min.js` (v4.17.0) from jsDelivr and serve it from `/public/vendor/`.
- **Rationale:** The CDN dependency was the most critical offline-safety violation. The TF.js core library (~1.5 MB minified) must be available without any network request.
- **Trade-off:** Manual version management required (no automatic CDN updates). Acceptable for a production deployment where stability is prioritized over bleeding-edge updates.

---

## §5. Future Roadmap

> [!IMPORTANT]
> **For the next AI or developer:**
> - Always maintain the **offline-first architecture** — no external CDN dependencies.
> - Increment `CACHE_NAME` in `service-worker.js` after any change to cached assets.
> - Keep all model files in `/public/models/` — do not introduce cloud inference endpoints.
> - Update this log with every significant architectural change.
> - Test offline functionality: DevTools → Application → Service Workers → "Offline" checkbox → reload.

**Planned Enhancements:**
1. Expand the classification model beyond tomato to include wheat, rice, and mustard leaf diseases.
2. Replace the mock shop database (`MOCK_SHOPS`) with a live geolocation-based API.
3. Implement Background Sync API (Service Worker) as a complement to the IndexedDB queue for more reliable background delivery.
4. Add camera-direct capture mode (MediaDevices API) in addition to file picker.
5. Introduce a diagnosis history panel backed by IndexedDB, allowing farmers to review past scans.

---

*Keep this file updated with every future change. — Document Revision 2.0*
