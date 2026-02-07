// =============================================
// AgriScan - AI Tomato Doctor
// YOLOv8 Classification Model for Tomato Disease
// =============================================

// =============================================
// App Loading Screen - Hide after window load
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
    }, 1000); // 1 second delay for smooth feel
});

// --- Elements & IDs ---
const imageUpload = document.getElementById('imageUpload');
const previewContainer = document.getElementById('preview-container');
const diagnosisTool = document.getElementById('diagnosis-tool');
const homeSection = document.getElementById('home');

// --- Model & State ---
let model = null;
let currentLang = 'en';
let currentResult = null;
let isModelLoading = false;

// Confidence Threshold (adjust as needed)
const CONFIDENCE_THRESHOLD = 0.80; // 80% minimum for valid diagnosis

// Plant Color Detection Threshold
const PLANT_COLOR_THRESHOLD = 0.10; // 10% of pixels must be plant-like

// Class Labels (YOLOv8 output index → disease name)
const CLASS_LABELS = [
    { id: 'bacterial-spot', en: 'Bacterial Spot', hi: 'जीवाणु धब्बा', pa: 'ਬੈਕਟੀਰੀਆ ਦਾ ਧੱਬਾ' },
    { id: 'early-blight', en: 'Early Blight', hi: 'अगेती झुलसा', pa: 'ਅਗੇਤੀ ਝੁਲਸ' },
    { id: 'late-blight', en: 'Late Blight', hi: 'पछेती झुलसा', pa: 'ਪਛੇਤੀ ਝੁਲਸ' },
    { id: 'healthy', en: 'Healthy', hi: 'स्वस्थ', pa: 'ਸਿਹਤਮੰਦ' }
];

// Remedies for each class
const REMEDIES = {
    'bacterial-spot': {
        en: { remedy: 'Apply copper-based bactericide. Remove infected leaves immediately.', advice: 'Avoid overhead watering.' },
        hi: { remedy: 'तांबा आधारित जीवाणुनाशक का प्रयोग करें। संक्रमित पत्तियों को तुरंत हटा दें।', advice: 'ऊपर से पानी देने से बचें।' },
        pa: { remedy: 'ਤਾਂਬੇ-ਅਧਾਰਿਤ ਬੈਕਟੀਰੀਆਨਾਸ਼ਕ ਲਗਾਓ। ਪ੍ਰਭਾਵਿਤ ਪੱਤੇ ਤੁਰੰਤ ਹਟਾਓ।', advice: 'ਉੱਪਰੋਂ ਪਾਣੀ ਦੇਣ ਤੋਂ ਬਚੋ।' }
    },
    'early-blight': {
        en: { remedy: 'Use Mancozeb or Chlorothalonil fungicide.', advice: 'Ensure proper spacing between plants. Remove infected debris.' },
        hi: { remedy: 'मैन्कोज़ेब या क्लोरोथालोनिल कवकनाशी का प्रयोग करें।', advice: 'पौधों के बीच उचित दूरी सुनिश्चित करें।' },
        pa: { remedy: 'ਮੈਨਕੋਜ਼ੇਬ ਜਾਂ ਕਲੋਰੋਥਲੋਨਿਲ ਉੱਲੀਨਾਸ਼ਕ ਵਰਤੋ।', advice: 'ਪੌਦਿਆਂ ਵਿਚਕਾਰ ਸਹੀ ਦੂਰੀ ਰੱਖੋ।' }
    },
    'healthy': {
        en: { remedy: 'No treatment needed. Your crop is healthy!', advice: 'Continue regular monitoring and maintain good agricultural practices.' },
        hi: { remedy: 'कोई उपचार आवश्यक नहीं। आपकी फसल स्वस्थ है!', advice: 'नियमित निगरानी जारी रखें।' },
        pa: { remedy: 'ਕੋਈ ਇਲਾਜ ਦੀ ਲੋੜ ਨਹੀਂ। ਤੁਹਾਡੀ ਫ਼ਸਲ ਸਿਹਤਮੰਦ ਹੈ!', advice: 'ਨਿਯਮਿਤ ਨਿਗਰਾਨੀ ਜਾਰੀ ਰੱਖੋ।' }
    },
    'late-blight': {
        en: { remedy: 'Apply Metalaxyl or Ridomil fungicide immediately.', advice: 'Destroy infected plants to prevent spread. Avoid excess moisture.' },
        hi: { remedy: 'तुरंत मेटालैक्सिल या रिडोमिल कवकनाशी का प्रयोग करें।', advice: 'प्रसार रोकने के लिए संक्रमित पौधों को नष्ट करें।' },
        pa: { remedy: 'ਤੁਰੰਤ ਮੈਟਾਲੈਕਸਿਲ ਜਾਂ ਰਿਡੋਮਿਲ ਉੱਲੀਨਾਸ਼ਕ ਲਗਾਓ।', advice: 'ਫੈਲਾਅ ਰੋਕਣ ਲਈ ਪ੍ਰਭਾਵਿਤ ਪੌਦਿਆਂ ਨੂੰ ਨਸ਼ਟ ਕਰੋ।' }
    }
};

