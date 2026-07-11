# AgriScan — Software Requirements Specification & System Design Document

**Project Title:** AgriScan — AI-Powered Crop Diagnostic Engine  
**MSME Registration:** Udyam UDYAM-HR-06-0087998 | NIC Code: 62011 (Computer Programming Activities)  
**Document Standard:** IEEE 830-1998 (Software Requirements Specification)  
**Document Revision:** 2.0 | July 2026  
**Classification:** Engineering Compliance Artifact — Chandigarh University DCPD/HOD Internship Validation  
**Prepared By:** AgriScan Engineering Team, Banitt Technologies

---

## §1. Project Overview & Scope

### §1.1 Product Perspective

AgriScan is an **edge-AI computing tool** purpose-built for **agricultural diagnostic acceleration** in resource-constrained rural environments across the Indo-Gangetic agrarian belt. The system delivers real-time, on-device crop disease classification without requiring persistent network connectivity, thereby addressing the critical infrastructure gap faced by over 86% of Indian farmers who operate on marginal or small landholdings (Agricultural Census 2021–22, Ministry of Agriculture & Farmers Welfare).

The product is architected as a **Progressive Web Application (PWA)** that executes a pre-trained YOLOv8 nano classification model directly within the browser's JavaScript runtime via TensorFlow.js. This architectural decision eliminates the dependency on cloud-based inference endpoints, reduces diagnostic latency to sub-200ms levels, and ensures complete operational availability in areas with intermittent or absent cellular connectivity.

AgriScan is registered as a Micro, Small & Medium Enterprise under the Udyam Registration framework (UDYAM-HR-06-0087998), classified under NIC Code 62011 (Computer Programming Activities), and operates within the Digital India and Agri-tech innovation ecosystem.

### §1.2 Product Functions Summary

The system provides the following core capabilities:

1. **Image Capture & Ingestion:** Accept leaf specimen photographs via the device camera or file system picker.
2. **Intelligent Pre-Filtering:** Apply a color-heuristic algorithm to reject non-plant images before engaging the neural network, conserving computational resources.
3. **Edge AI Inference:** Execute a YOLOv8n-cls TensorFlow.js GraphModel entirely within the browser, classifying tomato leaf specimens into one of four diagnostic categories (Bacterial Spot, Early Blight, Late Blight, Healthy).
4. **Localized Result Presentation:** Display diagnosis results, confidence metrics, and treatment remedies in the user's preferred language (English, Hindi, or Punjabi).
5. **Offline-Resilient SMS Escalation:** When a farmer requires expert intervention, compose and transmit an SMS alert to a KVK (Krishi Vigyan Kendra) agricultural expert via a Twilio-powered Express.js backend. If network connectivity is unavailable, the alert payload is persisted in an IndexedDB synchronization queue and automatically dispatched upon connectivity restoration.
6. **Market Linkage:** Present nearby agrochemical supply points with stock availability indicators for the recommended treatment.

### §1.3 User Characteristics

| User Class                    | Characteristics                                                                                      |
|-------------------------------|------------------------------------------------------------------------------------------------------|
| **Primary: Marginal Farmers** | Limited technical literacy, predominantly Hindi/Punjabi-speaking, feature phone or entry-level smartphone access, intermittent 2G/3G connectivity |
| **Secondary: Agricultural Extension Workers** | KVK field agents, FPO coordinators; moderate technical literacy; responsible for on-ground advisory |
| **Tertiary: Agronomists / Plant Pathologists** | Domain experts who receive SMS escalation alerts and provide remote diagnostic validation            |

### §1.4 Operating Environment

| Parameter                | Specification                                                  |
|--------------------------|----------------------------------------------------------------|
| Client Platform          | Any modern web browser with ES6+, WebGL, and IndexedDB support (Chrome 80+, Firefox 78+, Safari 14+, Edge 80+) |
| Minimum Device RAM       | 2 GB (for TF.js WebGL backend tensor allocation)               |
| Network Requirement      | **None for diagnosis** (100% offline-capable after first load); network required only for SMS escalation |
| Backend Server           | Node.js ≥ 18.x runtime with Express.js 4.x                    |
| SMS Gateway              | Twilio Programmable SMS API                                    |
| PWA Install Target       | Android (Chrome), iOS (Safari 16.4+), Desktop (Chrome, Edge)   |

### §1.5 Design & Implementation Constraints

