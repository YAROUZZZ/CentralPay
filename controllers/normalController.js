// Normal User controller - handles HTTP requests for normal users
const userService = require('../services/userService');
const { sendSuccess } = require('../utils/response');
const mongoose = require('mongoose');
const NormalUser = require('../modules/normalUser');
const UserVerification = require('../modules/UserVerification');

class NormalUserController {
    /**
     * Handle normal user registration
     */
    async signup(req, res, next) {
        try {
            const { name, email, password } = req.body;

            // Register user with role = normal
            const result = await userService.register({ name, email, password, role: 'normal' });

            return sendSuccess(res, 201, "User registered successfully. Use the OTP sent to verify your account", {
                user: result.user,
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

            // Authenticate user - only searches in normal users
            const result = await userService.authenticate({ email, password, role: 'normal' });

            return sendSuccess(res, 200, "Sign in successful", result);

        } catch (error) {
            next(error);
        }
    }

    /**
     * Verify account with OTP
     */
    async verifyAccount(req, res, next) {
        try {
            const { otp, email } = req.body;

            if (!otp) {
                return res.status(400).json({ success: false, message: 'OTP is required' });
            }

            const identifier = req.currentUser?.userId || email;
            if (!identifier) {
                return res.status(400).json({ success: false, message: 'Either an auth OTP or email is required to verify' });
            }

            // Verify account through service
            const result = await userService.verifyAccount(identifier, otp, 'normal');

            return sendSuccess(res, 200, result.message, result.user);

        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete account
     */
    async deleteAccount(req, res, next) {
        try {
            const { email, id } = req.body;

            if (!email && !id) {
                return res.status(400).json({ success: false, message: 'Provide either email or id to delete the user' });
            }

            let objectId = null;
            if (id && mongoose.Types.ObjectId.isValid(id)) {
                objectId = new mongoose.Types.ObjectId(id);
            }

            let normalResult = { deletedCount: 0 };
            let verificationResult = { deletedCount: 0 };

            if (objectId) {
                normalResult = await NormalUser.deleteOne({ _id: objectId });
                verificationResult = await UserVerification.deleteOne({ Id: objectId });
            } else {
                const sanitizedEmail = email && String(email).toLowerCase();
                normalResult = await NormalUser.deleteOne({ email: sanitizedEmail });

                const found = await NormalUser.findOne({ email: sanitizedEmail });
                if (found && found._id) {
                    verificationResult = await UserVerification.deleteOne({ Id: found._id });
                }
            }

            const totalDeleted = (normalResult.deletedCount || 0) + (verificationResult.deletedCount || 0);

            if (totalDeleted === 0) {
                return res.status(404).json({ success: false, message: 'No matching user found to delete' });
            }

            return sendSuccess(res, 200, 'User deleted successfully', { deleted: totalDeleted });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new NormalUserController();