// =============================================
// SMS Bridge & Market Linkage Data
// =============================================

// Recommended Medicines based on Diagnosis
const MEDICINES = {
    'Bacterial Spot': 'Copper Bactericide',
    'Early Blight': 'Mancozeb Fungicide',
    'Late Blight': 'Chlorothalonil',
    'Healthy': 'Organic Fertilizer (Maintenance)'
};

// Mock Local Shops Database
const MOCK_SHOPS = [
    { name: "Ramesh Krishi Kendra", dist: "1.2 km", stock: true },
    { name: "Global Agri Store", dist: "3.5 km", stock: false },
    { name: "Village Co-op Society", dist: "0.8 km", stock: true }
];

// =============================================
// SMS Gateway Function (Twilio Backend)
// Dual-State with Hindi/English translations
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
            pa: '📡 ਗੇਟਵੇ ਨਾਲ ਜੁੜ ਰਿਹਾ ਹੈ...'
        },
        success: {
            en: '✅ Alert Sent to KVK Expert',
            hi: '✅ अलर्ट KVK विशेषज्ञ को भेजा गया',
            pa: '✅ ਮਾਹਰ ਨੂੰ ਅਲਰਟ ਭੇਜਿਆ ਗਿਆ'
        },
        fallback: {
            en: '⚠️ Opened Manual SMS',
            hi: '⚠️ मैनुअल एसएमएस खुला',
            pa: '⚠️ ਮੈਨੂਅਲ SMS ਖੋਲ੍ਹਿਆ ਗਿਆ'
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

            // Remove shake class after animation
            setTimeout(() => {
                phoneInput.classList.remove('shake');
            }, 500);

            // Focus the input
            phoneInput.focus();
        }

        // Show inline error message
        if (phoneError) {
            phoneError.textContent = currentLang === 'pa'
                ? 'ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਵੈਧ 10-ਅੰਕਾਂ ਵਾਲਾ ਨੰਬਰ ਦਰਜ ਕਰੋ'
                : currentLang === 'hi'
                    ? 'कृपया एक मान्य 10-अंकीय नंबर दर्ज करें'
                    : 'Please enter a valid 10-digit number';
            phoneError.style.display = 'block';
        }
        return;
    }

    // Reset input styling on valid entry
    if (phoneInput) {
        phoneInput.style.border = '1px solid #ddd';
    }
    if (phoneError) {
        phoneError.style.display = 'none';
    }

    // Step 2: Disable button and show Loading State
    btn.disabled = true;
    btnText.textContent = stateText.loading[currentLang] || stateText.loading.en;
    btn.style.background = '#e0e0e0';
    btn.style.color = '#333';

    try {
        // Step 3: POST request to backend (with phone)
        const response = await fetch('https://agriscan-backend-6iar.onrender.com/send-alert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                disease: disease,
                confidence: confidence,
                phone: farmerPhone.trim(),
                lang: currentLang
            })
        });

        // Step 3: Success State (status 200) - PERMANENT
        if (response.ok) {
            // Feather-style SVG checkmark (white stroke)
            const checkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

            const successText = currentLang === 'hi'
                ? 'अलर्ट KVK विशेषज्ञ को भेजा गया'
                : 'ALERT SENT TO KVK EXPERT';

            btn.innerHTML = `${checkSvg}<span>${successText}</span>`;
            btn.style.background = '#2d4a22'; // AgriScan Green
            btn.style.color = '#ffffff';
            // Button stays disabled permanently - no reset
        } else {
            throw new Error('Server returned non-200 status');
        }

    } catch (error) {
        // Step 4: Fallback - trigger manual SMS
        console.warn('SMS Gateway failed, using fallback:', error.message);

        btnText.textContent = stateText.fallback[currentLang] || stateText.fallback.en;
        btn.style.background = '#e67e22';
        btn.style.color = '#ffffff';

        // Open manual SMS link
        setTimeout(() => {
            window.location.href = fallbackSmsHref;

            // Reset button after 3-4 seconds
            setTimeout(() => {
                btn.disabled = false;
                btnText.textContent = originalText;
                btn.style.background = originalBg || '';
                btn.style.color = originalColor || '';
            }, 3500);
        }, 500);
    }
}

