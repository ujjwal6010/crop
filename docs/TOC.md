# AgriScan — System Documentation Table of Contents

**Project:** AgriScan — AI-Powered Crop Diagnostic Engine  
**MSME Registration:** Udyam UDYAM-HR-06-0087998 | NIC Code: 62011  
**Document Revision:** 2.0 | July 2026  
**Classification:** Engineering Compliance Artifact (Chandigarh University DCPD/HOD Internship Validation)

---

## Part I — Project Governance & Compliance

| §   | Document                        | Location                  | Description                                                                 |
|-----|---------------------------------|---------------------------|-----------------------------------------------------------------------------|
| 1.1 | README                          | `README.md`               | Executive summary, quick-start instructions, deployment guide               |
| 1.2 | Table of Contents (this file)   | `docs/TOC.md`             | Master index of all system documentation modules                            |
| 1.3 | Software Requirements Specification | `docs/SPECIFICATIONS.md`  | IEEE 830 SRS, system architecture, DFD hierarchy, localization matrix       |
| 1.4 | Developer Log                   | `docs/DEVELOPER_LOG.md`   | Chronological engineering journal with architectural decision records        |

---

## Part II — Software Requirements Specification (`SPECIFICATIONS.md`)

| §     | Section Title                                              | Page Ref    |
|-------|------------------------------------------------------------|-------------|
| 1     | Project Overview & Scope                                   | §1          |
| 1.1   | Product Perspective                                        | §1.1        |
| 1.2   | Product Functions Summary                                  | §1.2        |
| 1.3   | User Characteristics                                       | §1.3        |
| 1.4   | Operating Environment                                      | §1.4        |
| 1.5   | Design & Implementation Constraints                        | §1.5        |
| 1.6   | Assumptions & Dependencies                                 | §1.6        |
| 2     | Software Requirements Specification (IEEE 830)             | §2          |
| 2.1   | Functional Requirements                                    | §2.1        |
| 2.1.1 | FR-01: Image Capture & File Ingestion                      | §2.1.1      |
| 2.1.2 | FR-02: Preprocessing Pipeline (224×224 Normalization)       | §2.1.2      |
| 2.1.3 | FR-03: Offline Model Loading (TF.js GraphModel)            | §2.1.3      |
| 2.1.4 | FR-04: Edge Inference Execution                            | §2.1.4      |
| 2.1.5 | FR-05: Color Heuristic Pre-Filter (Plant Validation)       | §2.1.5      |
| 2.1.6 | FR-06: Localized Result Rendering                          | §2.1.6      |
| 2.1.7 | FR-07: IndexedDB Sync Queue (Offline SMS Persistence)      | §2.1.7      |
| 2.1.8 | FR-08: SMS Escalation Gateway (Express → Twilio)           | §2.1.8      |
| 2.1.9 | FR-09: Market Linkage & Remedy Display                     | §2.1.9      |
| 2.2   | Non-Functional Requirements                                | §2.2        |
| 2.2.1 | NFR-01: Inference Latency                                  | §2.2.1      |
| 2.2.2 | NFR-02: Offline Availability                               | §2.2.2      |
| 2.2.3 | NFR-03: System Reliability                                 | §2.2.3      |
| 2.2.4 | NFR-04: Accessibility & Inclusivity                        | §2.2.4      |
| 2.2.5 | NFR-05: Security & Data Privacy                            | §2.2.5      |
| 3     | Localization Matrix                                        | §3          |
| 3.1   | Language String Engine Architecture                        | §3.1        |
| 3.2   | String Key Registry (EN / HI / PU)                         | §3.2        |
| 3.3   | Remedy & Disease Label Localization                        | §3.3        |
| 4     | System Architecture Description & Data Flows               | §4          |
| 4.1   | Level-0 DFD: Context Diagram                              | §4.1        |
| 4.2   | Level-1 DFD: Process Level                                 | §4.2        |
| 4.3   | Level-2 DFD: Data Store / Component Level                  | §4.3        |
| 4.4   | End-to-End Data Flow Narrative                             | §4.4        |

---

## Part III — Developer Log (`DEVELOPER_LOG.md`)

| §     | Section Title                                              |
|-------|------------------------------------------------------------|
| 1     | Project Overview & Registration                            |
| 2     | Architectural Timeline                                     |
| 2.1   | Phase 1: Client-Side Prototype (Jan–Feb 2026)              |
| 2.2   | Phase 2: SMS Gateway Integration (Mar 2026)                |
| 2.3   | Phase 3: Tri-Lingual Localization (Apr 2026)               |
| 2.4   | Phase 4: Production Hardening & Offline Refactoring (Jul 2026) |
| 3     | Design System Reference                                    |
| 4     | Architectural Decision Records                             |
| 5     | Future Roadmap                                             |

---

## Part IV — Source Code Modules

### 4.1 Client Application (`public/` + `src/`)

| File                              | Purpose                                                         |
|-----------------------------------|-----------------------------------------------------------------|
| `public/index.html`              | HTML5 app shell — zero external CDN dependencies                |
| `public/manifest.json`           | PWA manifest with local icon reference                          |
| `public/service-worker.js`       | Cache-First service worker with complete app-shell pre-caching  |
| `public/assets/style.css`        | Stillpoint Design System (Japandi aesthetic, ~1066 lines)       |
| `public/assets/fonts/fonts.css`  | Local `@font-face` declarations (Cormorant Garamond + Inter)    |
| `public/assets/fonts/*.ttf`      | Self-hosted font binary files (7 variants)                      |
| `public/assets/icons/fav.png`    | Local favicon / PWA icon (512×512)                              |
| `public/vendor/tf.min.js`        | TensorFlow.js v4.17.0 core library (local vendor copy)          |
| `public/models/model.json`       | YOLOv8n-cls TF.js GraphModel topology definition                |
| `public/models/group1-shard*.bin`| Model weight shards (2 files, ~5.7 MB total)                    |
| `public/models/metadata.yaml`    | Ultralytics model metadata (class names, image dimensions)      |
| `src/app.js`                     | Client application logic: IndexedDB sync queue, TF.js inference, i18n engine, UI rendering |

### 4.2 Backend Server (`server/`)

| File                    | Purpose                                                      |
|-------------------------|--------------------------------------------------------------|
| `server/server.js`     | Express.js SMS escalation gateway (Twilio integration)       |
| `server/package.json`  | Node.js dependency manifest (express, twilio, cors, dotenv)  |

---

## Part V — Model Specification

| Attribute            | Value                                      |
|----------------------|--------------------------------------------|
| Architecture         | YOLOv8n-cls (Ultralytics)                  |
| Task                 | Multi-class image classification           |
| Input Shape          | `[1, 224, 224, 3]` (batch, H, W, channels) |
| Normalization        | Pixel values ÷ 255.0 (range: 0.0–1.0)     |
| Output Classes       | 4 (Bacterial Spot, Early Blight, Late Blight, Healthy) |
| Confidence Threshold | 80% minimum for valid diagnosis            |
| Format               | TensorFlow.js GraphModel (JSON + binary shards) |
| Training Date        | 2026-02-07                                 |
| Framework Version    | Ultralytics 8.4.12                         |

---

*End of Table of Contents — Document Revision 2.0*
