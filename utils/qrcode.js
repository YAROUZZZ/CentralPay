// QR code utility functions for registration data
const QRCode = require('qrcode');

const generateRegistrationQR = async (userData) => {
    try {
        // Create registration data object for QR code
        const qrData = {
            type: 'user_registration',
            name: userData.name,
            email: userData.email,
            role: userData.role,
            timestamp: new Date().toISOString(),
            // Include verification URL for mobile app
            verificationUrl: `http://localhost:5000/user/verify/${userData._id}/${userData.verificationString}`
        };

        // Generate QR code as data URL (base64 image)
        const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        return qrCodeDataURL;
    } catch (error) {
        throw new Error('Failed to generate QR code');
    }
};

const generateRegistrationQRText = (userData) => {
    // Create registration data object for QR code (text format)
    const qrData = {
        type: 'user_registration',
        name: userData.name,
        email: userData.email,
        role: userData.role,
        timestamp: new Date().toISOString(),
        verificationUrl: `http://localhost:5000/user/verify/${userData._id}/${userData.verificationString}`
    };

    return JSON.stringify(qrData);
};

module.exports = {
    generateRegistrationQR,
    generateRegistrationQRText
};