1. **Zero External CDN Dependencies at Runtime:** All static assets (JavaScript libraries, fonts, icons, model weights) must be self-hosted and pre-cached by the service worker. No runtime network fetches are permitted for app-shell resources.
2. **Model Size Budget:** The TF.js GraphModel binary payload (shards) must not exceed 6 MB to ensure viable download on 2G connections during initial installation.
3. **Inference Input Standardization:** All input images must be programmatically resized and normalized to `224 × 224 × 3` with pixel values in the range `[0.0, 1.0]` before tensor submission.
4. **SMS Character Budget:** All Twilio SMS payloads must be ≤ 160 characters to fit within a single SMS segment on trial accounts.

### §1.6 Assumptions & Dependencies

- The user's device supports the WebGL backend for TensorFlow.js hardware-accelerated inference. If WebGL is unavailable, TF.js will automatically fall back to the CPU backend (WASM or plain JS), with degraded performance.
- The Twilio trial account has pre-verified the recipient phone number (`ALERT_RECIPIENT_NUMBER`).
- The YOLOv8n-cls model has been trained and validated on the PlantVillage tomato leaf dataset subset with ≥ 92% top-1 accuracy.

---

## §2. Software Requirements Specification (IEEE 830)

### §2.1 Functional Requirements

#### §2.1.1 FR-01: Image Capture & File Ingestion

| Attribute     | Description                                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------------------------|
| **ID**        | FR-01                                                                                                             |
| **Priority**  | Critical                                                                                                          |
| **Input**     | User selects or captures an image via `<input type="file" accept="image/*">` (triggers native camera on mobile)   |
| **Process**   | The `FileReader` API reads the selected file as a Data URL. The result is injected into a preview `<img>` element. |
| **Output**    | An in-DOM `<img>` element (`#preview-img`) with the specimen image loaded, ready for preprocessing.               |
| **Validation**| File must be a valid image MIME type (`image/jpeg`, `image/png`, `image/webp`). Non-image files are rejected by the `accept` attribute. |

#### §2.1.2 FR-02: Preprocessing Pipeline (224×224 Normalization)

| Attribute     | Description                                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------------------------|
| **ID**        | FR-02                                                                                                             |
| **Priority**  | Critical                                                                                                          |
| **Input**     | The `HTMLImageElement` from FR-01.                                                                                |
| **Process**   | 1. `tf.browser.fromPixels(imgElement)` converts the image to a 3D tensor `[H, W, 3]` with integer pixel values `[0, 255]`. <br> 2. `tf.image.resizeBilinear(tensor, [224, 224])` resamples to the model's expected input resolution. <br> 3. `tensor.div(255.0)` normalizes pixel values to the floating-point range `[0.0, 1.0]`. <br> 4. `tensor.expandDims(0)` prepends a batch dimension, yielding shape `[1, 224, 224, 3]`. |
| **Output**    | A `tf.Tensor4D` of shape `[1, 224, 224, 3]` with `float32` dtype, suitable for GraphModel inference.             |
| **Memory**    | All intermediate tensors are wrapped in `tf.tidy()` to guarantee automatic disposal and prevent WebGL memory leaks. |

#### §2.1.3 FR-03: Offline Model Loading (TF.js GraphModel)

| Attribute     | Description                                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------------------------|
| **ID**        | FR-03                                                                                                             |
| **Priority**  | Critical                                                                                                          |
| **Input**     | Model topology file (`/public/models/model.json`) and associated weight shard files (`group1-shard1of2.bin`, `group1-shard2of2.bin`). |
| **Process**   | `tf.loadGraphModel()` fetches the topology JSON and binary weight shards. The service worker intercepts these GET requests and serves them from the pre-populated Cache Storage (Cache-First strategy), enabling model loading without network access. |
| **Output**    | A `tf.GraphModel` instance stored in the global `model` variable, ready for `.predict()` invocations.            |
| **Warm-up**   | Immediately after loading, a dummy tensor `tf.zeros([1, 224, 224, 3])` is passed through `model.predict()` to force WebGL shader compilation and texture allocation, eliminating first-inference latency. |

#### §2.1.4 FR-04: Edge Inference Execution

