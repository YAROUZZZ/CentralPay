const userService = require('../services/userService');
const { sendSuccess } = require('../utils/response');
const {deleteAccount, changeUserRole} = require('../utils/database');


class userController {
   
    async signup(req, res, next) {
        try {
            const { name, email, password } = req.body;

            const result = await userService.register({ name, email, password, role: 'business' });

            return sendSuccess(res, 201, "User registered successfully. Use the OTP sent to verify your account", {
                user: result.user,
                qrCode: result.qrCode
            });

        } catch (error) {
            next(error);
        }
    }

   
    async signin(req, res, next) {
        try {
            const { email, password } = req.body;

            const result = await userService.authenticate({ email, password});

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

            // Verify account through service
            const result = await userService.verifyAccount(identifier, otp, 'business');

            return sendSuccess(res, 200, result.message,{ user: result.user, token: result.token });

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

            const total = await deleteAccount(id, email);
            if (total === 0) {
                return res.status(404).json({ success: false, message: 'No matching user found to delete' });
            }

            return sendSuccess(res, 200, "User account deleted successfully", { deleted: total });

            }catch (error) {
            next(error);}
        }


    async changeRole(req, res, next) {
        try {
            // Extract userId from the authenticated token
            const userId = req.currentUser?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'User not authenticated' });
            }

            const result = await changeUserRole(userId);
            return sendSuccess(res, 200, "User role updated successfully", { user: result });
        }
            catch (error) {
            next(error);
        }}


    async getCurrentUser(req, res, next) {
        try {
            const userId = req.currentUser?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'User not authenticated' });
            }   


            const user = {
                
                email: req.currentUser.email,
                name: req.currentUser.name
            };
            //const user = await userService.getUserById(userId);
            return sendSuccess(res, 200, "Current user retrieved successfully", user);
        } catch (error) {
            next(error);
        }
    }


    async addDevice(req, res, next) {
        try {
            const userId = req.currentUser?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'User not authenticated' });
            }
            const { device } = req.body;
            if (!device) {
                return res.status(400).json({ success: false, message: 'Device name is required' });
            }
            
            const result = await userService.addDevice(userId, device);
            return sendSuccess(res, 200, "Device added successfully", result);
        
        } catch (error) {
            next(error);
        }}
}

module.exports = new userController();
