// =============================================
// AgriScan SMS Gateway - Express Server
// Twilio-powered automated SMS alerts
// =============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Twilio Client (lazy initialization)
let twilioClient = null;

function getTwilioClient() {
    if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
    }
    return twilioClient;
}

// =============================================
// POST /send-alert - Send SMS Alert via Twilio
// =============================================

app.post('/send-alert', async (req, res) => {
    try {
        const { disease, confidence, location, phone, lang } = req.body;

        // Validate required fields
        if (!disease || !confidence) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: disease and confidence are required'
            });
        }

        // Format professional alert message (with language support)
        const alertMessage = formatAlertMessage(disease, confidence, location, phone, lang);

        // Check Twilio configuration
        const client = getTwilioClient();
        if (!client) {
            console.error('Twilio not configured - cannot send SMS');
            return res.status(503).json({
                success: false,
                error: 'SMS Gateway not configured. Please add Twilio credentials to .env file.'
            });
        }

        // Validate recipient number is configured
        if (!process.env.ALERT_RECIPIENT_NUMBER) {
            console.error('ALERT_RECIPIENT_NUMBER not configured in .env');
            return res.status(503).json({
                success: false,
                error: 'Recipient phone number not configured. Add ALERT_RECIPIENT_NUMBER to .env file.'
            });
        }

        // Send SMS via Twilio (to: must be a verified number for trial accounts)
        const message = await client.messages.create({
            body: alertMessage,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: process.env.ALERT_RECIPIENT_NUMBER
        });

        console.log(`SMS sent successfully: ${message.sid}`);

        res.status(200).json({
            success: true,
            message: 'Alert sent successfully to KVK Expert',
            messageSid: message.sid,
            alertText: alertMessage
        });

    } catch (error) {
        console.error('SMS Gateway Error:', error.message);

        res.status(500).json({
            success: false,
            error: 'Failed to send SMS alert',
            details: error.message
        });
    }
});

// =============================================
// Format Alert Message
// =============================================

function formatAlertMessage(disease, confidence, location, phone, lang) {
    // Format varies by language, kept under 160 chars for Twilio Trial

    let shortLoc = location ? location.split(',')[0] : 'N/A';
    let farmerPhone = phone || 'N/A';

    // Punjabi template
    if (lang === 'pa' || lang === 'PA') {
        return `AgriScan: ${disease} (${confidence}%). ਕਿਸਾਨ: ${farmerPhone}. ਸਥਾਨ: ${shortLoc}. ਕਿਰਪਾ ਕਰਕੇ ਕਾਲ ਕਰੋ।`;
    }

    // Hindi template
    if (lang === 'hi' || lang === 'HI') {
        return `AgriScan: ${disease} (${confidence}%). किसान: ${farmerPhone}. स्थान: ${shortLoc}. कॉल करें।`;
    }

    // Default English template
    return `AgriScan: ${disease} (${confidence}%). Farmer: ${farmerPhone}. Loc: ${shortLoc}. Call now.`;
}

// =============================================
// Health Check Endpoint
// =============================================

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'AgriScan SMS Gateway',
        twilioConfigured: !!getTwilioClient(),
        timestamp: new Date().toISOString()
    });
});

// =============================================
// Start Server
// =============================================

app.listen(PORT, () => {
    console.log(`\n🌿 AgriScan SMS Gateway running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   Send alert:   POST http://localhost:${PORT}/send-alert`);

    if (!process.env.TWILIO_ACCOUNT_SID) {
        console.log(`\n⚠️  Twilio not configured - running in demo mode`);
        console.log(`   Copy .env.example to .env and add your credentials`);
    } else {
        console.log(`\n✅ Twilio configured and ready`);
    }
    console.log('');
});