| Attribute     | Description                                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------------------------|
| **ID**        | FR-04                                                                                                             |
| **Priority**  | Critical                                                                                                          |
| **Input**     | The preprocessed `tf.Tensor4D` from FR-02.                                                                       |
| **Process**   | `model.predict(inputTensor)` executes the YOLOv8n-cls forward pass on the WebGL backend. The output is a 1D probability vector of length 4 (one per class). The function iterates over the vector to find the index with maximum probability. |
| **Output**    | A result object: `{ classIndex, classLabel, confidence (%), rawConfidence (0.0–1.0) }`.                          |
| **Threshold** | If `rawConfidence < 0.80` (80%), the result is deemed **low-confidence** and the user is prompted to retake the image with improved lighting and framing. |

#### §2.1.5 FR-05: Color Heuristic Pre-Filter (Plant Validation)

| Attribute     | Description                                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------------------------|
| **ID**        | FR-05                                                                                                             |
| **Priority**  | High                                                                                                              |
| **Input**     | The `HTMLImageElement` from FR-01 (before tensor conversion).                                                    |
| **Process**   | 1. The image is drawn onto a hidden `<canvas>` at 100×100 resolution. <br> 2. `getImageData()` extracts the raw RGBA pixel array. <br> 3. Each pixel is converted from RGB to HSL color space. <br> 4. Pixels are classified as "plant-like" if they fall within green (H: 40°–180°, S > 0.08), yellow-brown (H: 15°–60°), or dark-green (H: 60°–180°, L < 0.4) ranges. <br> 5. If the ratio of plant-like pixels to total pixels is below 10% (`PLANT_COLOR_THRESHOLD`), the image is rejected. |
| **Output**    | Boolean. `true` if the image passes the plant heuristic; `false` triggers a "No Leaf Detected" rejection card.    |
| **Rationale** | Prevents wasted inference cycles on non-plant images (selfies, screenshots, etc.), improving user experience and conserving battery on low-end devices. |

#### §2.1.6 FR-06: Localized Result Rendering

| Attribute     | Description                                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------------------------|
| **ID**        | FR-06                                                                                                             |
| **Priority**  | High                                                                                                              |
| **Input**     | The inference result from FR-04 and the active language code (`en`, `hi`, or `pu`).                              |
| **Process**   | The result card is dynamically constructed using localized strings from the `translations` object, the `CLASS_LABELS` array, and the `REMEDIES` dictionary. The DOM is injected into the `#diagnosis-tool` container via `innerHTML`. |
| **Output**    | A styled result card containing: disease name (localized), confidence bar, remedy bullets (localized), SMS bridge section, and market linkage panel. |

#### §2.1.7 FR-07: IndexedDB Sync Queue (Offline SMS Persistence)

| Attribute     | Description                                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------------------------|
| **ID**        | FR-07                                                                                                             |
| **Priority**  | Critical                                                                                                          |
| **Trigger**   | The user clicks "Send SMS to Expert" while `navigator.onLine === false`, or the network POST to the Express backend fails. |
| **Process**   | 1. The `SyncQueue.enqueue()` function opens an IndexedDB database (`AgriScanSyncDB`, version 1) with an object store (`sms_queue`). <br> 2. The SMS payload (`{ disease, confidence, phone, lang }`) is written as a record with `status: 'pending'` and an ISO 8601 timestamp. <br> 3. The user is notified via a transient banner: "Alert saved to queue — will auto-send when connectivity resumes." <br> 4. A `window.addEventListener('online', ...)` listener triggers `SyncQueue.flush()`, which iterates over all pending records, POSTs each to the Express backend, and marks successfully delivered records as `status: 'sent'`. |
| **Output**    | Zero data loss for SMS escalation requests. All payloads are durably persisted in IndexedDB until confirmed delivery. |
| **Schema**    | `{ id (auto), timestamp (ISO 8601), status ('pending' | 'sent'), retries (int), payload (object), sentAt (ISO 8601, nullable) }` |

#### §2.1.8 FR-08: SMS Escalation Gateway (Express → Twilio)

