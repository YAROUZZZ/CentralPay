// User controller - handles HTTP requests and responses
const userService = require('../services/userService');
const { sendSuccess } = require('../utils/response');
const mongoose = require('mongoose');
const User = require('../modules/User');
const UnverifiedUser = require('../modules/UnverifiedUser');
const UserVerification = require('../modules/UserVerification');

class UserController {
    /**
     * Handle user registration
     */
    async signup(req, res, next) {
        try {
            const { name, email, password , role} = req.body;

            // Register user through service
            const result = await userService.register({ name, email, password, role});

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
                return res.status(400).json({ success: false, message: 'Either an auth OTP or email is required to verify' });
            }

            // Verify account through service (identifier can be userId or email)
            const result = await userService.verifyAccount(identifier, otp);

            // Return success response
            return sendSuccess(res, 200, result.message, result.user);

        } catch (error) {
            next(error);
        }
    }


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

            // Delete results
            let unverifiedResult = { deletedCount: 0 };
            let verifiedResult = { deletedCount: 0 };
            let verificationResult = { deletedCount: 0 };

            if (objectId) {
                unverifiedResult = await UnverifiedUser.deleteOne({ _id: objectId });
                verifiedResult = await User.deleteOne({ _id: objectId });
                verificationResult = await UserVerification.deleteOne({ Id: objectId });
            } else {
                const sanitizedEmail = email && String(email).toLowerCase();
                unverifiedResult = await UnverifiedUser.deleteOne({ email: sanitizedEmail });
                verifiedResult = await User.deleteOne({ email: sanitizedEmail });

                const found = await UnverifiedUser.findOne({ email: sanitizedEmail }) || await User.findOne({ email: sanitizedEmail });
                if (found && found._id) {
                    verificationResult = await UserVerification.deleteOne({ Id: found._id });
                }
            }

            const totalDeleted = (unverifiedResult.deletedCount || 0) + (verifiedResult.deletedCount || 0) + (verificationResult.deletedCount || 0);

            if (totalDeleted === 0) {
                return res.status(404).json({ success: false, message: 'No matching user found to delete' });
            }

            return sendSuccess(res, 200, 'User deleted successfully', { deleted: totalDeleted });

        } catch (error) {
            next(error);
        }

    }
}

module.exports = new UserController();
