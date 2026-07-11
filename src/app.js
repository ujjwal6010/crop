// =============================================
// AgriScan — AI Crop Diagnostic Engine
// src/app.js — Client Application Logic
//
// Refactored: July 2026
// Architecture: Edge-AI PWA with IndexedDB Sync Queue
// Model: YOLOv8n-cls (TF.js GraphModel, 224×224×3)
// MSME Udyam: UDYAM-HR-06-0087998 | NIC: 62011
// =============================================

// =============================================
// §1. INDEXEDDB SYNC QUEUE MODULE
// Offline-resilient SMS alert persistence layer.
// When network is unavailable, payloads are written
// to a local IndexedDB store and auto-flushed when
// connectivity resumes via the 'online' event.
// =============================================

const SyncQueue = (() => {
    const DB_NAME = 'AgriScanSyncDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'sms_queue';
    const BACKEND_ENDPOINT = 'https://agriscan-backend-6iar.onrender.com/send-alert';

    let _db = null;

    /**
     * Opens (or creates) the IndexedDB database.
     * @returns {Promise<IDBDatabase>}
     */
    function openDB() {
        return new Promise((resolve, reject) => {
            if (_db) { resolve(_db); return; }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                    console.log('[SyncQueue] IndexedDB store created:', STORE_NAME);
                }
            };

            request.onsuccess = (event) => {
                _db = event.target.result;
                console.log('[SyncQueue] IndexedDB opened successfully');
                resolve(_db);
            };

            request.onerror = (event) => {
                console.error('[SyncQueue] IndexedDB open failed:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Enqueues an SMS alert payload into IndexedDB.
     * @param {Object} payload - { disease, confidence, phone, lang, remedy }
     * @returns {Promise<number>} The auto-generated record ID.
     */
    async function enqueue(payload) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            const record = {
                timestamp: new Date().toISOString(),
                status: 'pending',
                retries: 0,
                payload: payload
            };

            const request = store.add(record);
            request.onsuccess = () => {
                console.log('[SyncQueue] Payload queued with ID:', request.result);
                resolve(request.result);
            };
            request.onerror = () => {
                console.error('[SyncQueue] Failed to enqueue:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Retrieves all pending records from the sync store.
     * @returns {Promise<Array>}
     */
    async function getPending() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const index = store.index('status');
            const request = index.getAll('pending');

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Marks a record as sent (removes from pending queue).
     * @param {number} id - Record key.
     */
    async function markSent(id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const getReq = store.get(id);

            getReq.onsuccess = () => {
                const record = getReq.result;
                if (record) {
                    record.status = 'sent';
                    record.sentAt = new Date().toISOString();
                    const putReq = store.put(record);
                    putReq.onsuccess = () => resolve();
                    putReq.onerror = () => reject(putReq.error);
                } else {
                    resolve(); // Already gone
                }
            };
            getReq.onerror = () => reject(getReq.error);
        });
    }

    /**
     * Attempts to flush all pending records to the backend.
     * Called automatically when the browser comes online.
     * @returns {Promise<{sent: number, failed: number}>}
     */
    async function flush() {
        const pending = await getPending();
        if (pending.length === 0) {
            console.log('[SyncQueue] No pending items to flush');
            return { sent: 0, failed: 0 };
        }

        console.log(`[SyncQueue] Flushing ${pending.length} queued alert(s)...`);
        let sent = 0;
        let failed = 0;

        for (const record of pending) {
            try {
                const response = await fetch(BACKEND_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record.payload)
                });

                if (response.ok) {
                    await markSent(record.id);
                    sent++;
                    console.log(`[SyncQueue] Sent queued alert ID ${record.id}`);
                } else {
                    failed++;
                    console.warn(`[SyncQueue] Server rejected alert ID ${record.id}: ${response.status}`);
                }
            } catch (err) {
                failed++;
                console.warn(`[SyncQueue] Network error flushing ID ${record.id}:`, err.message);
            }
        }

        console.log(`[SyncQueue] Flush complete: ${sent} sent, ${failed} failed`);
        return { sent, failed };
    }

    /**
     * Returns the count of pending (unsent) records.
     * @returns {Promise<number>}
     */
    async function pendingCount() {
        const pending = await getPending();
        return pending.length;
    }

    // Initialize the database on module load
    openDB().catch((err) => {
        console.warn('[SyncQueue] Initial DB open deferred:', err.message);
    });

    return { enqueue, flush, pendingCount, getPending };
})();

// =============================================
// §2. AUTO-FLUSH: Network Reconnection Listener
// When the browser transitions from offline → online,
// the sync queue is automatically flushed.
// =============================================

window.addEventListener('online', async () => {
    console.log('[Network] Connectivity restored — flushing sync queue');
    try {
        const result = await SyncQueue.flush();
        if (result.sent > 0) {
            showSyncNotification(
                `✅ ${result.sent} queued alert(s) sent successfully.`,
                'success'
            );
        }
    } catch (err) {
        console.error('[Network] Flush error on reconnect:', err);
    }
});

/**
 * Displays a transient notification banner at the top of the viewport.
 * Used to inform the user about sync queue activity.
 */
function showSyncNotification(message, type) {
    const existing = document.getElementById('sync-notification');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'sync-notification';
    banner.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; z-index: 10000;
        padding: 14px 20px; text-align: center;
        font-family: 'Inter', sans-serif; font-size: 0.85rem;
        letter-spacing: 0.02em; transition: opacity 0.5s ease;
        background: ${type === 'success' ? '#2d4a22' : type === 'warning' ? '#e67e22' : '#c0392b'};
        color: #ffffff;
    `;
    banner.textContent = message;
    document.body.prepend(banner);

    setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 500);
    }, 4000);
}

// =============================================
// §3. APP LOADING SCREEN
// =============================================

window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }, 1000);
});

// =============================================
// §4. DOM ELEMENT REFERENCES
// =============================================

const imageUpload = document.getElementById('imageUpload');
const previewContainer = document.getElementById('preview-container');
const diagnosisTool = document.getElementById('diagnosis-tool');
const homeSection = document.getElementById('home');

// =============================================
// §5. MODEL & APPLICATION STATE
// =============================================

let model = null;
let currentLang = 'en';
let currentResult = null;
let isModelLoading = false;

// Confidence Threshold (minimum for valid diagnosis)
const CONFIDENCE_THRESHOLD = 0.80; // 80%

// Plant Color Detection Threshold
const PLANT_COLOR_THRESHOLD = 0.10; // 10% of pixels must be plant-like

// Class Labels (YOLOv8 output index → disease name)
const CLASS_LABELS = [
    { id: 'bacterial-spot', en: 'Bacterial Spot', hi: 'जीवाणु धब्बा', pu: 'ਬੈਕਟੀਰੀਆ ਦਾ ਧੱਬਾ' },
    { id: 'early-blight', en: 'Early Blight', hi: 'अगेती झुलसा', pu: 'ਅਗੇਤੀ ਝੁਲਸ' },
    { id: 'late-blight', en: 'Late Blight', hi: 'पछेती झुलसा', pu: 'ਪਛੇਤੀ ਝੁਲਸ' },
    { id: 'healthy', en: 'Healthy', hi: 'स्वस्थ', pu: 'ਸਿਹਤਮੰਦ' }
];

// Remedies for each class
const REMEDIES = {
    'bacterial-spot': {
        en: { remedy: 'Apply copper-based bactericide. Remove infected leaves immediately.', advice: 'Avoid overhead watering.' },
        hi: { remedy: 'तांबा आधारित जीवाणुनाशक का प्रयोग करें। संक्रमित पत्तियों को तुरंत हटा दें।', advice: 'ऊपर से पानी देने से बचें।' },
        pu: { remedy: 'ਤਾਂਬੇ-ਅਧਾਰਿਤ ਬੈਕਟੀਰੀਆਨਾਸ਼ਕ ਲਗਾਓ। ਪ੍ਰਭਾਵਿਤ ਪੱਤੇ ਤੁਰੰਤ ਹਟਾਓ।', advice: 'ਉੱਪਰੋਂ ਪਾਣੀ ਦੇਣ ਤੋਂ ਬਚੋ।' }
    },
    'early-blight': {
        en: { remedy: 'Use Mancozeb or Chlorothalonil fungicide.', advice: 'Ensure proper spacing between plants. Remove infected debris.' },
        hi: { remedy: 'मैन्कोज़ेब या क्लोरोथालोनिल कवकनाशी का प्रयोग करें।', advice: 'पौधों के बीच उचित दूरी सुनिश्चित करें।' },
        pu: { remedy: 'ਮੈਨਕੋਜ਼ੇਬ ਜਾਂ ਕਲੋਰੋਥਲੋਨਿਲ ਉੱਲੀਨਾਸ਼ਕ ਵਰਤੋ।', advice: 'ਪੌਦਿਆਂ ਵਿਚਕਾਰ ਸਹੀ ਦੂਰੀ ਰੱਖੋ।' }
    },
    'healthy': {
        en: { remedy: 'No treatment needed. Your crop is healthy!', advice: 'Continue regular monitoring and maintain good agricultural practices.' },
        hi: { remedy: 'कोई उपचार आवश्यक नहीं। आपकी फसल स्वस्थ है!', advice: 'नियमित निगरानी जारी रखें।' },
        pu: { remedy: 'ਕੋਈ ਇਲਾਜ ਦੀ ਲੋੜ ਨਹੀਂ। ਤੁਹਾਡੀ ਫ਼ਸਲ ਸਿਹਤਮੰਦ ਹੈ!', advice: 'ਨਿਯਮਿਤ ਨਿਗਰਾਨੀ ਜਾਰੀ ਰੱਖੋ।' }
    },
    'late-blight': {
        en: { remedy: 'Apply Metalaxyl or Ridomil fungicide immediately.', advice: 'Destroy infected plants to prevent spread. Avoid excess moisture.' },
        hi: { remedy: 'तुरंत मेटालैक्सिल या रिडोमिल कवकनाशी का प्रयोग करें।', advice: 'प्रसार रोकने के लिए संक्रमित पौधों को नष्ट करें।' },
        pu: { remedy: 'ਤੁਰੰਤ ਮੈਟਾਲੈਕਸਿਲ ਜਾਂ ਰਿਡੋਮਿਲ ਉੱਲੀਨਾਸ਼ਕ ਲਗਾਓ।', advice: 'ਫੈਲਾਅ ਰੋਕਣ ਲਈ ਪ੍ਰਭਾਵਿਤ ਪੌਦਿਆਂ ਨੂੰ ਨਸ਼ਟ ਕਰੋ।' }
    }
};

// =============================================
// §6. SMS BRIDGE & MARKET LINKAGE DATA
// =============================================

// Recommended Medicines based on Diagnosis
const MEDICINES = {
    'Bacterial Spot': 'Copper Bactericide',
    'Early Blight': 'Mancozeb Fungicide',
    'Late Blight': 'Chlorothalonil',
    'Healthy': 'Organic Fertilizer (Maintenance)'
};

// Agrochemical Shop Database (Haryana / Punjab / NCR region)
// Each entry has GPS coordinates for distance-based sorting
const AGRI_SHOPS_DB = [
    // Hisar District
    { name: "Hisar Krishi Seva Kendra", lat: 29.1492, lng: 75.7217, stock: true, area: "Hisar" },
    { name: "Bharat Agro Chemicals", lat: 29.1530, lng: 75.7280, stock: true, area: "Hisar" },
    { name: "Sharma Beej Bhandar", lat: 29.1450, lng: 75.7150, stock: false, area: "Hisar" },
    { name: "Kisan Seva Kendra, Sector 14", lat: 29.1560, lng: 75.7230, stock: true, area: "Hisar" },
    // Karnal District
    { name: "Karnal Krishi Kendra", lat: 29.6857, lng: 76.9905, stock: true, area: "Karnal" },
    { name: "Jai Kisan Agro Store", lat: 29.6900, lng: 76.9850, stock: true, area: "Karnal" },
    { name: "Punjab Pesticides, Karnal", lat: 29.6830, lng: 76.9950, stock: false, area: "Karnal" },
    // Ludhiana District
    { name: "Ludhiana Agri Mart", lat: 30.9010, lng: 75.8573, stock: true, area: "Ludhiana" },
    { name: "Punjab Kisan Store", lat: 30.9050, lng: 75.8610, stock: true, area: "Ludhiana" },
    { name: "Gill Road Pesticides", lat: 30.8980, lng: 75.8500, stock: false, area: "Ludhiana" },
    // Patiala District
    { name: "Patiala Agro Centre", lat: 30.3398, lng: 76.3869, stock: true, area: "Patiala" },
    { name: "Royal Kisan Bhandar", lat: 30.3350, lng: 76.3900, stock: true, area: "Patiala" },
    // Ambala District
    { name: "Ambala Krishi Dukan", lat: 30.3782, lng: 76.7767, stock: true, area: "Ambala" },
    { name: "Green Fields Agro", lat: 30.3750, lng: 76.7800, stock: false, area: "Ambala" },
    // Chandigarh / Mohali
    { name: "CHD Agri Solutions", lat: 30.7333, lng: 76.7794, stock: true, area: "Chandigarh" },
    { name: "Mohali Farm Store", lat: 30.7046, lng: 76.7179, stock: true, area: "Mohali" },
    // Kurukshetra
    { name: "Kurukshetra Beej Bhandar", lat: 29.9695, lng: 76.8783, stock: true, area: "Kurukshetra" },
    // Sirsa
    { name: "Sirsa Kisan Kendra", lat: 29.5340, lng: 75.0260, stock: true, area: "Sirsa" },
    // Panipat
    { name: "Panipat Agro Traders", lat: 29.3909, lng: 76.9635, stock: true, area: "Panipat" },
    // Rohtak
    { name: "Rohtak Krishi Bazar", lat: 28.8955, lng: 76.6066, stock: true, area: "Rohtak" },
];

// Haversine formula — distance between two GPS coordinates in km
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// User's last known position (updated by Geolocation API)
let userLat = null;
let userLng = null;

// Request location on page load
if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            userLat = pos.coords.latitude;
            userLng = pos.coords.longitude;
            console.log(`[Geo] Location acquired: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`);
        },
        (err) => {
            console.warn('[Geo] Location denied or unavailable:', err.message);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
}

/**
 * Returns the 3 nearest shops sorted by distance.
 * If geolocation is unavailable, returns the first 3 shops with area label.
 */
function getNearbyShops() {
    if (userLat !== null && userLng !== null) {
        // Calculate distances and sort
        const withDistance = AGRI_SHOPS_DB.map(shop => ({
            ...shop,
            dist: haversineDistance(userLat, userLng, shop.lat, shop.lng)
        }));
        withDistance.sort((a, b) => a.dist - b.dist);
        return withDistance.slice(0, 3).map(shop => ({
            name: shop.name,
            dist: shop.dist < 1
                ? `${(shop.dist * 1000).toFixed(0)} m`
                : `${shop.dist.toFixed(1)} km`,
            stock: shop.stock,
            area: shop.area
        }));
    }
    // Fallback: return first 3 with area info
    return AGRI_SHOPS_DB.slice(0, 3).map(shop => ({
        name: shop.name,
        dist: shop.area,
        stock: shop.stock,
        area: shop.area
    }));
}

// =============================================
// §7. SMS GATEWAY FUNCTION (Twilio Backend)
// Dual-State: Online → POST to Express backend.
//             Offline → Queue in IndexedDB, alert user.
// =============================================

async function triggerTwistOption(disease, confidence, fallbackSmsHref) {
    const btn = document.getElementById('sms-gateway-btn');
    const btnText = document.getElementById('sms-btn-text');

    if (!btn || !btnText) return;

    // Store original state for reset
    const originalText = btnText.textContent;
    const originalBg = btn.style.background;
    const originalColor = btn.style.color;

    // i18n translations for button states
    const stateText = {
        loading: {
            en: '📡 Connecting to Gateway...',
            hi: '📡 गेटवे से कनेक्ट हो रहा है...',
            pu: '📡 ਗੇਟਵੇ ਨਾਲ ਜੁੜ ਰਿਹਾ ਹੈ...'
        },
        success: {
            en: '✅ Alert Sent to KVK Expert',
            hi: '✅ अलर्ट KVK विशेषज्ञ को भेजा गया',
            pu: '✅ ਮਾਹਰ ਨੂੰ ਅਲਰਟ ਭੇਜਿਆ ਗਿਆ'
        },
        queued: {
            en: '📥 Queued — Will send when online',
            hi: '📥 कतार में — ऑनलाइन होने पर भेजा जाएगा',
            pu: '📥 ਕਤਾਰ ਵਿੱਚ — ਆਨਲਾਈਨ ਹੋਣ ਤੇ ਭੇਜਿਆ ਜਾਵੇਗਾ'
        },
        fallback: {
            en: '⚠️ Opened Manual SMS',
            hi: '⚠️ मैनुअल एसएमएस खुला',
            pu: '⚠️ ਮੈਨੂਅਲ SMS ਖੋਲ੍ਹਿਆ ਗਿਆ'
        }
    };

    // Step 1: Get phone from embedded input field
    const phoneInput = document.getElementById('farmer-phone');
    const farmerPhone = phoneInput ? phoneInput.value.trim() : '';

    // Strict Validation: Must be exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    const phoneError = document.getElementById('phone-error');

    if (!phoneRegex.test(farmerPhone)) {
        if (phoneInput) {
            phoneInput.style.border = '1px solid #d32f2f';
            phoneInput.classList.add('shake');
            setTimeout(() => phoneInput.classList.remove('shake'), 500);
            phoneInput.focus();
        }
        if (phoneError) {
            phoneError.textContent = currentLang === 'pu'
                ? 'ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਵੈਧ 10-ਅੰਕਾਂ ਵਾਲਾ ਨੰਬਰ ਦਰਜ ਕਰੋ'
                : currentLang === 'hi'
                    ? 'कृपया एक मान्य 10-अंकीय नंबर दर्ज करें'
                    : 'Please enter a valid 10-digit number';
            phoneError.style.display = 'block';
        }
        return;
    }

    // Reset input styling on valid entry
    if (phoneInput) phoneInput.style.border = '1px solid #ddd';
    if (phoneError) phoneError.style.display = 'none';

    // Build the SMS payload
    const smsPayload = {
        disease: disease,
        confidence: confidence,
        phone: farmerPhone,
        lang: currentLang
    };

    // Step 2: Disable button and show Loading State
    btn.disabled = true;
    btnText.textContent = stateText.loading[currentLang] || stateText.loading.en;
    btn.style.background = '#e0e0e0';
    btn.style.color = '#333';

    // ── OFFLINE PATH: Queue in IndexedDB ──
    if (!navigator.onLine) {
        try {
            await SyncQueue.enqueue(smsPayload);
            const queuedText = stateText.queued[currentLang] || stateText.queued.en;
            btn.innerHTML = `<span>${queuedText}</span>`;
            btn.style.background = '#e67e22';
            btn.style.color = '#ffffff';

            showSyncNotification(
                currentLang === 'hi'
                    ? '📥 आप ऑफलाइन हैं। अलर्ट कतार में सहेजा गया — ऑनलाइन होने पर स्वतः भेजा जाएगा।'
                    : currentLang === 'pu'
                        ? '📥 ਤੁਸੀਂ ਆਫਲਾਈਨ ਹੋ। ਅਲਰਟ ਕਤਾਰ ਵਿੱਚ ਸੇਵ ਹੋ ਗਿਆ — ਆਨਲਾਈਨ ਹੋਣ ਤੇ ਆਪਣੇ ਆਪ ਭੇਜਿਆ ਜਾਵੇਗਾ।'
                        : '📥 You are offline. Alert saved to queue — will auto-send when connectivity resumes.',
                'warning'
            );
        } catch (err) {
            console.error('[SMS] Failed to queue offline:', err);
            btnText.textContent = stateText.fallback[currentLang] || stateText.fallback.en;
            btn.style.background = '#c0392b';
            btn.style.color = '#ffffff';
        }
        return;
    }

    // ── ONLINE PATH: POST directly to Express backend ──
    try {
        const response = await fetch('https://agriscan-backend-6iar.onrender.com/send-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(smsPayload)
        });

        if (response.ok) {
            const checkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            const successText = currentLang === 'hi'
                ? 'अलर्ट KVK विशेषज्ञ को भेजा गया'
                : currentLang === 'pu'
                    ? 'ਮਾਹਰ ਨੂੰ ਅਲਰਟ ਭੇਜਿਆ ਗਿਆ'
                    : 'ALERT SENT TO KVK EXPERT';
            btn.innerHTML = `${checkSvg}<span>${successText}</span>`;
            btn.style.background = '#2d4a22';
            btn.style.color = '#ffffff';
            // Button stays disabled permanently
        } else {
            throw new Error('Server returned non-200 status');
        }

    } catch (error) {
        // Network request failed — queue in IndexedDB as fallback
        console.warn('[SMS] Gateway POST failed, queuing to IndexedDB:', error.message);

        try {
            await SyncQueue.enqueue(smsPayload);
            const queuedText = stateText.queued[currentLang] || stateText.queued.en;
            btn.innerHTML = `<span>${queuedText}</span>`;
            btn.style.background = '#e67e22';
            btn.style.color = '#ffffff';

            showSyncNotification(
                currentLang === 'hi'
                    ? '⚠️ सर्वर अनुपलब्ध। अलर्ट कतार में सहेजा गया।'
                    : currentLang === 'pu'
                        ? '⚠️ ਸਰਵਰ ਉਪਲਬਧ ਨਹੀਂ। ਅਲਰਟ ਕਤਾਰ ਵਿੱਚ ਸੇਵ ਹੋ ਗਿਆ।'
                        : '⚠️ Server unavailable. Alert queued locally — will retry automatically.',
                'warning'
            );
        } catch (queueErr) {
            console.error('[SMS] Both network and queue failed:', queueErr);
            btnText.textContent = stateText.fallback[currentLang] || stateText.fallback.en;
            btn.style.background = '#e67e22';
            btn.style.color = '#ffffff';

            setTimeout(() => {
                window.location.href = fallbackSmsHref;
                setTimeout(() => {
                    btn.disabled = false;
                    btnText.textContent = originalText;
                    btn.style.background = originalBg || '';
                    btn.style.color = originalColor || '';
                }, 3500);
            }, 500);
        }
    }
}

// =============================================
// §8. LOCALIZATION ENGINE
// Tri-lingual string matrix: English, Hindi, Punjabi
// =============================================

const translations = {
    en: {
        'nav-home': 'Home',
        'nav-about': 'About',
        'nav-contact': 'Contact',
        'hero-title': 'Save Your Harvest from Disease.',
        'hero-subtitle': 'Instant, offline crop diagnosis for rural farmers. Professional-grade AI support in your pocket.',
        'hero-cta': 'Start Diagnosis',
        'btn-learn': 'Learn More',
        'how-title': 'How it Works',
        'step1-title': 'Capture',
        'step1-desc': 'Photograph the affected crop leaf in natural lighting for optimal analysis.',
        'step2-title': 'Diagnosis',
        'step2-desc': 'Instant offline analysis powered by advanced AI recognition models.',
        'step3-title': 'Remedy',
        'step3-desc': 'Receive expert treatment plans tailored to your specific crop condition.',
        'step4-title': 'Monitor',
        'step4-desc': 'Track recovery progress over time with continuous health monitoring.',
        'diag-tool-title': 'Diagnosis Tool',
        'diag-tool-desc': 'Select or drag a clear photo of the infected leaf below.',
        'upload-btn-text': 'Upload Specimen',
        'btn-check': 'Analyze Crop',
        'analyzing': 'Analyzing...',
        'loading-model': 'Loading AI Model...',
        'confidence': 'Confidence',
        'label-remedy': 'Remedy',
        'btn-new': 'Start New Diagnosis',
        'offline-active': 'Offline Active',
        'status-online': 'Online',
        'status-offline': 'Offline',
        'footer': '© 2026 AgriScan — MSME Udyam UDYAM-HR-06-0087998',
        'btn-login': 'Login',
        'model-ready': 'AI Model Ready',
        'model-error': 'Model Error'
    },
    hi: {
        'nav-home': 'होम',
        'nav-about': 'बारे में',
        'nav-contact': 'संपर्क',
        'hero-title': 'अपनी फसल को बीमारी से बचाएं।',
        'hero-subtitle': 'ग्रामीण किसानों के लिए तत्काल, ऑफलाइन फसल निदान। आपकी जेब में पेशेवर-ग्रेड AI सहायता।',
        'hero-cta': 'निदान शुरू करें',
        'btn-learn': 'और जानें',
        'how-title': 'यह कैसे काम करता है',
        'step1-title': 'फोटो लें',
        'step1-desc': 'बेहतर विश्लेषण के लिए प्रभावित पत्ती की फोटो लें।',
        'step2-title': 'त्वरित विश्लेषण',
        'step2-desc': 'उन्नत AI मॉडल द्वारा संचालित त्वरित ऑफलाइन विश्लेषण।',
        'step3-title': 'उपाय पाएं',
        'step3-desc': 'अपनी फसल की स्थिति के अनुसार विशेषज्ञ उपचार प्राप्त करें।',
        'step4-title': 'निगरानी',
        'step4-desc': 'लगातार निगरानी के साथ समय के साथ सुधार को ट्रैक करें।',
        'diag-tool-title': 'निदान उपकरण',
        'diag-tool-desc': 'कृपया संक्रमित पत्ती की स्पष्ट फोटो चुनें।',
        'upload-btn-text': 'नमूना अपलोड करें',
        'btn-check': 'फसल का विश्लेषण करें',
        'analyzing': 'विश्लेषण किया जा रहा है...',
        'loading-model': 'AI मॉडल लोड हो रहा है...',
        'confidence': 'भरोसा',
        'label-remedy': 'उपाय',
        'btn-new': 'नया निदान शुरू करें',
        'offline-active': 'ऑफलाइन सक्रिय',
        'status-online': 'ऑनलाइन',
        'status-offline': 'ऑफलाइन',
        'footer': '© 2026 AgriScan — MSME उद्यम UDYAM-HR-06-0087998',
        'btn-login': 'लॉगिन',
        'model-ready': 'AI मॉडल तैयार',
        'model-error': 'मॉडल त्रुटि'
    },
    pu: {
        'nav-home': 'ਘਰ',
        'nav-about': 'ਬਾਰੇ',
        'nav-contact': 'ਜਾਂਚ ਕਰੋ',
        'hero-title': 'ਆਪਣੀ ਫ਼ਸਲ ਨੂੰ ਬਿਮਾਰੀ ਤੋਂ ਬਚਾਓ।',
        'hero-subtitle': 'ਪੇਂਡੂ ਕਿਸਾਨਾਂ ਲਈ ਤੁਰੰਤ, ਆਫਲਾਈਨ ਫ਼ਸਲ ਜਾਂਚ। ਤੁਹਾਡੀ ਜੇਬ ਵਿੱਚ ਪੇਸ਼ੇਵਰ-ਗ੍ਰੇਡ AI ਸਹਾਇਤਾ।',
        'hero-cta': 'ਜਾਂਚ ਸ਼ੁਰੂ ਕਰੋ',
        'btn-learn': 'ਹੋਰ ਜਾਣੋ',
        'how-title': 'ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ',
        'step1-title': 'ਫੋਟੋ ਖਿੱਚੋ',
        'step1-desc': 'ਬਿਹਤਰ ਵਿਸ਼ਲੇਸ਼ਣ ਲਈ ਪ੍ਰਭਾਵਿਤ ਪੱਤੇ ਦੀ ਫੋਟੋ ਖਿੱਚੋ।',
        'step2-title': 'ਤੁਰੰਤ ਵਿਸ਼ਲੇਸ਼ਣ',
        'step2-desc': 'ਉੱਨਤ AI ਮਾਡਲ ਦੁਆਰਾ ਸੰਚਾਲਿਤ ਤੁਰੰਤ ਆਫਲਾਈਨ ਵਿਸ਼ਲੇਸ਼ਣ।',
        'step3-title': 'ਉਪਾਅ ਪ੍ਰਾਪਤ ਕਰੋ',
        'step3-desc': 'ਆਪਣੀ ਫ਼ਸਲ ਦੀ ਸਥਿਤੀ ਅਨੁਸਾਰ ਮਾਹਰ ਇਲਾਜ ਪ੍ਰਾਪਤ ਕਰੋ।',
        'step4-title': 'ਨਿਗਰਾਨੀ',
        'step4-desc': 'ਲਗਾਤਾਰ ਨਿਗਰਾਨੀ ਨਾਲ ਸਮੇਂ ਦੇ ਨਾਲ ਸੁਧਾਰ ਨੂੰ ਟਰੈਕ ਕਰੋ।',
        'diag-tool-title': 'ਜਾਂਚ ਸੰਦ',
        'diag-tool-desc': 'ਕਿਰਪਾ ਕਰਕੇ ਪ੍ਰਭਾਵਿਤ ਪੱਤੇ ਦੀ ਸਾਫ਼ ਫੋਟੋ ਚੁਣੋ।',
        'upload-btn-text': 'ਨਮੂਨਾ ਅੱਪਲੋਡ ਕਰੋ',
        'btn-check': 'ਫ਼ਸਲ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰੋ',
        'analyzing': 'ਵਿਸ਼ਲੇਸ਼ਣ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ...',
        'loading-model': 'AI ਮਾਡਲ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...',
        'confidence': 'ਭਰੋਸਾ',
        'label-remedy': 'ਉਪਾਅ',
        'btn-new': 'ਨਵੀਂ ਜਾਂਚ ਸ਼ੁਰੂ ਕਰੋ',
        'offline-active': 'ਆਫਲਾਈਨ ਐਕਟਿਵ',
        'status-online': 'ਆਨਲਾਈਨ',
        'status-offline': 'ਆਫਲਾਈਨ',
        'footer': '© 2026 ਐਗਰੀਸਕੇਨ — MSME ਉਦਯਮ UDYAM-HR-06-0087998',
        'btn-login': 'ਲੌਗਇਨ',
        'model-ready': 'AI ਮਾਡਲ ਤਿਆਰ',
        'model-error': 'ਮਾਡਲ ਗਲਤੀ'
    }
};

// =============================================
// §9. TENSORFLOW.JS MODEL LOADING
// Loads from local /public/models/ (offline-safe)
// =============================================

async function loadModel() {
    if (model || isModelLoading) return;
    isModelLoading = true;

    try {
        console.log('[Model] Loading TensorFlow.js GraphModel from local store...');
        model = await tf.loadGraphModel('../models/model.json');
        console.log('[Model] Loaded successfully');

        // Warm up with a dummy prediction to pre-allocate WebGL textures
        const warmupTensor = tf.zeros([1, 224, 224, 3]);
        await model.predict(warmupTensor);
        warmupTensor.dispose();
        console.log('[Model] Warm-up complete — inference ready');
    } catch (error) {
        console.error('[Model] Load error:', error);
        model = null;
    }
    isModelLoading = false;
}

// Start loading model immediately
loadModel();

// =============================================
// §10. IMAGE PREPROCESSING (224×224 Normalization)
// =============================================

function preprocessImage(imgElement) {
    return tf.tidy(() => {
        let tensor = tf.browser.fromPixels(imgElement);
        tensor = tf.image.resizeBilinear(tensor, [224, 224]);
        tensor = tensor.div(255.0);
        tensor = tensor.expandDims(0);
        return tensor;
    });
}

// =============================================
// §11. COLOR HEURISTIC PRE-FILTER (Plant Detection)
// =============================================

function isPlantLike(imgElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const analyzeSize = 100;
    canvas.width = analyzeSize;
    canvas.height = analyzeSize;
    ctx.drawImage(imgElement, 0, 0, analyzeSize, analyzeSize);

    const imageData = ctx.getImageData(0, 0, analyzeSize, analyzeSize);
    const pixels = imageData.data;

    let plantColorCount = 0;
    const totalPixels = analyzeSize * analyzeSize;

    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        const hsl = rgbToHsl(r, g, b);
        const hue = hsl.h;
        const saturation = hsl.s;
        const lightness = hsl.l;

        const isGreen = (hue >= 40 && hue <= 180) && (saturation > 0.08) && (lightness > 0.05 && lightness < 0.95);
        const isYellowBrown = (hue >= 15 && hue <= 60) && (lightness > 0.05 && lightness < 0.90);
        const isDarkGreen = (hue >= 60 && hue <= 180) && (lightness > 0.02 && lightness < 0.4);

        if (isGreen || isYellowBrown || isDarkGreen) {
            plantColorCount++;
        }
    }

    const plantRatio = plantColorCount / totalPixels;
    console.log(`[PreFilter] Plant color ratio: ${(plantRatio * 100).toFixed(1)}%`);
    return plantRatio >= PLANT_COLOR_THRESHOLD;
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: h * 360, s: s, l: l };
}

// =============================================
// §12. PREDICTION LOGIC
// =============================================

async function predict(imgElement) {
    if (!model) {
        console.error('[Predict] Model not loaded');
        loadModel();
        return null;
    }

    const inputTensor = preprocessImage(imgElement);

    try {
        const predictions = await model.predict(inputTensor);
        const probabilities = await predictions.data();

        let maxProb = 0;
        let maxIndex = 0;
        for (let i = 0; i < probabilities.length; i++) {
            if (probabilities[i] > maxProb) {
                maxProb = probabilities[i];
                maxIndex = i;
            }
        }

        inputTensor.dispose();
        predictions.dispose();

        return {
            classIndex: maxIndex,
            classLabel: CLASS_LABELS[maxIndex],
            confidence: (maxProb * 100).toFixed(1),
            rawConfidence: maxProb
        };
    } catch (error) {
        console.error('[Predict] Error:', error);
        inputTensor.dispose();
        return null;
    }
}

// =============================================
// §13. UI LOGIC — Image Upload & Diagnosis
// =============================================

imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            console.log('[UI] Image loaded successfully');
            previewContainer.innerHTML = `
                <img src="${event.target.result}" id="preview-img" class="preview-image">
                <button id="analyze-btn" class="btn primary-btn" style="padding:15px 30px; display:block; margin: 10px auto; width: 100%;">${translations[currentLang]['btn-check']}</button>
            `;
            document.getElementById('analyze-btn').addEventListener('click', diagnoseCrop);
        };
        reader.readAsDataURL(file);
    }
});

async function diagnoseCrop() {
    const btn = document.getElementById('analyze-btn');
    const previewImg = document.getElementById('preview-img');
    if (!btn || !previewImg) return;

    btn.textContent = translations[currentLang]['analyzing'];
    btn.disabled = true;

    if (!model) {
        btn.textContent = translations[currentLang]['loading-model'];
        await loadModel();
        if (!model) {
            btn.textContent = translations[currentLang]['model-error'];
            return;
        }
    }

    const alertSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    const refreshSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`;

    if (!isPlantLike(previewImg)) {
        diagnosisTool.innerHTML = `
            <div class="result-card-dynamic slide-up border-diseased" style="border-color: #c0392b;">
                <div class="result-icon-container diseased" style="background: rgba(192,57,43,0.1); color: #c0392b;">
                    ${alertSvg}
                </div>
                <h2 class="result-title" style="color: #c0392b;">No Leaf Detected</h2>
                <p style="color: #4A4540; margin: 1.5rem 0;">Please upload a clear photo of a tomato leaf.</p>
                <p style="color: #888; font-size: 0.85rem;">The image does not contain enough organic plant colors (green/yellow/brown).</p>
                <p style="color: #888; font-size: 0.8rem;">Minimum required: ${PLANT_COLOR_THRESHOLD * 100}% plant-like pixels</p>
                <button class="btn primary-btn" onclick="location.reload()" style="padding: 12px 30px; width: 100%; margin-top: 1.5rem; display: flex; align-items: center; justify-content: center;">
                    ${refreshSvg} Try Again
                </button>
            </div>
        `;
        window.scrollTo({ top: diagnosisTool.offsetTop - 100, behavior: 'smooth' });
        return;
    }

    const result = await predict(previewImg);

    if (!result) {
        btn.textContent = 'Error - Try Again';
        btn.disabled = false;
        return;
    }

    if (result.rawConfidence < CONFIDENCE_THRESHOLD) {
        diagnosisTool.innerHTML = `
            <div class="result-card-dynamic slide-up border-diseased" style="border-color: #e67e22;">
                <div class="result-icon-container diseased" style="background: rgba(230,126,34,0.1); color: #e67e22;">
                    ${alertSvg}
                </div>
                <h2 class="result-title" style="color: #e67e22;">Low Confidence</h2>
                <p style="color: #4A4540; margin: 1.5rem 0;">Please ensure the leaf is well-lit and fills the frame.</p>
                <p style="color: #888; font-size: 0.85rem;">Detected: ${result.classLabel[currentLang]} (${result.confidence}% confidence)</p>
                <p style="color: #888; font-size: 0.8rem;">Minimum required: ${CONFIDENCE_THRESHOLD * 100}%</p>
                <button class="btn primary-btn" onclick="location.reload()" style="padding: 12px 30px; width: 100%; margin-top: 1.5rem; display: flex; align-items: center; justify-content: center;">
                    ${refreshSvg} Try Again
                </button>
            </div>
        `;
        window.scrollTo({ top: diagnosisTool.offsetTop - 100, behavior: 'smooth' });
        return;
    }

    currentResult = result;
    const classId = result.classLabel.id;
    const isHealthy = classId === 'healthy';
    const remedyData = REMEDIES[classId][currentLang];
    const diagnosisName = result.classLabel.en;

    const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5"/></svg>`;
    const alertIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    const broadcastIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>`;
    const storeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`;
    const sendIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9 22,2"/></svg>`;

    const resultIconClass = isHealthy ? 'healthy' : 'diseased';
    const resultSvg = isHealthy ? checkIcon : alertIcon;
    const borderClass = isHealthy ? 'border-healthy' : 'border-diseased';

    const remedyBullets = remedyData.remedy.split('.').filter(s => s.trim().length > 0)
        .map(s => `<li>${s.trim()}</li>`).join('');

    const medicine = MEDICINES[diagnosisName] || 'Consult local expert';

    const i18nStrings = {
        en: {
            alertPrefix: 'AgriScan Alert', detected: 'detected', assistFarmer: 'Please assist farmer',
            inStock: 'In Stock', outOfStock: 'Out of Stock', smsBridge: 'SMS Bridge (Offline Support)',
            sendSms: 'Send SMS to Expert', nearbyShops: 'Nearby Shops'
        },
        hi: {
            alertPrefix: 'AgriScan चेतावनी', detected: 'पाया गया', assistFarmer: 'कृपया किसान की सहायता करें',
            inStock: 'स्टॉक में है', outOfStock: 'स्टॉक में नहीं है', smsBridge: 'SMS ब्रिज (ऑफलाइन सहायता)',
            sendSms: 'विशेषज्ञ को SMS भेजें', nearbyShops: 'आस-पास की दुकानें'
        },
        pu: {
            alertPrefix: 'AgriScan ਚੇਤਾਵਨੀ', detected: 'ਪਾਇਆ ਗਿਆ', assistFarmer: 'ਕਿਰਪਾ ਕਰਕੇ ਕਿਸਾਨ ਦੀ ਮਦਦ ਕਰੋ',
            inStock: 'ਸਟਾਕ ਵਿੱਚ', outOfStock: 'ਸਟਾਕ ਵਿੱਚ ਨਹੀਂ', smsBridge: 'SMS ਬ੍ਰਿਜ (ਆਫਲਾਈਨ ਸਹਾਇਤਾ)',
            sendSms: 'ਮਾਹਰ ਨੂੰ SMS ਭੇਜੋ', nearbyShops: 'ਨੇੜਲੀਆਂ ਦੁਕਾਨਾਂ'
        }
    };
    const t = i18nStrings[currentLang] || i18nStrings.en;

    const diagnosisDisplay = result.classLabel[currentLang];
    const smsText = `${t.alertPrefix}: ${diagnosisDisplay} ${t.detected} (Conf: ${result.confidence}%). Rx: ${medicine}. ${t.assistFarmer}.`;
    const smsHref = `sms:18001801551?body=${encodeURIComponent(smsText)}`;

    const nearbyShops = getNearbyShops();
    const shopListHTML = nearbyShops.map(shop => {
        const stockDotClass = shop.stock ? 'in-stock' : 'out-of-stock';
        const stockText = shop.stock ? t.inStock : t.outOfStock;
        const stockColor = shop.stock ? '#4CAF50' : '#e57373';
        return `<div class="shop-item">
            <div class="shop-info">
                <div class="shop-name">${shop.name}</div>
                <div class="shop-distance">📍 ${shop.dist}${shop.area ? ' · ' + shop.area : ''}</div>
            </div>
            <div class="stock-status" style="color: ${stockColor};">
                <span class="status-dot ${stockDotClass}"></span>
                ${stockText}
            </div>
        </div>`;
    }).join('');

    diagnosisTool.innerHTML = `
        <div class="result-card-dynamic slide-up ${borderClass}">
            <div class="result-icon-container ${resultIconClass}">
                ${resultSvg}
            </div>
            <h2 class="result-title">${result.classLabel[currentLang]}</h2>
            <div class="confidence-container">
                <span class="confidence-text">${translations[currentLang]['confidence']}: ${result.confidence}%</span>
                <div class="confidence-bar-bg">
                    <div class="confidence-bar-fill" style="width: ${result.confidence}%"></div>
                </div>
            </div>
            <div class="remedy-list">
                <h4>${translations[currentLang]['label-remedy']}</h4>
                <ul>
                    ${remedyBullets}
                    <li>${remedyData.advice}</li>
                </ul>
            </div>

            <!-- SMS Bridge Section -->
            <div class="sms-bridge-section" style="margin-top: 2rem; padding: 1.5rem; background: #F0EBE5; border: 1px solid #D1C7BD;">
                <div class="section-header-icon">
                    <span class="icon icon-primary">${broadcastIcon}</span>
                    <span>${t.smsBridge}</span>
                </div>
                <p style="font-size: 0.85rem; color: #4A4540; margin-bottom: 1rem; padding: 10px; background: #fff; border: 1px solid #D1C7BD;">${smsText}</p>
                <input type="tel" id="farmer-phone" maxlength="10"
                    placeholder="${currentLang === 'pu' ? 'ਆਪਣਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ' : currentLang === 'hi' ? 'अपना मोबाइल नंबर दर्ज करें' : 'Enter your mobile number'}" 
                    style="width: 100%; padding: 12px; margin-bottom: 4px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; box-sizing: border-box; transition: border-color 0.3s;">
                <small id="phone-error" style="color: #d32f2f; display: none; margin-bottom: 10px; font-size: 12px;">Please enter a valid 10-digit number</small>
                <button id="sms-gateway-btn" class="btn primary-btn gateway-btn" onclick="triggerTwistOption('${diagnosisDisplay}', '${result.confidence}', '${smsHref}')" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; width: 100%;">
                    <span class="icon" style="margin: 0;">${sendIcon}</span>
                    <span id="sms-btn-text">${t.sendSms}</span>
                </button>
                <div id="sms-gateway-status" class="gateway-status" style="display: none; margin-top: 10px; text-align: center; font-size: 0.9rem;"></div>
            </div>

            <!-- Market Linkage Section -->
            <div class="market-linkage-section" style="margin-top: 1.5rem; padding: 1.5rem; background: #F9F7F5; border: 1px solid #D1C7BD;">
                <div class="section-header-icon">
                    <span class="icon icon-primary">${storeIcon}</span>
                    <span>${t.nearbyShops} — ${medicine}</span>
                </div>
                <div class="shop-list">
                    ${shopListHTML}
                </div>
            </div>

            <button class="btn primary-btn" onclick="location.reload()" style="padding: 12px 30px; width: 100%; margin-top: 1.5rem;">
                ${translations[currentLang]['btn-new']}
            </button>
        </div>
    `;

    window.scrollTo({ top: diagnosisTool.offsetTop - 100, behavior: 'smooth' });
}

// =============================================
// §14. LANGUAGE & UI UPDATES
// =============================================

document.getElementById('lang-select').addEventListener('change', (e) => {
    currentLang = e.target.value;
    updateLanguageUI();
});

function updateLanguageUI() {
    const elementsToUpdate = [
        'nav-home', 'nav-about', 'nav-contact', 'hero-title',
        'hero-subtitle', 'hero-cta', 'how-title', 'upload-btn-text'
    ];

    elementsToUpdate.forEach(id => {
        const el = document.getElementById(id);
        if (el && translations[currentLang][id]) {
            el.innerText = translations[currentLang][id];
        }
    });

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.innerText = translations[currentLang][key];
        }
    });

    const btnNew = document.querySelector('.btn-new');
    if (btnNew) btnNew.textContent = translations[currentLang]['btn-new'];
}