| Attribute     | Description                                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------------------------|
| **ID**        | FR-08                                                                                                             |
| **Priority**  | High                                                                                                              |
| **Endpoint**  | `POST /send-alert` on the Express.js backend (`server/server.js`).                                              |
| **Input**     | JSON body: `{ disease: string, confidence: string, phone: string, lang: string }`.                               |
| **Process**   | 1. Validate required fields (`disease`, `confidence`). <br> 2. Format a localized SMS message (≤ 160 chars) using the `formatAlertMessage()` function, which selects English, Hindi, or Punjabi templates based on `lang`. <br> 3. Initialize the Twilio client with environment credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`). <br> 4. Send the SMS via `client.messages.create()` to the configured `ALERT_RECIPIENT_NUMBER`. |
| **Output**    | `200 OK` with `{ success: true, messageSid, alertText }` on success. `400/500/503` with error details on failure.  |

#### §2.1.9 FR-09: Market Linkage & Remedy Display

| Attribute     | Description                                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------------------------|
| **ID**        | FR-09                                                                                                             |
| **Priority**  | Medium                                                                                                            |
| **Input**     | The diagnosed disease label (English) from FR-04.                                                                |
| **Process**   | A lookup into the `MEDICINES` dictionary maps the disease to a recommended agrochemical. The `MOCK_SHOPS` array provides three local agrochemical dealers with distance and stock availability data. |
| **Output**    | A "Nearby Shops" panel rendered below the SMS bridge section, showing dealer name, distance (km), and a color-coded stock availability indicator (green dot = in stock, red dot = out of stock). |

---

### §2.2 Non-Functional Requirements

#### §2.2.1 NFR-01: Inference Latency

| Attribute     | Specification                                                                      |
|---------------|-------------------------------------------------------------------------------------|
| **ID**        | NFR-01                                                                              |
| **Metric**    | Time from `model.predict()` invocation to probability vector extraction.            |
| **Target**    | < 200 ms on devices with WebGL support (mid-range Android smartphones, 2020+).      |
| **Measurement**| `performance.now()` delta around the prediction call in `predict()`.               |
| **Mitigation**| Model warm-up on load (FR-03) pre-compiles WebGL shaders, eliminating cold-start overhead. Input images are downsized to 224×224 before tensor conversion. |

#### §2.2.2 NFR-02: Offline Availability

| Attribute     | Specification                                                                      |
|---------------|-------------------------------------------------------------------------------------|
| **ID**        | NFR-02                                                                              |
| **Metric**    | Application bootability and diagnostic capability when `navigator.onLine === false`.|
| **Target**    | 100% offline startup and inference after initial installation (first visit with network). |
| **Implementation**| Cache-First service worker pre-caches the complete app shell (HTML, CSS, JS, fonts, TF.js library, model weights, icons). All assets are served from Cache Storage on subsequent visits. |
| **Verification**| Open Chrome DevTools → Application → Service Workers → check "Offline" → reload page. The app must render fully and execute inference without errors. |

#### §2.2.3 NFR-03: System Reliability

| Attribute     | Specification                                                                      |
|---------------|-------------------------------------------------------------------------------------|
| **ID**        | NFR-03                                                                              |
| **Metric**    | Data durability for SMS escalation requests.                                        |
| **Target**    | Zero data loss. All SMS payloads must be either delivered or persisted in IndexedDB. |
| **Implementation**| The dual-path architecture (online → POST, offline → IndexedDB enqueue) with automatic flush on the `online` event ensures no alert is silently dropped. |

#### §2.2.4 NFR-04: Accessibility & Inclusivity

| Attribute     | Specification                                                                      |
|---------------|-------------------------------------------------------------------------------------|
| **ID**        | NFR-04                                                                              |
| **Target**    | WCAG 2.1 Level A compliance for critical user flows.                               |
| **Implementation**| Semantic HTML5 elements (`<nav>`, `<header>`, `<section>`, `<footer>`). ARIA labels on interactive controls (`aria-label` on hamburger button). Minimum 44px touch targets on mobile. `font-display: swap` for font loading to prevent invisible text. High contrast ratio between text and background colors. |

#### §2.2.5 NFR-05: Security & Data Privacy

| Attribute     | Specification                                                                      |
|---------------|-------------------------------------------------------------------------------------|
| **ID**        | NFR-05                                                                              |
| **Target**    | No sensitive data leaves the device without explicit user action.                   |
| **Implementation**| All AI inference is executed on-device; no images are transmitted to any server. Phone numbers entered for SMS are transmitted only to the AgriScan Express backend over HTTPS. Twilio credentials are stored server-side in environment variables, never exposed to the client. IndexedDB data is scoped to the origin and inaccessible to other domains. |

---

## §3. Localization Matrix

### §3.1 Language String Engine Architecture

The localization system is implemented as a client-side **string-key lookup engine**. A JavaScript object (`translations`) maps ISO-style language codes to dictionaries of UI string keys and their localized values. The engine operates as follows:

1. **Language Selection:** The user selects a language code (`en`, `hi`, `pu`) from the `<select id="lang-select">` dropdown in the navigation bar.
2. **Event Handler:** The `change` event on the dropdown triggers `updateLanguageUI()`.
3. **DOM Traversal:** The function queries all elements with a `data-i18n` attribute and replaces their `innerText` with the corresponding value from `translations[currentLang][key]`.
4. **Dynamic Content:** Dynamically generated content (result cards, SMS bridge text) reads from `translations[currentLang]` at the time of DOM construction, ensuring localization is applied even to runtime-generated UI.

This architecture avoids the overhead of external i18n libraries while providing complete tri-lingual coverage of all user-facing strings.

### §3.2 String Key Registry (EN / HI / PU)

| String Key         | English (en)                                                | Hindi (hi)                                                        | Punjabi (pu)                                                       |
|--------------------|-------------------------------------------------------------|-------------------------------------------------------------------|--------------------------------------------------------------------|
| `nav-home`         | Home                                                        | होम                                                                | ਘਰ                                                                  |
| `nav-about`        | About                                                       | बारे में                                                           | ਬਾਰੇ                                                               |
| `nav-contact`      | Contact                                                     | संपर्क                                                             | ਜਾਂਚ ਕਰੋ                                                           |
| `hero-title`       | Save Your Harvest from Disease.                             | अपनी फसल को बीमारी से बचाएं।                                       | ਆਪਣੀ ਫ਼ਸਲ ਨੂੰ ਬਿਮਾਰੀ ਤੋਂ ਬਚਾਓ।                                   |
| `hero-subtitle`    | Instant, offline crop diagnosis for rural farmers...        | ग्रामीण किसानों के लिए तत्काल, ऑफलाइन फसल निदान...                  | ਪੇਂਡੂ ਕਿਸਾਨਾਂ ਲਈ ਤੁਰੰਤ, ਆਫਲਾਈਨ ਫ਼ਸਲ ਜਾਂਚ...                      |
| `hero-cta`         | Start Diagnosis                                             | निदान शुरू करें                                                    | ਜਾਂਚ ਸ਼ੁਰੂ ਕਰੋ                                                     |
| `btn-learn`        | Learn More                                                  | और जानें                                                           | ਹੋਰ ਜਾਣੋ                                                           |
| `how-title`        | How it Works                                                | यह कैसे काम करता है                                                | ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ                                              |
| `step1-title`      | Capture                                                     | फोटो लें                                                           | ਫੋਟੋ ਖਿੱਚੋ                                                         |
| `step2-title`      | Diagnosis                                                   | त्वरित विश्लेषण                                                   | ਤੁਰੰਤ ਵਿਸ਼ਲੇਸ਼ਣ                                                     |
| `step3-title`      | Remedy                                                      | उपाय पाएं                                                          | ਉਪਾਅ ਪ੍ਰਾਪਤ ਕਰੋ                                                    |
| `step4-title`      | Monitor                                                     | निगरानी                                                            | ਨਿਗਰਾਨੀ                                                            |
| `diag-tool-title`  | Diagnosis Tool                                              | निदान उपकरण                                                        | ਜਾਂਚ ਸੰਦ                                                            |
| `upload-btn-text`  | Upload Specimen                                             | नमूना अपलोड करें                                                   | ਨਮੂਨਾ ਅੱਪਲੋਡ ਕਰੋ                                                   |
| `btn-check`        | Analyze Crop                                                | फसल का विश्लेषण करें                                               | ਫ਼ਸਲ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰੋ                                              |
| `analyzing`        | Analyzing...                                                | विश्लेषण किया जा रहा है...                                         | ਵਿਸ਼ਲੇਸ਼ਣ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ...                                       |
| `loading-model`    | Loading AI Model...                                         | AI मॉडल लोड हो रहा है...                                           | AI ਮਾਡਲ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...                                          |
| `confidence`       | Confidence                                                  | भरोसा                                                              | ਭਰੋਸਾ                                                               |
| `label-remedy`     | Remedy                                                      | उपाय                                                               | ਉਪਾਅ                                                                |
| `btn-new`          | Start New Diagnosis                                         | नया निदान शुरू करें                                                 | ਨਵੀਂ ਜਾਂਚ ਸ਼ੁਰੂ ਕਰੋ                                                |
| `offline-active`   | Offline Active                                              | ऑफलाइन सक्रिय                                                     | ਆਫਲਾਈਨ ਐਕਟਿਵ                                                        |
| `status-online`    | Online                                                      | ऑनलाइन                                                            | ਆਨਲਾਈਨ                                                              |
| `status-offline`   | Offline                                                     | ऑफलाइन                                                            | ਆਫਲਾਈਨ                                                              |
| `footer`           | © 2026 AgriScan — MSME Udyam UDYAM-HR-06-0087998           | © 2026 AgriScan — MSME उद्यम UDYAM-HR-06-0087998                 | © 2026 ਐਗਰੀਸਕੇਨ — MSME ਉਦਯਮ UDYAM-HR-06-0087998                   |
| `model-ready`      | AI Model Ready                                              | AI मॉडल तैयार                                                      | AI ਮਾਡਲ ਤਿਆਰ                                                        |
| `model-error`      | Model Error                                                 | मॉडल त्रुटि                                                        | ਮਾਡਲ ਗਲਤੀ                                                           |

### §3.3 Remedy & Disease Label Localization

| Class ID          | English            | Hindi              | Punjabi             |
|-------------------|--------------------|---------------------|---------------------|
| bacterial-spot    | Bacterial Spot     | जीवाणु धब्बा        | ਬੈਕਟੀਰੀਆ ਦਾ ਧੱਬਾ    |
| early-blight      | Early Blight       | अगेती झुलसा         | ਅਗੇਤੀ ਝੁਲਸ          |
| late-blight       | Late Blight        | पछेती झुलसा         | ਪਛੇਤੀ ਝੁਲਸ          |
| healthy           | Healthy            | स्वस्थ              | ਸਿਹਤਮੰਦ             |

Each class has a corresponding remedy object with `remedy` (treatment instruction) and `advice` (preventive guidance) fields in all three languages, stored in the `REMEDIES` dictionary in `src/app.js`.

---

## §4. System Architecture Description & Data Flows

### §4.1 Level-0 DFD: Context Diagram

The Level-0 Data Flow Diagram represents AgriScan as a single process interacting with three external entities:

```
┌──────────────┐                                          ┌──────────────────┐
│              │  (1) Leaf Image                           │                  │
│   FARMER     │ ─────────────────────────────────────────▶│                  │
│   (User)     │                                           │    AGRISCAN      │
│              │◀───────────────────────────────────────── │    SYSTEM        │
│              │  (2) Diagnosis + Remedy (localized)       │                  │
│              │                                           │                  │
│              │  (3) Phone Number + Alert Request         │                  │
│              │ ─────────────────────────────────────────▶│                  │
└──────────────┘                                           └────────┬─────────┘
                                                                    │
                                                                    │ (4) SMS Alert
                                                                    │     Payload
                                                                    ▼
                                                           ┌──────────────────┐
                                                           │  KVK EXPERT      │
                                                           │  (Agronomist)    │
                                                           └──────────────────┘
