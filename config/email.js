// Email configuration and transporter setup
const nodemailer = require("nodemailer");
require("dotenv").config();

// Create transporter
const createTransporter = () => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.AUTH_EMAIL,
            pass: process.env.AUTH_PASS
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
