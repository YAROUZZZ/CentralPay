const path = require("path");
const { transporter } = require('../config/email');

class EmailService {
    
    //Send verification email with QR code
     
    async sendVerificationEmail(user, verificationString, qrCodeDataUrl) {
        try {
            const baseUrl = process.env.BASE_URL || "http://localhost:5000";
            const userId = user._id || user.id;
            const verificationUrl = `${baseUrl}/user/verify/${userId}/${verificationString}`;

            // Convert base64 QR code to buffer for attachment
            const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');

            const mailOptions = {
                from: process.env.AUTH_EMAIL,
                to: user.email,
                subject: "Verify your email - Registration QR Code Included",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Welcome ${user.name}!</h2>
                        <p>Thank you for registering. Please verify your email address to complete the signup and login to your account.</p>

                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #495057; margin-top: 0;">Your Registration QR Code</h3>
                            <p>Scan this QR code with our mobile app to automatically complete your registration:</p>
                            <img src="cid:qrcode" alt="Registration QR Code" style="max-width: 200px; height: auto; border: 2px solid #dee2e6; border-radius: 4px;" />
                        </div>

                        <div style="margin: 20px 0;">
                            <p><strong>Or verify manually:</strong></p>
                            <p>This link <b>expires in 1 hour</b>.</p>
                            <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email Address</a>
                        </div>

                        <p style="color: #6c757d; font-size: 14px;">
                            If you didn't create this account, please ignore this email.
                        </p>
                    </div>
                `,
                attachments: [
                    {
                        filename: 'registration-qr.png',
                        content: qrCodeBuffer,
                        cid: 'qrcode', // Content-ID for inline embedding
                        contentType: 'image/png'
                    }
                ]
            };

            await transporter.sendMail(mailOptions);

        } catch (error) {
            console.error('Email verification error:', error);
            throw new Error("Verification email failed");
        }
    }

    /*
      Send password reset email (for future use)
     
    async sendPasswordResetEmail(user, resetToken) {
        try {
            const resetUrl = `${process.env.BASE_URL || "http://localhost:5000"}/user/reset-password/${resetToken}`;

            const mailOptions = {
                from: process.env.AUTH_EMAIL,
                to: user.email,
                subject: "Password Reset Request",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Password Reset</h2>
                        <p>Hello ${user.name},</p>
                        <p>You requested a password reset. Click the button below to reset your password:</p>
                        <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">Reset Password</a>
                        <p>This link will expire in 1 hour.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);

        } catch (error) {
            console.error('Password reset email error:', error);
            throw new Error("Password reset email failed");
        }
    }*/
}

module.exports = new EmailService();