```

**External Entities:**

| Entity          | Role                                                                                           |
|-----------------|------------------------------------------------------------------------------------------------|
| **Farmer**      | Provides leaf specimen images and phone number; receives localized diagnosis and remedy.       |
| **KVK Expert**  | Receives SMS alert with disease classification, confidence, and farmer contact information.     |

**Data Flows:**

| Flow | Description                                                                                   |
|------|-----------------------------------------------------------------------------------------------|
| (1)  | Raw leaf image (JPEG/PNG) captured via device camera or selected from file system.            |
| (2)  | Localized diagnosis card: disease name, confidence %, treatment remedy, nearby shops.         |
| (3)  | Farmer's 10-digit mobile number and SMS alert composition request.                             |
| (4)  | Formatted SMS payload transmitted via Twilio API to the KVK expert's phone number.            |

---

### §4.2 Level-1 DFD: Process Level

The Level-1 DFD decomposes the AgriScan system into five interconnected processes:

```
                                 ┌─────────────────────────┐
                                 │  P1: IMAGE INGESTION    │
      Leaf Image ───────────────▶│  & VALIDATION           │
                                 │  (FileReader + Canvas)  │
                                 └────────┬────────────────┘
                                          │
                                          │ Valid plant image
                                          ▼
                                 ┌─────────────────────────┐
                                 │  P2: TENSOR             │
                                 │  PREPROCESSING          │
                                 │  (224×224, /255.0,      │
                                 │   expandDims)           │
                                 └────────┬────────────────┘
                                          │
                                          │ tf.Tensor4D [1,224,224,3]
                                          ▼
                                 ┌─────────────────────────┐
                                 │  P3: EDGE INFERENCE     │
                                 │  ENGINE                 │
                                 │  (TF.js GraphModel      │
                                 │   .predict())           │
                                 └────────┬────────────────┘
                                          │
                                          │ { classLabel, confidence }
                                          ▼
                                 ┌─────────────────────────┐
         Diagnosis Card ◀───────│  P4: RESULT RENDERING   │
         (localized)            │  & LOCALIZATION          │
                                 │  (i18n string engine)   │
                                 └────────┬────────────────┘
                                          │
                                          │ SMS payload
                                          ▼
                                 ┌─────────────────────────┐       ┌──────────────┐
                                 │  P5: SMS ESCALATION     │──────▶│ D1: IndexedDB│
                                 │  GATEWAY                │       │  Sync Queue  │
                                 │  (Online: POST to       │◀──────│              │
                                 │   Express. Offline:     │       └──────────────┘
                                 │   IndexedDB enqueue)    │
                                 └────────┬────────────────┘
                                          │
                                          │ HTTP POST (when online)
                                          ▼
                                 ┌─────────────────────────┐
                                 │  EXPRESS BACKEND        │
                                 │  (server/server.js)     │
                                 │  → Twilio API           │
                                 └────────┬────────────────┘
                                          │
                                          │ SMS
                                          ▼
                                      KVK Expert
