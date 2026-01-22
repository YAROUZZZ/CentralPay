// User controller - handles HTTP requests and responses
const path = require("path");
const userService = require('../services/userService');
const emailService = require('../services/emailService');
const { sendSuccess } = require('../utils/response');

class UserController {
    /**
     * Handle user registration
     */
    async signup(req, res, next) {
        try {
            const { name, email, password, role } = req.body;

            // Register user through service
            const result = await userService.register({ name, email, password, role });

            // Send verification email with QR code
            await emailService.sendVerificationEmail(
                result.user,
                result.verificationString,
                result.qrCode
            );

            // Return success response
            return sendSuccess(res, 201, "User registered successfully. Check your email for verification and QR code.", {
                user: result.user,
                qrCode: result.qrCode,
                verificationUrl: result.verificationUrl
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle user authentication
     */
    async signin(req, res, next) {
        try {
            const { email, password } = req.body;

            // Authenticate user through service
            const result = await userService.authenticate({ email, password });

            // Return success response
            return sendSuccess(res, 200, "Sign in successful", result);

        } catch (error) {
            next(error);
        }
    }

    //Handle email verification
    
    async verifyEmail(req, res, next) {
        try {
            const { Id, uniqueString } = req.params;

            // Verify email through service
            const result = await userService.verifyEmail(Id, uniqueString);

            // Send success response with redirect
            res.redirect(`/user/verified?error=false`);

        } catch (error) {
            // Pass error to middleware but also try to redirect with error message
            const message = error.message;
            res.redirect(`/user/verified?error=true&message=${encodeURIComponent(message)}`);
        }
    }

  
    async getVerifiedPage(req, res, next) {
        try {
            res.sendFile(path.join(__dirname, "../views/verified.html"));
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController();
