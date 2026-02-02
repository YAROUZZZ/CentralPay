// Utility functions for common database operations

const mongoose = require('mongoose');
const UnverifiedUser = require('../modules/UnverifiedUser');
const User = require('../modules/User');
const UserVerification = require('../modules/UserVerification');


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
    }
};

const createUser = async (userData) => {
    try {
        // All new users go to UnverifiedUser table first
        const newUser = new UnverifiedUser(userData);
        return await newUser.save();
    } catch (error) {
        throw new Error('Database error while creating user');
    }
};

const updateUser = async (userId, updateData) => {
    try {
        // Try to update in unverified users first
        let result = await UnverifiedUser.updateOne({ _id: userId }, updateData);
        if (result.modifiedCount > 0) return result;

        // Then update in the single User collection
        result = await User.updateOne({ _id: userId }, updateData);
        return result;
    } catch (error) {
        throw new Error('Database error while updating user');
    }
};

const moveUserToVerified = async (userId) => {
    try {
        // Find user in UnverifiedUser table
        const unverifiedUser = await UnverifiedUser.findById(userId);
        
        if (!unverifiedUser) {
            throw new Error('User not found in unverified records');
        }

        // Create user data for the single User collection (no role)
        const verifiedUserData = {
            name: unverifiedUser.name,
            email: unverifiedUser.email,
            password: unverifiedUser.password,
            verified: true
        };

        // Create new user in User table
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

module.exports = {
    findUserByEmail,
    createUser,
    updateUser,
    moveUserToVerified,
    createUserVerification,
    findUserVerification,
    deleteUserVerification
};