```

**Process Descriptions:**

| Process | Name                        | Function                                                                                                         |
|---------|-----------------------------|------------------------------------------------------------------------------------------------------------------|
| P1      | Image Ingestion & Validation | Accepts the leaf image via `<input type="file">`, reads it with `FileReader`, and applies the plant-color heuristic filter (`isPlantLike()`). Rejects non-plant images with a user-friendly error card. |
| P2      | Tensor Preprocessing         | Converts the validated `HTMLImageElement` into a normalized `tf.Tensor4D` of shape `[1, 224, 224, 3]` within a `tf.tidy()` scope. |
| P3      | Edge Inference Engine        | Executes `model.predict(inputTensor)` on the YOLOv8n-cls GraphModel. Extracts the probability vector, identifies the argmax class, and applies the 80% confidence threshold. |
| P4      | Result Rendering & Localization | Constructs the diagnosis result card using localized strings from the `translations`, `CLASS_LABELS`, and `REMEDIES` data structures. Injects the card into the DOM. |
| P5      | SMS Escalation Gateway       | Dual-path dispatcher: if `navigator.onLine === true`, POSTs the alert payload to the Express backend; if offline or POST fails, enqueues the payload in IndexedDB via `SyncQueue.enqueue()`. |

---

### §4.3 Level-2 DFD: Data Store / Component Level

The Level-2 DFD provides granular visibility into the data stores and component interactions:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser Runtime)                     │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐               │
│  │ D2:      │    │ D3:      │    │ D4:          │               │
│  │ Cache    │    │ TF.js    │    │ translations │               │
│  │ Storage  │    │ GraphMdl │    │ {} (i18n)    │               │
│  │ (SW)     │    │ (in-mem) │    │              │               │
│  └────┬─────┘    └────┬─────┘    └──────┬───────┘               │
│       │               │                 │                        │
│       │ serves         │ .predict()     │ string lookup          │
│       │ assets         │                │                        │
│       ▼               ▼                ▼                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              APPLICATION LOGIC (src/app.js)          │        │
│  │  FileReader → Canvas → tf.tidy() → predict()        │        │
│  │  → renderResult() → triggerTwistOption()             │        │
│  └─────────────────────┬───────────────────────────────┘        │
│                        │                                         │
│              ┌─────────┴──────────┐                              │
│              │                    │                              │
│              ▼                    ▼                              │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ D1: IndexedDB    │  │ navigator.onLine │                     │
│  │ 'sms_queue'      │  │ === true?        │                     │
│  │ (pending alerts) │  └────────┬─────────┘                     │
│  └──────────────────┘           │                                │
│                                 │ YES → fetch POST               │
│                                 ▼                                │
└─────────────────────────────────┼────────────────────────────────┘
                                  │ HTTPS POST /send-alert
                                  ▼
                     ┌─────────────────────────┐
                     │  EXPRESS BACKEND         │
                     │  (server/server.js)      │
                     │                          │
                     │  ┌───────────────────┐   │
                     │  │ D5: Twilio Client │   │
                     │  │ (env credentials) │   │
                     │  └────────┬──────────┘   │
                     └───────────┼──────────────┘
                                 │
                                 │ Twilio REST API
                                 ▼
                     ┌─────────────────────────┐
                     │  TWILIO SMS GATEWAY      │
                     │  → KVK Expert Phone      │
                     └─────────────────────────┘
```

