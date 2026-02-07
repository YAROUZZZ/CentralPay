// Email configuration and transporter setup
const nodemailer = require("nodemailer");
require("dotenv").config();

// Create transporter
const createTransporter = () => {
    const transporter = nodemailer.createTransport({
       host: process.env.EMAIL_HOST,
       port: parseInt(process.env.EMAIL_PORT, 10),
       secure: false,
       family: 4,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
          tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
    });

    // Verify transporter configuration
   /* transporter.verify((error, success) => {
        if (error) {
            console.error("Email transporter verification failed:", error);
        } else {
            console.log("Email transporter is ready:", success);
        }
    });*/

    return transporter;
};

// Export configured transporter
const transporter = createTransporter();

module.exports = {
    transporter
};