// Translations
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
        'footer': '© 2026 AgriScan - AI Tomato Doctor',
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
        'footer': '© 2026 AgriScan - AI टोमैटो डॉक्टर',
        'btn-login': 'लॉगिन',
        'model-ready': 'AI मॉडल तैयार',
        'model-error': 'मॉडल त्रुटि'
    },
    pa: {
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
        'footer': '© 2026 ਐਗਰੀਸਕੇਨ - AI ਟਮਾਟਰ ਡਾਕਟਰ',
        'btn-login': 'ਲੌਗਇਨ',
        'model-ready': 'AI ਮਾਡਲ ਤਿਆਰ',
        'model-error': 'ਮਾਡਲ ਗਲਤੀ'
    }
};

// =============================================
// TensorFlow.js Model Loading
// =============================================

async function loadModel() {
    if (model || isModelLoading) return;
    isModelLoading = true;

    try {
        console.log('Loading TensorFlow.js model...');
        model = await tf.loadGraphModel('model/model.json');
        console.log('Model loaded successfully!');

        // Warm up the model with a dummy prediction
        const warmupTensor = tf.zeros([1, 224, 224, 3]);
        await model.predict(warmupTensor);
        warmupTensor.dispose();
        console.log('Model warmed up and ready.');
    } catch (error) {
        console.error('Error loading model:', error);
        model = null;
    }
    isModelLoading = false;
}

// Start loading model immediately
loadModel();

// =============================================
// Image Preprocessing (YOLOv8 Requirements)
// =============================================

function preprocessImage(imgElement) {
    return tf.tidy(() => {
        // Convert image to tensor
        let tensor = tf.browser.fromPixels(imgElement);

        // Resize to 224x224
        tensor = tf.image.resizeBilinear(tensor, [224, 224]);

        // Normalize pixel values to 0-1 range
        tensor = tensor.div(255.0);

        // Add batch dimension [1, 224, 224, 3]
        tensor = tensor.expandDims(0);

        return tensor;
    });
}

// =============================================
// Color Heuristic Pre-Filter (Green Filter)
// =============================================

function isPlantLike(imgElement) {
    // Create hidden canvas for pixel analysis
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Use smaller size for faster processing
    const analyzeSize = 100;
    canvas.width = analyzeSize;
    canvas.height = analyzeSize;

    // Draw image to canvas
    ctx.drawImage(imgElement, 0, 0, analyzeSize, analyzeSize);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, analyzeSize, analyzeSize);
    const pixels = imageData.data;

    let plantColorCount = 0;
    const totalPixels = analyzeSize * analyzeSize;

    // Analyze each pixel
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Convert RGB to HSL
        const hsl = rgbToHsl(r, g, b);
        const hue = hsl.h;
        const saturation = hsl.s;
        const lightness = hsl.l;

        // Check for plant-like colors (lenient):
        // Green: hue 40-180, low saturation ok for diseased leaves
        // Yellow/Brown/Tan: hue 20-180, wide range for diseased/dried leaves
        const isGreen = (hue >= 40 && hue <= 180) && (saturation > 0.08) && (lightness > 0.05 && lightness < 0.95);
        const isYellowBrown = (hue >= 15 && hue <= 60) && (lightness > 0.05 && lightness < 0.90);
        const isDarkGreen = (hue >= 60 && hue <= 180) && (lightness > 0.02 && lightness < 0.4); // Dark backgrounds with green tint

        if (isGreen || isYellowBrown || isDarkGreen) {
            plantColorCount++;
        }
    }

    const plantRatio = plantColorCount / totalPixels;
    console.log(`Plant color ratio: ${(plantRatio * 100).toFixed(1)}%`);

    return plantRatio >= PLANT_COLOR_THRESHOLD;
}

