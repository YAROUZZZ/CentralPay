// Email configuration and transporter setup
const nodemailer = require("nodemailer");
require("dotenv").config();

// Create transporter
const createTransporter = () => {
    const transporter = nodemailer.createTransport({
       host: process.env.EMAIL_HOST,
       port: process.env.EMAIL_PORT,
       secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // Verify transporter configuration
    transporter.verify((error, success) => {
        if (error) {
            console.error("Email transporter verification failed:", error);
        } else {
            console.log("Email transporter is ready:", success);
        }
    });

    return transporter;
};

// Export configured transporter
const transporter = createTransporter();

module.exports = {
    transporter
};
