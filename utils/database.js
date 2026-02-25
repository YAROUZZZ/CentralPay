// Utility functions for common database operations

const mongoose = require('mongoose');
const NormalUser = require('../modules/normalUser');
const BusinessUser = require('../modules/businessUser');
const User = require('../modules/User');
const UnverifiedUser = require('../modules/UnverifiedUser');
const UserVerification = require('../modules/UserVerification');
const Message = require('../modules/message');
const { generateUserToken } = require('./jwt');

// Helper to get the correct model based on role
/* const getUserModel = (role = 'normal') => {
    switch (role?.toLowerCase()) {
        case 'business':
            return BusinessUser;
        case 'normal':
        default:
            return NormalUser;
    }
}; */

const changeUserRole = async (id) => {
    try {
        const user = await User.findOne({ _id: id });
        if (!user) {
            throw new Error('User not found');}
        const newRole = user.role === 'normal' ? 'business' : 'normal';
        user.role = newRole;
        const jwt = generateUserToken(user);
        await user.save();
        return { user, jwt };
    } catch (error) {
        throw new Error('Database error while changing user role: ' + error.message);
    }
}

/* const findUserByEmail = async (email, role = null) => {
    try {
        // If role specified, search only in that role's collection
        if (role) {
            const Model = getUserModel(role);
            const user = await Model.findOne({ email });
            return user ? user : null;
        }

        // Otherwise search in both collections
        let user = await NormalUser.findOne({ email });
        if (user) return user;

        user = await BusinessUser.findOne({ email });
        return user ? user : null;
    } catch (error) {
        throw new Error('Database error while finding user');
    }
};
 */


const findUserByEmail = async (email) => {
    try {
        // Search in unverified users first
        let user = await UnverifiedUser.findOne({ email });
        if (user) return user;
        // Then search in the verified User collection
        user = await User.findOne({ email });
        return user ? user : null;
    } catch (error) {
        throw new Error('Database error while finding user');
    }}



const createUser = async (userData) => {
    try {
        const newUser = new UnverifiedUser(userData);
        return await newUser.save();
    } catch (error) {
        throw new Error('Database error while creating user');
    }
};

/* const updateUser = async (userId, updateData, role = 'normal') => {
    try {
        const Model = getUserModel(role);
        const result = await Model.updateOne({ _id: userId }, updateData);
        return result;
    } catch (error) {
        throw new Error('Database error while updating user');
    }
}; */

/* const moveUserToVerified = async (userId, role = 'normal') => {
    try {
        // Find user in the collection
        //const Model = getUserModel(role);

        const user = await UnverifiedUser.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Update verified flag to true
        const result = await UnverifiedUser.updateOne({ _id: userId }, { verified: true });

        // Return the updated user
        const updatedUser = await UnverifiedUser.findById(userId);
        return updatedUser;
    } catch (error) {
        throw new Error('Database error while moving user to verified: ' + error.message);
    }
}; */


const moveUserToVerified = async (userId) => {
    try {
        // Find user in UnverifiedUser table
        const unverifiedUser = await UnverifiedUser.findById(userId);
        
        if (!unverifiedUser) {
            throw new Error('User not found in unverified records');
        }

       
        const verifiedUserData = {
            name: unverifiedUser.name,
            email: unverifiedUser.email,
            password: unverifiedUser.password,
            verified: true,
            role: unverifiedUser.role
        };


        const newVerifiedUser = new User(verifiedUserData);
        const savedUser = await newVerifiedUser.save();

        // Delete from UnverifiedUser table
        await UnverifiedUser.deleteOne({ _id: userId });

        return savedUser;
    } catch (error) {
        throw new Error('Database error while moving user to user table: ' + error.message);
    }
};

const createUserVerification = async (verificationData) => {
    try {
        const newVerification = new UserVerification(verificationData);
        return await newVerification.save();
    } catch (error) {
        throw new Error('Database error while creating verification record');
    }
};

const findUserVerification = async (userId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID format');
        }
        const objectId = new mongoose.Types.ObjectId(userId);
        const verification = await UserVerification.findOne({ Id: objectId });
        return verification;
    } catch (error) {
        throw new Error('Database error while finding verification record: ' + error.message);
    }
};

const deleteUserVerification = async (userId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID format');
        }
        const objectId = new mongoose.Types.ObjectId(userId);
        return await UserVerification.deleteOne({ Id: objectId });
    } catch (error) {
        throw new Error('Database error while deleting verification record');
    }
};

const deleteAccount = async (id, email) => {
    try {
       // const { email, id } = req.body;

        if (!email && !id) {
            throw new Error('Provide either email or id to delete the user');
        }

        let objectId = null;
        if (id && mongoose.Types.ObjectId.isValid(id)) {
            objectId = new mongoose.Types.ObjectId(id);
        }

        let userResult = { deletedCount: 0 };
        let verificationResult = { deletedCount: 0 };
        let unverifiedResult = { deletedCount: 0 };
        let messagesResult = { deletedCount: 0 };

        if (objectId) {
            // Delete all messages created by this user
            messagesResult = await Message.deleteMany({ createdBy: objectId });
            
            userResult = await User.deleteOne({ _id: objectId });
            verificationResult = await UserVerification.deleteOne({ Id: objectId });
            unverifiedResult = await UnverifiedUser.deleteOne({ _id: objectId });
        } else {
            const sanitizedEmail = email && String(email).toLowerCase();
            
            // Find user first to get their ID for message deletion
            const userToDelete = await User.findOne({ email: sanitizedEmail });
            if (userToDelete && userToDelete._id) {
                messagesResult = await Message.deleteMany({ createdBy: userToDelete._id });
                verificationResult = await UserVerification.deleteOne({ Id: userToDelete._id });
            }
            
            userResult = await User.deleteOne({ email: sanitizedEmail });
            unverifiedResult = await UnverifiedUser.deleteOne({ email: sanitizedEmail });
        }

        const totalDeleted = (userResult.deletedCount || 0) + (verificationResult.deletedCount || 0) + (unverifiedResult.deletedCount || 0) + (messagesResult.deletedCount || 0);

        return totalDeleted;

    } catch (error) {
        throw new Error('Database error while deleting account: ' + error.message);
    }}


const findUserById = async (userId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return null;
        }
        
        // البحث في جدول المستخدمين المتحققين
        const user = await User.findById(userId);
        if (user) return user;
        
        // البحث في جدول المستخدمين غير المتحققين
        const unverifiedUser = await UnverifiedUser.findById(userId);
        return unverifiedUser ? unverifiedUser : null;
    } catch (error) {
        throw new Error('Database error while finding user by ID: ' + error.message);
    }
};


module.exports = {
    findUserByEmail,
    createUser,

    moveUserToVerified,
    createUserVerification,
    findUserVerification,
    deleteUserVerification,

    changeUserRole,
    deleteAccount,
    findUserById
};