// Helper: RGB to HSL conversion
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
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
// Prediction Logic
// =============================================

async function predict(imgElement) {
    if (!model) {
        console.error('Model not loaded');
        loadModel();
        return null;
    }



    const inputTensor = preprocessImage(imgElement);

    try {
        const predictions = await model.predict(inputTensor);
        const probabilities = await predictions.data();

        // Find the class with highest probability
        let maxProb = 0;
        let maxIndex = 0;
        for (let i = 0; i < probabilities.length; i++) {
            if (probabilities[i] > maxProb) {
                maxProb = probabilities[i];
                maxIndex = i;
            }
        }

        // Clean up tensors
        inputTensor.dispose();
        predictions.dispose();

        return {
            classIndex: maxIndex,
            classLabel: CLASS_LABELS[maxIndex],
            confidence: (maxProb * 100).toFixed(1),
            rawConfidence: maxProb  // Raw value for threshold check
        };
    } catch (error) {
        console.error('Prediction error:', error);
        inputTensor.dispose();
        return null;
    }
}

// =============================================
// UI Logic
// =============================================

// Handle File Selection
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            console.log('Image loaded successfully');

            previewContainer.innerHTML = `
                <img src="${event.target.result}" id="preview-img" class="preview-image">
                <button id="analyze-btn" class="btn primary-btn" style="padding:15px 30px; display:block; margin: 10px auto; width: 100%;">${translations[currentLang]['btn-check']}</button>
            `;

            document.getElementById('analyze-btn').addEventListener('click', diagnoseCrop);
        };
        reader.readAsDataURL(file);
    }
});