**Data Stores:**

| Store | Name                | Technology    | Persistence | Contents                                                     |
|-------|---------------------|---------------|-------------|--------------------------------------------------------------|
| D1    | SMS Sync Queue      | IndexedDB     | Persistent  | Pending SMS alert payloads with timestamps and delivery status |
| D2    | App Shell Cache     | Cache Storage | Persistent  | All static assets (HTML, CSS, JS, fonts, model files)         |
| D3    | TF.js GraphModel    | In-Memory     | Session     | Loaded model topology and weight tensors (WebGL textures)     |
| D4    | Translations        | JS Object     | Session     | Tri-lingual UI string dictionaries (EN, HI, PU)              |
| D5    | Twilio Client       | Env Variables | Server-side | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |

---

### §4.4 End-to-End Data Flow Narrative

The complete data lifecycle for a single diagnostic session proceeds as follows:

1. **Image Acquisition (P1):** The farmer taps the "Upload Specimen" zone, which triggers the native camera via `<input type="file" accept="image/*">`. The captured JPEG is read by `FileReader.readAsDataURL()` and rendered as an `<img>` preview.

2. **Plant Validation (P1):** Before engaging the neural network, the image is drawn onto a hidden 100×100 canvas. The `isPlantLike()` function performs per-pixel RGB→HSL conversion and counts plant-colored pixels (green, yellow-brown, dark-green ranges). If the plant-color ratio falls below 10%, the inference pipeline is short-circuited and a "No Leaf Detected" card is displayed.

