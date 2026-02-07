// --- Elements & IDs ---
const imageUpload = document.getElementById('imageUpload');
const previewContainer = document.getElementById('preview-container');
const diagnosisTool = document.getElementById('diagnosis-tool');
const homeSection = document.getElementById('home');

// Language & State
let currentLang = 'en';
let currentResult = null;

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
        'step1-title': 'Take Photo',
        'step2-title': 'Instant Analysis',
        'step3-title': 'Get Remedy',
        'diag-tool-title': 'Diagnosis Tool',
        'diag-tool-desc': 'Select or drag a clear photo of the infected leaf below.',
        'upload-btn-text': 'Tap to Upload or Capture Image',
        'btn-check': 'Analyze Crop',
        'analyzing': 'Analyzing...',
        'confidence': 'Confidence',
        'label-remedy': 'Remedy',
        'btn-new': 'Start New Diagnosis',
        'offline-active': 'Offline Active',
        'status-online': 'Online',
        'status-offline': 'Offline',
        'footer': '© 2026 Offline Crop Health Diagnostic System',
        'btn-login': 'Login'
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
        'step2-title': 'त्वरित विश्लेषण',
        'step3-title': 'उपाय पाएं',
        'diag-tool-title': 'निदान उपकरण',
        'diag-tool-desc': 'कृपया संक्रमित पत्ती की स्पष्ट फोटो चुनें।',
        'upload-btn-text': 'अपलोड करने या फोटो लेने के लिए टैप करें',
        'btn-check': 'फसल का विश्लेषण करें',
        'analyzing': 'विश्लेषण किया जा रहा है...',
        'confidence': 'भरोसा',
        'label-remedy': 'उपाय',
        'btn-new': 'नया निदान शुरू करें',
        'offline-active': 'ऑफलाइन सक्रिय',
        'status-online': 'ऑनलाइन',
        'status-offline': 'ऑफलाइन',
        'footer': '© 2026 ऑफलाइन फसल स्वास्थ्य निदान प्रणाली',
        'btn-login': 'लॉगिन'
    }
};

const diagnoses = [
    {
        id: 'healthy',
        confidence: '96%',
        type: 'healthy',
        en: { name: 'Healthy Crop', remedy: 'No action needed. Your crop looks healthy!', advice: 'Continue regular monitoring.' },
        hi: { name: 'स्वस्थ फसल', remedy: 'किसी कार्रवाई की आवश्यकता नहीं है। आपकी फसल स्वस्थ दिख रही है!', advice: 'नियमित निगरानी जारी रखें।' }
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
                <img src="${event.target.result}" class="preview-image">
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

// Language Toggle
document.getElementById('lang-select').addEventListener('change', (e) => {
    currentLang = e.target.value;
    updateLanguageUI();
});

function updateLanguageUI() {
    // 1. Direct ID Binding (as requested for reliability)
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

    // 2. Data Attribute Binding (for remaining items)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.innerText = translations[currentLang][key];
        }
    });

    // Update active results if any
    const btnNew = document.querySelector('.btn-new');
    if (btnNew) btnNew.textContent = translations[currentLang]['btn-new'];
}

// --- Scroll Spy Logic ---
window.addEventListener('scroll', () => {
    const sections = [
        { id: '#home', el: document.getElementById('home') },
        { id: '#diagnosis-tool', el: document.getElementById('diagnosis-tool') }
    ];

    let currentSection = '';
    sections.forEach(sec => {
        if (!sec.el) return;
        const rect = sec.el.getBoundingClientRect();
        // If element is in middle of viewport
        if (rect.top <= 150 && rect.bottom >= 150) {
            currentSection = sec.id;
        }
    });

    if (currentSection && window.location.hash !== currentSection) {
        history.replaceState(null, null, currentSection);
    }
});

// --- Offline Status ---
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

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch(console.error);
    });
}

// --- Reveal on Scroll (IntersectionObserver) ---
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
