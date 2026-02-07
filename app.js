// DOM Elements
const sections = {
    home: document.getElementById('home-section'),
    upload: document.getElementById('upload-section'),
    result: document.getElementById('result-section')
};

const buttons = {
    start: document.getElementById('start-btn'),
    backHome: document.getElementById('back-home-btn'),
    checkHealth: document.getElementById('check-health-btn'),
    reset: document.getElementById('reset-btn'),
    newDiagnosis: document.getElementById('new-diagnosis-btn')
};

const imageInput = document.getElementById('image-input');
const uploadBox = document.getElementById('upload-box');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');
const langSelect = document.getElementById('lang-select');

// Global State
let currentLang = 'en';
let currentResult = null;

// Translations
const translations = {
    en: {
        'title': 'CropHealth AI',
        'tagline': 'Expert diagnosis, anywhere. Even offline.',
        'hero-title': 'Empowering Farmers',
        'hero-desc': 'Farmers in low-connectivity areas often lack access to expert advice for crop diseases. Our system provides instant, offline diagnostic support to help you save your harvest.',
        'btn-upload': 'Upload Leaf Image',
        'back': '← Back',
        'diag-tool-title': 'Diagnosis Tool',
        'diag-tool-desc': 'Please select a clear photo of the infected leaf.',
        'upload-box-text': 'Tap to Capture or Select Image',
        'btn-check': 'Check Crop Health',
        'btn-another': 'Try Another Image',
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
        'confidence': 'Confidence'
    },
    hi: {
        'title': 'फसल स्वास्थ्य AI',
        'tagline': 'विशेषज्ञ सलाह, कहीं भी। यहाँ तक कि ऑफलाइन भी।',
        'hero-title': 'किसानों का सशक्तिकरण',
        'hero-desc': 'कम कनेक्टिविटी वाले क्षेत्रों में किसानों के पास अक्सर फसल रोगों के लिए विशेषज्ञ सलाह की कमी होती है। हमारा सिस्टम आपकी फसल बचाने के लिए तत्काल, ऑफलाइन निदान सहायता प्रदान करता है।',
        'btn-upload': 'पत्ती की फोटो अपलोड करें',
        'back': '← वापस',
        'diag-tool-title': 'निदान उपकरण',
        'diag-tool-desc': 'कृपया संक्रमित पत्ती की स्पष्ट फोटो चुनें।',
        'upload-box-text': 'फोटो खींचने या चुनने के लिए टैप करें',
        'btn-check': 'फसल स्वास्थ्य की जांच करें',
        'btn-another': 'दूसरी फोटो चुनें',
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
        'confidence': 'भरोसा'
    }
};

// Diagnosis Data (Translatable)
const diagnoses = [
    {
        id: 'healthy',
        confidence: '96%',
        type: 'healthy',
        en: {
            name: 'Healthy Crop',
            remedy: 'No action needed. Your crop looks healthy!',
            advice: 'Continue regular monitoring and maintain consistent irrigation.'
        },
        hi: {
            name: 'स्वस्थ फसल',
            remedy: 'किसी कार्रवाई की आवश्यकता नहीं है। आपकी फसल स्वस्थ दिख रही है!',
            advice: 'नियमित निगरानी जारी रखें और सिंचाई बनाए रखें।'
        }
    },
    {
        id: 'early-blight',
        confidence: '82%',
        type: 'diseased',
        en: {
            name: 'Early Blight',
            remedy: 'Use Copper-based Fungicide.',
            advice: 'Remove infected lower leaves and ensure proper air circulation.'
        },
        hi: {
            name: 'अगेती झुलसा (Early Blight)',
            remedy: 'तांबा आधारित कवकनाशी (Fungicide) का प्रयोग करें।',
            advice: 'संक्रमित निचली पत्तियों को हटा दें और हवा का संचार सुनिश्चित करें।'
        }
    },
    {
        id: 'yellow-rust',
        confidence: '78%',
        type: 'diseased',
        en: {
            name: 'Yellow Rust',
            remedy: 'Apply Sulfur dust.',
            advice: 'Avoid excessive nitrogen fertilization and plant resistant varieties in the next season.'
        },
        hi: {
            name: 'पीला रतवा (Yellow Rust)',
            remedy: 'सल्फर पाउडर का प्रयोग करें।',
            advice: 'अत्यधिक नाइट्रोजन उर्वरक से बचें और अगले सीजन में प्रतिरोधी किस्में लगाएं।'
        }
    }
];

// Navigation Logic
function showSection(sectionId) {
    Object.values(sections).forEach(section => section.classList.remove('active'));
    sections[sectionId].classList.add('active');
}

// Language Logic
function changeLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.innerText = translations[lang][key];
        }
    });

    // Update status indicators
    updateOnlineStatus();

    // If a result is active, update it
    if (sections.result.classList.contains('active') && currentResult) {
        updateResultUI(currentResult);
    }
}

langSelect.addEventListener('change', (e) => changeLanguage(e.target.value));

// Event Listeners
buttons.start.addEventListener('click', () => showSection('upload'));
buttons.backHome.addEventListener('click', () => showSection('home'));
buttons.newDiagnosis.addEventListener('click', () => {
    resetUpload();
    currentResult = null;
    showSection('home');
});

buttons.reset.addEventListener('click', resetUpload);

// Image Upload Logic
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            uploadBox.classList.add('hidden');
            previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

function resetUpload() {
    imageInput.value = '';
    imagePreview.src = '';
    uploadBox.classList.remove('hidden');
    previewContainer.classList.add('hidden');
}

// Dummy Result Logic
buttons.checkHealth.addEventListener('click', () => {
    buttons.checkHealth.textContent = translations[currentLang]['analyzing'];
    buttons.checkHealth.disabled = true;

    setTimeout(() => {
        const result = diagnoses[Math.floor(Math.random() * diagnoses.length)];
        currentResult = result;
        updateResultUI(result);

        buttons.checkHealth.textContent = translations[currentLang]['btn-check'];
        buttons.checkHealth.disabled = false;
        showSection('result');
    }, 1500);
});

function updateResultUI(result) {
    const diseaseName = document.getElementById('disease-name');
    const remedyText = document.getElementById('remedy-text');
    const adviceText = document.getElementById('advice-text');
    const resultCard = document.querySelector('.result-card');

    const content = result[currentLang];

    // Remove old state classes
    resultCard.classList.remove('healthy', 'diseased');
    resultCard.classList.add(result.type);

    // Update diagnosis name with confidence
    const confLabel = translations[currentLang]['confidence'];
    diseaseName.innerHTML = `${content.name} <span class="confidence-badge">(${result.confidence} ${confLabel})</span>`;

    remedyText.textContent = content.remedy;
    adviceText.textContent = content.advice;
}

// Offline Status Monitor
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

function updateOnlineStatus() {
    const statusText = document.querySelector('.status-text');
    const indicator = document.getElementById('offline-status');
    if (!statusText || !indicator) return;

    if (navigator.onLine) {
        statusText.textContent = translations[currentLang]['status-online'];
        indicator.classList.remove('offline');
    } else {
        statusText.textContent = translations[currentLang]['status-offline'];
        indicator.classList.add('offline');
    }
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.error('Service Worker registration failed', err));
    });
}