3. **Tensor Construction (P2):** The validated `HTMLImageElement` enters the `preprocessImage()` function within a `tf.tidy()` memory scope. `tf.browser.fromPixels()` converts the image to a `[H, W, 3]` integer tensor. `tf.image.resizeBilinear()` downsamples to `[224, 224, 3]`. Division by `255.0` normalizes to float range. `expandDims(0)` adds the batch axis, producing the final `[1, 224, 224, 3]` float32 tensor.

4. **Model Inference (P3):** The tensor is passed to `model.predict()`, which executes the YOLOv8n-cls forward pass on the WebGL backend. The output is a 1D probability distribution over 4 classes. The argmax index and its probability are extracted. If the maximum probability is below the 80% confidence threshold, the user receives a "Low Confidence" card requesting a better-quality image.

5. **Result Localization (P4):** The argmax index is used to look up the disease label from `CLASS_LABELS[index][currentLang]` and the remedy from `REMEDIES[classId][currentLang]`. The entire result card HTML — including confidence bar, remedy bullets, SMS bridge, and market linkage — is assembled from localized strings and injected into the DOM.

6. **SMS Dispatch (P5):** When the farmer enters their 10-digit phone number and clicks "Send SMS to Expert":
   - **Online Path:** `navigator.onLine === true` → `fetch()` POSTs the JSON payload `{ disease, confidence, phone, lang }` to the Express backend at `https://agriscan-backend-6iar.onrender.com/send-alert`. The backend formats a ≤ 160-character SMS, initializes the Twilio client from environment variables, and dispatches the message. The client displays a permanent "Alert Sent" confirmation.
   - **Offline Path:** `navigator.onLine === false` (or `fetch()` throws a network error) → `SyncQueue.enqueue()` writes the payload to the IndexedDB `sms_queue` store with `status: 'pending'`. A notification banner informs the farmer that the alert is queued. When connectivity resumes, the `window.addEventListener('online')` handler triggers `SyncQueue.flush()`, which iterates over all pending records, POSTs each to the backend, and marks successful deliveries as `status: 'sent'`.

7. **Expert Notification:** The KVK agronomist receives the SMS on their phone: `"AgriScan: Bacterial Spot (92.3%). Farmer: 9876543210. Loc: N/A. Call now."` They can then contact the farmer directly for follow-up advisory.

---

*End of Software Requirements Specification — Document Revision 2.0*
