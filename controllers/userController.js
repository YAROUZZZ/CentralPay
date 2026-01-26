// User controller - handles HTTP requests and responses
const userService = require('../services/userService');
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

            // Return success response with token and QR code
            return sendSuccess(res, 201, "User registered successfully. Use the token to verify your account.", {
                user: result.user,
                token: result.token,
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

    /**
     * Handle account verification (using token in Authorization header)
     */
    async verifyAccount(req, res, next) {
        try {
            // Get userId from the authenticated request (set by auth middleware)
            const userId = req.currentUser.userId;

            // Verify account through service
            const result = await userService.verifyAccount(userId);

            // Return success response
            return sendSuccess(res, 200, result.message, result.user);

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController();
