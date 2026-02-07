// --- Elements & IDs ---
const imageUpload = document.getElementById('imageUpload');
const previewContainer = document.getElementById('preview-container');
const diagnosisTool = document.getElementById('diagnosis-tool');
const resultSection = document.getElementById('result-section');
const homeSection = document.getElementById('home-section');

// Language & State
let currentLang = 'en';
let currentResult = null;

const translations = {
    en: {
        'title': 'CropHealth AI',
        'btn-upload': 'Upload Leaf Image',
        'diag-tool-title': 'Diagnosis Tool',
        'diag-tool-desc': 'Please select a clear photo of the infected leaf.',
        'btn-check': 'Analyze Crop',
        'diag-ready': 'Diagnosis Ready',
        'diag-res-title': 'Diagnosis Result',
        'label-disease': 'Disease',
        'label-remedy': 'Remedy',
        'label-advice': 'Advice',
        'btn-new': 'Start New Diagnosis',
        'footer': '© 2026 Offline Crop Health Diagnostic System',
        'status-online': 'Online',
        'status-offline': 'Offline',
        'analyzing': 'Analyzing...',
        'confidence': 'Confidence',
        'offline-active': 'Offline Active',
        'step1-title': 'Take Photo',
        'step2-title': 'Instant Analysis',
        'step3-title': 'Get Remedy',
        'hero-tagline': 'Save Your Harvest from Disease.',
        'hero-subline': 'Instant, offline crop diagnosis for rural farmers.',
        'btn-start': 'Start Diagnosis',
        'how-it-works-title': 'How it Works'
    },
    hi: {
        'title': 'फसल स्वास्थ्य AI',
        'btn-upload': 'पत्ती की फोटो अपलोड करें',
        'diag-tool-title': 'निदान उपकरण',
        'diag-tool-desc': 'कृपया संक्रमित पत्ती की स्पष्ट फोटो चुनें।',
        'btn-check': 'फसल का विश्लेषण करें',
        'diag-ready': 'निदान तैयार है',
        'diag-res-title': 'निदान का परिणाम',
        'label-disease': 'बीमारी',
        'label-remedy': 'उपाय',
        'label-advice': 'सलाह',
        'btn-new': 'नया निदान शुरू करें',
        'footer': '© 2026 ऑफलाइन फसल स्वास्थ्य निदान प्रणाली',
        'status-online': 'ऑनलाइन',
        'status-offline': 'ऑफलाइन',
        'analyzing': 'विश्लेषण किया जा रहा है...',
        'confidence': 'भरोसा',
        'offline-active': 'ऑफलाइन सक्रिय',
        'step1-title': 'फोटो लें',
        'step2-title': 'त्वरित विश्लेषण',
        'step3-title': 'उपाय पाएं',
        'hero-tagline': 'अपनी फसल को बीमारी से बचाएं।',
        'hero-subline': 'ग्रामीण किसानों के लिए तत्काल, ऑफलाइन फसल निदान।',
        'btn-start': 'निदान शुरू करें',
        'how-it-works-title': 'यह कैसे काम करता है'
    }
};

const diagnoses = [
    {
        id: 'healthy',
        confidence: '96%',
        type: 'healthy',
        en: { name: 'Healthy Crop', remedy: 'No action needed. Your crop looks healthy!', advice: 'Continue regular monitoring.' },
        hi: { name: 'स्वस्थ फसल', remedy: 'किसी कार्रवाई की आवश्यकता नहीं है।', advice: 'नियमित निगरानी जारी रखें।' }
    },
    {
        id: 'early-blight',
        confidence: '82%',
        type: 'diseased',
        en: { name: 'Early Blight', remedy: 'Use Copper-based Fungicide.', advice: 'Remove infected leaves.' },
        hi: { name: 'अगेती झुलसा', remedy: 'तांबा आधारित कवकनाशी का प्रयोग करें।', advice: 'संक्रमित पत्तियों को हटा दें।' }
    },
    {
        id: 'yellow-rust',
        confidence: '78%',
        type: 'diseased',
        en: { name: 'Yellow Rust', remedy: 'Apply Sulfur dust.', advice: 'Avoid excessive nitrogen.' },
        hi: { name: 'पीला रतवा', remedy: 'सल्फर पाउडर का प्रयोग करें।', advice: 'अत्यधिक नाइट्रोजन से बचें।' }
    }
];

// --- Core Logic ---

// Handle File Selection (Robust)
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            console.log('Image loaded successfully');

            // Targeted innerHTML replacement
            previewContainer.innerHTML = `
                <img src="${event.target.result}" class="preview-image" style="max-width:300px; display:block; margin: 20px auto; border-radius:10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <button id="analyze-btn" class="btn primary-btn pill" style="padding:15px 30px; display:block; margin: 10px auto;">${translations[currentLang]['btn-check']}</button>
            `;

            // Attach listener immediately to new button
            document.getElementById('analyze-btn').addEventListener('click', diagnoseCrop);
        };
        reader.readAsDataURL(file);
    }
});

// Robust Diagnosis Flow
function diagnoseCrop() {
    const btn = document.getElementById('analyze-btn');
    if (!btn) return;

    btn.textContent = translations[currentLang]['analyzing'];
    btn.disabled = true;

    setTimeout(() => {
        // Randomly pick a result
        const result = diagnoses[Math.floor(Math.random() * diagnoses.length)];
        currentResult = result;
        const content = result[currentLang];
        const isHealthy = result.type === 'healthy';

        // Define Icon and Border Class
        const resultIcon = isHealthy ? '✅' : '⚠️';
        const borderClass = isHealthy ? 'border-healthy' : 'border-diseased';

        // Prepare Remedies as Bullets
        const remedyBullets = content.remedy.split('.').filter(s => s.trim().length > 0)
            .map(s => `<li>${s.trim()}</li>`).join('');

        // Completely replace the diagnosisTool content with the Result Card
        diagnosisTool.innerHTML = `
            <div class="result-card-dynamic slide-up ${borderClass}">
                <div class="result-icon">${resultIcon}</div>
                <h2 class="result-title">${content.name}</h2>
                <div class="confidence-container">
                    <span class="confidence-text">${translations[currentLang]['confidence']}: ${result.confidence}</span>
                    <div class="confidence-bar-bg">
                        <div class="confidence-bar-fill" style="width: ${result.confidence}"></div>
                    </div>
                </div>
                <div class="remedy-list">
                    <h4>${translations[currentLang]['label-remedy']}</h4>
                    <ul>
                        ${remedyBullets}
                        <li>${content.advice}</li>
                    </ul>
                </div>
                <button class="btn primary-btn pill" onclick="location.reload()" style="padding: 12px 30px;">
                    ${translations[currentLang]['btn-new']}
                </button>
            </div>
        `;

        window.scrollTo({ top: diagnosisTool.offsetTop - 100, behavior: 'smooth' });
    }, 2000);
}

function updateResultUI(result) {
    // This function is now legacy as diagnoseCrop handles injection
}

// Reset Flow
document.getElementById('new-diagnosis-btn').addEventListener('click', () => {
    imageUpload.value = '';
    previewContainer.innerHTML = '';
    resultSection.classList.add('hidden');
    diagnosisTool.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// --- UI Helpers ---

// Language Toggle
document.getElementById('lang-select').addEventListener('change', (e) => {
    currentLang = e.target.value;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) el.innerText = translations[currentLang][key];
    });
    // Update active result if any
    if (!resultSection.classList.contains('hidden') && currentResult) updateResultUI(currentResult);
});

// Offline Status
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

// Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch(console.error);
    });
}
