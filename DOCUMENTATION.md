# AgriScan - Complete Technical Documentation

> **AI-Powered Tomato Disease Diagnosis PWA**  
> Version: v27 | Last Updated: 2026-02-07

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Features](#features)
5. [Pages & Sections](#pages--sections)
6. [Routes & Navigation](#routes--navigation)
7. [Data Schemas](#data-schemas)
8. [Core Implementation Details](#core-implementation-details)
9. [AI Model Integration](#ai-model-integration)
10. [Service Worker & Offline Support](#service-worker--offline-support)
11. [Internationalization (i18n)](#internationalization-i18n)
12. [Design System](#design-system)
13. [Configuration & Constants](#configuration--constants)
14. [API Reference](#api-reference)

---

## Project Overview

**AgriScan** is an offline-first Progressive Web Application (PWA) designed for rural farmers to diagnose tomato crop diseases using AI. The application runs entirely in the browser using TensorFlow.js, requiring no server-side processing after initial load.

### Key Highlights

| Feature | Description |
|---------|-------------|
| **Offline-First** | Full functionality without internet after initial cache |
| **AI-Powered** | YOLOv8 classification model converted to TensorFlow.js |
| **Bilingual** | English & Hindi language support |
| **PWA Installable** | Can be installed as a standalone app on mobile devices |
| **No Backend** | All processing happens client-side |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER DEVICE                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Browser/PWA                        │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │           Presentation Layer                   │  │   │
│  │  │  ┌─────────┐  ┌──────────┐  ┌─────────────┐   │  │   │
│  │  │  │ Navbar  │  │  Hero    │  │  Diagnosis  │   │  │   │
│  │  │  └─────────┘  └──────────┘  │    Tool     │   │  │   │
│  │  │  ┌─────────┐  ┌──────────┐  └─────────────┘   │  │   │
│  │  │  │How it   │  │  Result  │  ┌─────────────┐   │  │   │
│  │  │  │ Works   │  │   Card   │  │   Footer    │   │  │   │
│  │  │  └─────────┘  └──────────┘  └─────────────┘   │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │             Application Layer                  │  │   │
│  │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  │  │   │
│  │  │  │  Image    │  │   AI      │  │   i18n    │  │  │   │
│  │  │  │ Handler   │  │ Predictor │  │  Engine   │  │  │   │
│  │  │  └───────────┘  └───────────┘  └───────────┘  │  │   │
│  │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  │  │   │
│  │  │  │  Color    │  │  Result   │  │  Scroll   │  │  │   │
│  │  │  │  Filter   │  │ Renderer  │  │   Spy     │  │  │   │
│  │  │  └───────────┘  └───────────┘  └───────────┘  │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │              AI/ML Layer                       │  │   │
│  │  │  ┌─────────────────────────────────────────┐  │  │   │
│  │  │  │          TensorFlow.js Runtime          │  │  │   │
│  │  │  │    ┌─────────────────────────────┐      │  │  │   │
│  │  │  │    │  YOLOv8 Classification      │      │  │  │   │
│  │  │  │    │  (model.json + shards)      │      │  │  │   │
│  │  │  │    └─────────────────────────────┘      │  │  │   │
│  │  │  └─────────────────────────────────────────┘  │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │              Service Worker                    │  │   │
│  │  │        (Network-First Caching Strategy)        │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
d:\initial\
├── index.html              # Main HTML (157 lines) - Page structure & semantic sections
├── app.js                  # Core logic (657 lines) - AI, i18n, UI handlers
├── style.css               # Styling (925 lines) - Complete Stillpoint design system
├── service-worker.js       # PWA caching (64 lines) - Network-first strategy
├── manifest.json           # PWA config (17 lines) - Installability settings
├── fav.png                 # Favicon (51KB)
├── DEVELOPER_LOG.md        # Developer reference guide
├── model/
│   ├── model.json          # TensorFlow.js model topology (61KB)
│   ├── group1-shard1of2.bin # Model weights (4MB)
│   ├── group1-shard2of2.bin # Model weights (1.5MB)
│   └── metadata.yaml       # Model metadata
└── .git/                   # Version control
```

### File Responsibilities

| File | Purpose | Key Functions |
|------|---------|---------------|
| `index.html` | Page structure | Semantic HTML5, accessibility, SEO meta tags |
| `app.js` | Application logic | AI inference, translations, event handlers |
| `style.css` | Visual presentation | Design tokens, animations, responsive layout |
| `service-worker.js` | Offline support | Cache management, network interception |
| `manifest.json` | PWA metadata | App name, icons, display mode |
| `model/` | AI model | YOLOv8 classification weights |

---

## Features

### 1. AI-Powered Disease Detection

**Implementation Location:** `app.js` lines 275-312

```javascript
// Core prediction flow
async function predict(imgElement) {
    const inputTensor = preprocessImage(imgElement);
    const predictions = await model.predict(inputTensor);
    const probabilities = await predictions.data();
    // Returns: { classIndex, classLabel, confidence, rawConfidence }
}
```

**How it works:**
1. User uploads an image via `<input type="file" accept="image/*">`
2. Image is loaded into a JavaScript `Image` object
3. **Pre-filter stage**: `isPlantLike()` checks if image contains plant colors (green/yellow/brown)
4. Image is preprocessed: resized to 224×224, normalized by /255.0
5. TensorFlow.js model runs inference
6. Softmax output gives probability for each of 4 classes
7. Highest probability class is selected
8. **Confidence filter**: Must exceed 80% threshold
9. Result card is rendered with diagnosis and remedies

---

### 2. Plant Color Pre-Filter

**Implementation Location:** `app.js` lines 197-245

```javascript
function isPlantLike(imgElement) {
    // Creates hidden canvas for pixel analysis
    // Checks HSL values for plant-like colors
    // Returns: true if >= 10% pixels are plant-colored
}
```

**Color Detection Logic:**
- **Green detection**: Hue 40-180°, Saturation > 8%, Lightness 5-95%
- **Yellow/Brown detection**: Hue 15-60°, Lightness 5-90%
- **Dark Green detection**: Hue 60-180°, Lightness 2-40%

**Threshold:** `PLANT_COLOR_THRESHOLD = 0.10` (10% of pixels)

---

### 3. Bilingual Support (English/Hindi)

**Implementation Location:** `app.js` lines 72-141

```javascript
const translations = {
    en: {
        'nav-home': 'Home',
        'hero-title': 'Save Your Harvest from Disease.',
        // ... 35+ translation keys
    },
    hi: {
        'nav-home': 'होम',
        'hero-title': 'अपनी फसल को बीमारी से बचाएं।',
        // ... 35+ translation keys (Hindi)
    }
};
```

**How Translation Works:**
1. HTML elements have `data-i18n="key"` attributes
2. Language selector triggers `updateLanguageUI()`
3. Function iterates all `[data-i18n]` elements
4. Updates `innerText` with translated strings
5. Language preference stored in `currentLang` variable

---

### 4. SMS Bridge (Offline Expert Support)

**Implementation Location:** `app.js` lines 460-462

```javascript
const smsText = `${t.alertPrefix}: ${diagnosisDisplay} ${t.detected}...`;
const smsHref = `sms:18001801551?body=${encodeURIComponent(smsText)}`;
```

**Features:**
- Pre-formatted SMS with diagnosis details
- Links to Kisan Call Center helpline (1800-180-1551)
- Localized message content (English/Hindi)
- One-tap SMS sending via `sms:` URI scheme

---

### 5. Market Linkage (Nearby Shops)

**Implementation Location:** `app.js` lines 64-69

```javascript
const MOCK_SHOPS = [
    { name: "Ramesh Krishi Kendra", dist: "1.2 km", stock: true },
    { name: "Global Agri Store", dist: "3.5 km", stock: false },
    { name: "Village Co-op Society", dist: "0.8 km", stock: true }
];
```

**Display Logic:**
- Shows shops selling recommended medicine
- Color-coded stock status (green=in-stock, red=out-of-stock)
- Distance information for each shop

---

### 6. Offline Support (Service Worker)

**Implementation Location:** `service-worker.js`

```javascript
// Network-First Strategy
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Cache successful network responses
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // Fall back to cache when offline
                return caches.match(event.request);
            })
    );
});
```

**Cached Assets:**
```javascript
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];
```

**Cache Version Management:**
- Current version: `agriscan-v40`
- Old caches automatically deleted on activation
- Increment version after CSS/JS changes

---

### 7. Responsive Mobile Design

**Implementation Location:** `style.css` lines 786-925

**Breakpoints:**
- `768px`: Tablet/Mobile breakpoint
- `480px`: Small mobile breakpoint

**Mobile Features:**
- Hamburger menu for navigation
- Full-width cards and sections
- Touch-friendly targets (minimum 44×44px)
- Single-column grid layout

---

### 8. Scroll Animations (Reveal on Scroll)

**Implementation Location:** `app.js` lines 624-634

```javascript
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => {
    revealObserver.observe(el);
});
```

**CSS Animation:**
```css
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

## Pages & Sections

The application is a **Single Page Application (SPA)** with the following sections:

### Section 1: Navigation Bar
**Element:** `<nav class="navbar">`  
**ID:** None (sticky positioned)

| Component | Implementation |
|-----------|----------------|
| Brand logo | `<a id="brand-logo">AgriScan</a>` |
| Nav links | Home, About, Diagnose (anchor links) |
| Language selector | `<select id="lang-select">` with EN/HI options |
| Login button | Ghost button (placeholder) |
| Hamburger menu | Mobile-only toggle button |

---

### Section 2: Hero Header
**Element:** `<header class="hero-header" id="home">`

| Component | Purpose |
|-----------|---------|
| Eyebrow text | "AI-Powered Diagnostics" |
| Main headline | "Precision Diagnosis for Your *Harvest*" |
| Subheadline | App value proposition |
| CTA buttons | "Begin Analysis" + "Learn More" |

---

### Section 3: How it Works
**Element:** `<section id="how-it-works">`

**2×2 Grid Layout:**

| Step | Icon | Title | Description |
|------|------|-------|-------------|
| 1 | ⌖ | Capture | Photograph affected leaf |
| 2 | ✦ | Diagnosis | AI analysis |
| 3 | → | Remedy | Treatment recommendations |
| 4 | ◎ | Monitor | Track recovery |

---

### Section 4: Diagnosis Tool
**Element:** `<section id="diagnosis-tool">`

**Components:**
1. **Upload Zone** (`<label class="drop-zone">`)
   - Corner bracket styling via CSS ::before/::after
   - Floating arrow animation
   - Hidden file input

2. **Preview Container** (`<div id="preview-container">`)
   - Shows uploaded image
   - "Analyze Crop" button appears after upload

3. **Result Card** (dynamically generated)
   - Disease name with icon
   - Confidence bar
   - Remedy list
   - SMS Bridge section
   - Market Linkage section
   - "Start New Diagnosis" button

---

### Section 5: Footer
**Element:** `<footer>`

| Component | Purpose |
|-----------|---------|
| Copyright | "© 2026 AgriScan" |
| Status indicator | Online/Offline status with colored dot |

---

## Routes & Navigation

### Hash-Based Navigation

The app uses **anchor links with hash routing**:

| Route | Target Section | Nav Link |
|-------|----------------|----------|
| `#home` | Hero header | Home |
| `#how-it-works` | How it Works grid | About |
| `#diagnosis-tool` | Diagnosis section | Diagnose |

### Scroll Spy Implementation

**Location:** `app.js` lines 572-590

```javascript
window.addEventListener('scroll', () => {
    const sections = [
        { id: '#home', el: document.getElementById('home') },
        { id: '#diagnosis-tool', el: document.getElementById('diagnosis-tool') }
    ];
    
    sections.forEach(sec => {
        const rect = sec.el.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
            currentSection = sec.id;
        }
    });
    
    if (currentSection && window.location.hash !== currentSection) {
        history.replaceState(null, null, currentSection);
    }
});
```

---

## Data Schemas

### 1. Disease Class Labels Schema

**Location:** `app.js` lines 25-30

```javascript
const CLASS_LABELS = [
    { id: 'bacterial-spot', en: 'Bacterial Spot', hi: 'जीवाणु धब्बा' },
    { id: 'early-blight', en: 'Early Blight', hi: 'अगेती झुलसा' },
    { id: 'late-blight', en: 'Late Blight', hi: 'पछेती झुलसा' },
    { id: 'healthy', en: 'Healthy', hi: 'स्वस्थ' }
];
```

**Schema Definition:**
```typescript
interface ClassLabel {
    id: string;       // Machine-readable identifier
    en: string;       // English display name
    hi: string;       // Hindi display name
}
```

---

### 2. Remedies Schema

**Location:** `app.js` lines 33-50

```javascript
const REMEDIES = {
    'bacterial-spot': {
        en: { remedy: 'Apply copper-based bactericide...', advice: '...' },
        hi: { remedy: 'तांबा आधारित जीवाणुनाशक...', advice: '...' }
    },
    // ... other diseases
};
```

**Schema Definition:**
```typescript
interface RemedyData {
    remedy: string;   // Primary treatment instruction
    advice: string;   // Additional care advice
}

interface Remedies {
    [diseaseId: string]: {
        en: RemedyData;
        hi: RemedyData;
    }
}
```

---

### 3. Medicines Mapping Schema

**Location:** `app.js` lines 57-62

```javascript
const MEDICINES = {
    'Bacterial Spot': 'Copper Bactericide',
    'Early Blight': 'Mancozeb Fungicide',
    'Late Blight': 'Chlorothalonil',
    'Healthy': 'Organic Fertilizer (Maintenance)'
};
```

---

### 4. Shop Data Schema

**Location:** `app.js` lines 65-69

```javascript
const MOCK_SHOPS = [
    { name: string, dist: string, stock: boolean }
];
```

---

### 5. Prediction Result Schema

**Location:** `app.js` lines 301-306

```typescript
interface PredictionResult {
    classIndex: number;       // Index in CLASS_LABELS array
    classLabel: ClassLabel;   // Full label object
    confidence: string;       // Percentage string "98.5"
    rawConfidence: number;    // Raw probability 0.0-1.0
}
```

---

### 6. PWA Manifest Schema

**Location:** `manifest.json`

```json
{
    "name": "AgriScan - AI Tomato Doctor",
    "short_name": "AgriScan",
    "description": "Expert crop health diagnosis, anywhere, even offline.",
    "start_url": "./index.html",
    "display": "standalone",
    "background_color": "#f0f4f0",
    "theme_color": "#2e7d32",
    "icons": [
        {
            "src": "https://cdn-icons-png.flaticon.com/512/2910/2910768.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ]
}
```

---

## Core Implementation Details

### Image Upload Flow

```
┌──────────────┐     ┌───────────────┐     ┌──────────────────┐
│  User clicks │ --> │ File selected │ --> │ FileReader loads │
│  upload zone │     │ via <input>   │     │ as DataURL       │
└──────────────┘     └───────────────┘     └──────────────────┘
                                                   │
                                                   v
┌──────────────┐     ┌───────────────┐     ┌──────────────────┐
│ Result card  │ <-- │ AI prediction │ <-- │ Preview image +  │
│  displayed   │     │ runs          │     │ Analyze button   │
└──────────────┘     └───────────────┘     └──────────────────┘
```

**Code Path:**

1. **Event Listener** (`app.js:319-335`):
```javascript
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        previewContainer.innerHTML = `
            <img src="${event.target.result}" id="preview-img">
            <button id="analyze-btn">Analyze Crop</button>
        `;
    };
    reader.readAsDataURL(file);
});
```

2. **Analysis Trigger** (`app.js:338-533`):
```javascript
async function diagnoseCrop() {
    // 1. Check if model is loaded
    // 2. Run plant color pre-filter
    // 3. Run AI prediction
    // 4. Check confidence threshold
    // 5. Generate result HTML
    // 6. Replace diagnosis section content
}
```

---

### Model Loading Strategy

**Location:** `app.js` lines 147-169

```javascript
async function loadModel() {
    if (model || isModelLoading) return;  // Prevent duplicate loading
    isModelLoading = true;
    
    model = await tf.loadGraphModel('model/model.json');
    
    // Warm up with dummy prediction
    const warmupTensor = tf.zeros([1, 224, 224, 3]);
    await model.predict(warmupTensor);
    warmupTensor.dispose();
    
    isModelLoading = false;
}

// Auto-load on page init
loadModel();
```

---

### Image Preprocessing Pipeline

**Location:** `app.js` lines 175-191

```javascript
function preprocessImage(imgElement) {
    return tf.tidy(() => {
        // Step 1: Convert HTML image to tensor
        let tensor = tf.browser.fromPixels(imgElement);
        
        // Step 2: Resize to model input size
        tensor = tf.image.resizeBilinear(tensor, [224, 224]);
        
        // Step 3: Normalize to 0-1 range
        tensor = tensor.div(255.0);
        
        // Step 4: Add batch dimension [1, 224, 224, 3]
        tensor = tensor.expandDims(0);
        
        return tensor;
    });
}
```

---

## AI Model Integration

### Model Specifications

| Property | Value |
|----------|-------|
| Model Type | YOLOv8 Classification |
| Framework | TensorFlow.js (Graph Model) |
| Input Shape | `[1, 224, 224, 3]` (NHWC) |
| Output Shape | `[1, 4]` (Softmax probabilities) |
| Total Size | ~5.5 MB (model.json + 2 shards) |
| Converter | TensorFlow.js Converter v4.22.0 |

### Output Classes

| Index | Class | Treatment |
|-------|-------|-----------|
| 0 | Bacterial Spot | Copper-based bactericide |
| 1 | Early Blight | Mancozeb/Chlorothalonil |
| 2 | Late Blight | Metalaxyl/Ridomil |
| 3 | Healthy | No treatment |

### Inference Code

**Location:** `app.js` lines 275-312

```javascript
async function predict(imgElement) {
    if (!model) return null;
    
    const inputTensor = preprocessImage(imgElement);
    const predictions = await model.predict(inputTensor);
    const probabilities = await predictions.data();
    
    // Find max probability
    let maxProb = 0, maxIndex = 0;
    for (let i = 0; i < probabilities.length; i++) {
        if (probabilities[i] > maxProb) {
            maxProb = probabilities[i];
            maxIndex = i;
        }
    }
    
    // Cleanup
    inputTensor.dispose();
    predictions.dispose();
    
    return {
        classIndex: maxIndex,
        classLabel: CLASS_LABELS[maxIndex],
        confidence: (maxProb * 100).toFixed(1),
        rawConfidence: maxProb
    };
}
```

---

## Service Worker & Offline Support

### Cache Strategy: Network-First

```
┌────────────┐     ┌─────────────┐     ┌────────────┐
│  Browser   │ --> │  Network    │ --> │  Response  │
│  Request   │     │  (try)      │     │  + Cache   │
└────────────┘     └─────────────┘     └────────────┘
                         │
                    (if fails)
                         │
                         v
                   ┌─────────────┐     ┌────────────┐
                   │  Cache      │ --> │  Cached    │
                   │  (fallback) │     │  Response  │
                   └─────────────┘     └────────────┘
```

### Lifecycle Events

1. **Install Event** (`service-worker.js:11-19`):
   - Caches essential assets
   - Calls `skipWaiting()` for immediate activation

2. **Activate Event** (`service-worker.js:23-36`):
   - Deletes old cache versions
   - Calls `clients.claim()` to control all tabs

3. **Fetch Event** (`service-worker.js:40-62`):
   - Intercepts all GET requests
   - Tries network first, caches response
   - Falls back to cache if offline

### Offline Status UI

**Location:** `app.js` lines 596-608

```javascript
function updateOnlineStatus() {
    const statusText = document.querySelector('.status-text');
    const indicator = document.getElementById('offline-status');
    
    if (navigator.onLine) {
        statusText.textContent = translations[currentLang]['status-online'];
        indicator.classList.remove('offline');
    } else {
        statusText.textContent = translations[currentLang]['status-offline'];
        indicator.classList.add('offline');
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
```

---

## Internationalization (i18n)

### Translation System

**Implementation Strategy:** DOM-based with `data-i18n` attributes

**HTML Template:**
```html
<h1 data-i18n="hero-tagline">Precision Diagnosis for Your Harvest.</h1>
<button data-i18n="btn-start">Begin Analysis</button>
```

**Translation Update Function:**

```javascript
function updateLanguageUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.innerText = translations[currentLang][key];
        }
    });
}
```

### Translation Keys Reference

| Key | English | Hindi |
|-----|---------|-------|
| `nav-home` | Home | होम |
| `nav-about` | About | बारे में |
| `nav-contact` | Contact | संपर्क |
| `hero-tagline` | Precision Diagnosis for Your Harvest | अपनी फसल को बीमारी से बचाएं |
| `btn-start` | Begin Analysis | निदान शुरू करें |
| `btn-learn` | Learn More | और जानें |
| `analyzing` | Analyzing... | विश्लेषण किया जा रहा है... |
| `loading-model` | Loading AI Model... | AI मॉडल लोड हो रहा है... |
| `confidence` | Confidence | भरोसा |
| `label-remedy` | Remedy | उपाय |
| `btn-new` | Start New Diagnosis | नया निदान शुरू करें |
| `offline-active` | Offline Active | ऑफलाइन सक्रिय |
| `status-online` | Online | ऑनलाइन |
| `status-offline` | Offline | ऑफलाइन |

---

## Design System

### CSS Variables (Design Tokens)

**Location:** `style.css` lines 5-18

```css
:root {
    /* Backgrounds */
    --bg-paper: #F4F1EE;
    --bg-hover: #EBE7E4;
    --bg-white: #FFFFFF;
    
    /* Text */
    --text-black: #1C1C1C;
    --text-body: #4A4540;
    --text-muted: #7A7570;
    
    /* Accents */
    --accent-forest: #264639;
    --accent-olive: #6B7F4A;
    --accent-brick: #A85D4A;
    
    /* Border */
    --border-warm: #D1C7BD;
    
    /* Typography */
    --font-serif: 'Cormorant Garamond', Georgia, serif;
    --font-sans: 'Inter', -apple-system, sans-serif;
}
```

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-paper` | `#F4F1EE` | Main background |
| `--accent-forest` | `#264639` | Primary buttons, links |
| `--accent-olive` | `#6B7F4A` | Healthy status |
| `--accent-brick` | `#A85D4A` | Diseased status |
| `--border-warm` | `#D1C7BD` | All borders |

### Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headings | Cormorant Garamond | 300 | 2-5rem |
| Body | Inter | 400 | 1rem |
| Buttons | Inter | 400 | 0.8rem |
| Eyebrow | Inter | 400 | 0.75rem |

### Component Styles

**Buttons:**
```css
.primary-btn {
    background: var(--accent-forest);
    color: white;
    padding: 16px 32px;
    border-radius: 0;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

.ghost-btn {
    background: transparent;
    border: 1px solid var(--accent-forest);
}
```

**Cards:**
```css
.tool-card {
    background: #F9F7F5;
    padding: 60px;
    border: 1px solid #D1C7BD;
    border-radius: 0;
}
```

---

## Configuration & Constants

### Thresholds

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| `CONFIDENCE_THRESHOLD` | `0.80` | `app.js:19` | Minimum confidence for valid diagnosis |
| `PLANT_COLOR_THRESHOLD` | `0.10` | `app.js:22` | Minimum plant pixels ratio |
| `CACHE_NAME` | `'agriscan-v40'` | `service-worker.js:1` | Cache version identifier |

### Model Configuration

| Setting | Value |
|---------|-------|
| Input Size | 224 × 224 pixels |
| Normalization | Divide by 255.0 |
| Batch Size | 1 |
| Output Classes | 4 |

---

## API Reference

### Global State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `model` | `tf.GraphModel | null` | Loaded TensorFlow.js model |
| `currentLang` | `'en' | 'hi'` | Current UI language |
| `currentResult` | `PredictionResult | null` | Last prediction result |
| `isModelLoading` | `boolean` | Model loading flag |

### Core Functions

#### `loadModel()`
**Async** - Loads TensorFlow.js model

```javascript
await loadModel();
// model variable is now populated
```

#### `preprocessImage(imgElement)`
**Sync** - Converts image to model input tensor

```javascript
const tensor = preprocessImage(document.getElementById('preview-img'));
// Returns: tf.Tensor4D [1, 224, 224, 3]
```

#### `isPlantLike(imgElement)`
**Sync** - Checks if image contains plant colors

```javascript
const valid = isPlantLike(imgElement);
// Returns: boolean
```

#### `predict(imgElement)`
**Async** - Runs model inference

```javascript
const result = await predict(imgElement);
// Returns: { classIndex, classLabel, confidence, rawConfidence }
```

#### `diagnoseCrop()`
**Async** - Complete diagnosis workflow

```javascript
await diagnoseCrop();
// Updates UI with result card
```

#### `updateLanguageUI()`
**Sync** - Updates all translated elements

```javascript
currentLang = 'hi';
updateLanguageUI();
// All data-i18n elements now show Hindi text
```

#### `updateOnlineStatus()`
**Sync** - Updates online/offline indicator

```javascript
updateOnlineStatus();
// Footer status indicator updated
```

---

## Important Notes for Developers

> [!IMPORTANT]
> **Offline-First Priority**: Never introduce CDN dependencies that break offline functionality. All critical resources must be cached by the service worker.

> [!WARNING]
> **Cache Versioning**: Always increment `CACHE_NAME` in `service-worker.js` after modifying `style.css` or `app.js`. Users may see stale content otherwise.

> [!TIP]
> **Testing Offline**: Run with `npx http-server ./ -p 8080`, then toggle offline in DevTools. Refresh twice to ensure service worker is activated.

> [!NOTE]
> **Model Loading**: The TensorFlow.js model (~5.5MB) loads automatically on page init. First load may take 2-5 seconds depending on device.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v27 | 2026-02-07 | Responsive mobile header with hamburger menu |
| v40 (cache) | 2026-02-07 | Updated service worker cache version |

---

*Documentation generated for AgriScan PWA *
