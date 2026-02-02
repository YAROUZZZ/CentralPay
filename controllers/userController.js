// User controller - handles HTTP requests and responses
const userService = require('../services/userService');
const { sendSuccess } = require('../utils/response');

class UserController {
    /**
     * Handle user registration
     */
    async signup(req, res, next) {
        try {
            const { name, email, password } = req.body;

            // Register user through service
            const result = await userService.register({ name, email, password});

            // Return success response with token and QR code
            return sendSuccess(res, 201, "User registered successfully. Use the OTP sent to verify your account", {
                user: result.user,
                //token: result.token,
                qrCode: result.qrCode
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

    
    async verifyAccount(req, res, next) {
        try {
            const { otp, email } = req.body;

            if (!otp) {
                return res.status(400).json({ success: false, message: 'OTP is required' });
            }

            const identifier = req.currentUser?.userId || email;
            if (!identifier) {
                return res.status(400).json({ success: false, message: 'Either an auth token or email is required to verify' });
            }

            // Verify account through service (identifier can be userId or email)
            const result = await userService.verifyAccount(identifier, otp);

            // Return success response
            return sendSuccess(res, 200, result.message, result.user);

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController();