// Main Diagnosis Function
async function diagnoseCrop() {
    const btn = document.getElementById('analyze-btn');
    const previewImg = document.getElementById('preview-img');
    if (!btn || !previewImg) return;

    btn.textContent = translations[currentLang]['analyzing'];
    btn.disabled = true;

    // Wait for model if not loaded
    if (!model) {
        btn.textContent = translations[currentLang]['loading-model'];
        await loadModel();
        if (!model) {
            btn.textContent = translations[currentLang]['model-error'];
            return;
        }
    }

    // *** Color Heuristic Pre-Filter ***
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

    // Run prediction
    const result = await predict(previewImg);

    if (!result) {
        btn.textContent = 'Error - Try Again';
        btn.disabled = false;
        return;
    }

    // Check confidence threshold
    if (result.rawConfidence < CONFIDENCE_THRESHOLD) {
        const alertSvgConf = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        const refreshSvgConf = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`;
        diagnosisTool.innerHTML = `
            <div class="result-card-dynamic slide-up border-diseased" style="border-color: #e67e22;">
                <div class="result-icon-container diseased" style="background: rgba(230,126,34,0.1); color: #e67e22;">
                    ${alertSvgConf}
                </div>
                <h2 class="result-title" style="color: #e67e22;">Low Confidence</h2>
                <p style="color: #4A4540; margin: 1.5rem 0;">Please ensure the leaf is well-lit and fills the frame.</p>
                <p style="color: #888; font-size: 0.85rem;">Detected: ${result.classLabel[currentLang]} (${result.confidence}% confidence)</p>
                <p style="color: #888; font-size: 0.8rem;">Minimum required: ${CONFIDENCE_THRESHOLD * 100}%</p>
                <button class="btn primary-btn" onclick="location.reload()" style="padding: 12px 30px; width: 100%; margin-top: 1.5rem; display: flex; align-items: center; justify-content: center;">
                    ${refreshSvgConf} Try Again
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
    const diagnosisName = result.classLabel.en; // Use English for medicine lookup

    // Define SVG Icons (Lucide-style)
    const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5"/></svg>`;
    const alertIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    const broadcastIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>`;
    const storeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`;
    const sendIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9 22,2"/></svg>`;

    const resultIconClass = isHealthy ? 'healthy' : 'diseased';
    const resultSvg = isHealthy ? checkIcon : alertIcon;
    const borderClass = isHealthy ? 'border-healthy' : 'border-diseased';

    // Prepare Remedies as Bullets
    const remedyBullets = remedyData.remedy.split('.').filter(s => s.trim().length > 0)
        .map(s => `<li>${s.trim()}</li>`).join('');

    // Get recommended medicine
    const medicine = MEDICINES[diagnosisName] || 'Consult local expert';

    // i18n strings for SMS Bridge & Market Linkage
    const i18nStrings = {
        en: {
            alertPrefix: 'AgriScan Alert',
            detected: 'detected',
            assistFarmer: 'Please assist farmer',
            inStock: 'In Stock',
            outOfStock: 'Out of Stock',
            smsBridge: 'SMS Bridge (Offline Support)',
            sendSms: 'Send SMS to Expert',
            nearbyShops: 'Nearby Shops'
        },
        hi: {
            alertPrefix: 'AgriScan चेतावनी',
            detected: 'पाया गया',
            assistFarmer: 'कृपया किसान की सहायता करें',
            inStock: 'स्टॉक में है',
            outOfStock: 'स्टॉक में नहीं है',
            smsBridge: 'SMS ब्रिज (ऑफलाइन सहायता)',
            sendSms: 'विशेषज्ञ को SMS भेजें',
            nearbyShops: 'आस-पास की दुकानें'
        }
    };
    const t = i18nStrings[currentLang] || i18nStrings.en;

    // Generate SMS text (localized)
    const diagnosisDisplay = result.classLabel[currentLang];
    const smsText = `${t.alertPrefix}: ${diagnosisDisplay} ${t.detected} (Conf: ${result.confidence}%). Rx: ${medicine}. ${t.assistFarmer}.`;
    const smsHref = `sms:18001801551?body=${encodeURIComponent(smsText)}`; // Kisan Call Center Helpline

    // Generate shop list HTML with minimalist design (localized)
    const shopListHTML = MOCK_SHOPS.map(shop => {
        const stockDotClass = shop.stock ? 'in-stock' : 'out-of-stock';
        const stockText = shop.stock ? t.inStock : t.outOfStock;
        const stockColor = shop.stock ? '#4CAF50' : '#e57373';
        return `<div class="shop-item">
            <div class="shop-info">
                <div class="shop-name">${shop.name}</div>
                <div class="shop-distance">${shop.dist}</div>
            </div>
            <div class="stock-status" style="color: ${stockColor};">
                <span class="status-dot ${stockDotClass}"></span>
                ${stockText}
            </div>
        </div>`;
    }).join('');

    // Display Result Card with Minimalist Icons
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
                    placeholder="${currentLang === 'pa' ? 'ਆਪਣਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ' : currentLang === 'hi' ? 'अपना मोबाइल नंबर दर्ज करें' : 'Enter your mobile number'}" 
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
// Language & UI Updates
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
// Scroll Spy Logic
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
// Offline Status
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
// Service Worker Registration
// =============================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch(console.error);
    });
}

// =============================================
// Reveal on Scroll (IntersectionObserver)
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
// Hamburger Menu Toggle (Mobile)
// =============================================

const hamburgerBtn = document.getElementById('hamburger-btn');
const navLinks = document.getElementById('nav-links');

if (hamburgerBtn && navLinks) {
    hamburgerBtn.addEventListener('click', () => {
        hamburgerBtn.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close menu when a nav link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburgerBtn.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}