// =============================================
// §15. SCROLL SPY LOGIC
// =============================================

window.addEventListener('scroll', () => {
    const sections = [
        { id: '#home', el: document.getElementById('home') },
        { id: '#diagnosis-tool', el: document.getElementById('diagnosis-tool') }
    ];

    let currentSection = '';
    sections.forEach(sec => {
        if (!sec.el) return;
        const rect = sec.el.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
            currentSection = sec.id;
        }
    });

    if (currentSection && window.location.hash !== currentSection) {
        history.replaceState(null, null, currentSection);
    }
});

// =============================================
// §16. OFFLINE STATUS INDICATOR
// =============================================

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

// =============================================
// §17. SERVICE WORKER REGISTRATION
// =============================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((reg) => {
                console.log('[SW] Registered:', reg.scope);
            })
            .catch((err) => {
                console.error('[SW] Registration failed:', err);
            });
    });
}

// =============================================
// §18. REVEAL ON SCROLL (IntersectionObserver)
// =============================================

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

// =============================================
// §19. HAMBURGER MENU TOGGLE (Mobile)
// =============================================

const hamburgerBtn = document.getElementById('hamburger-btn');
const navLinks = document.getElementById('nav-links');

if (hamburgerBtn && navLinks) {
    hamburgerBtn.addEventListener('click', () => {
        hamburgerBtn.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburgerBtn.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}
