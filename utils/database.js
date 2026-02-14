// Utility functions for common database operations

const mongoose = require('mongoose');
const NormalUser = require('../modules/normalUser');
const BusinessUser = require('../modules/businessUser');
const UserVerification = require('../modules/UserVerification');

// Helper to get the correct model based on role
const getUserModel = (role = 'normal') => {
    switch(role?.toLowerCase()) {
        case 'business':
            return BusinessUser;
        case 'normal':
        default:
            return NormalUser;
    }
};

const findUserByEmail = async (email, role = null) => {
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

const createUser = async (userData, role = 'normal') => {
    try {
        const Model = getUserModel(role);
        const newUser = new Model(userData);
        return await newUser.save();
    } catch (error) {
        throw new Error('Database error while creating user');
    }
};

const updateUser = async (userId, updateData, role = 'normal') => {
    try {
        const Model = getUserModel(role);
        const result = await Model.updateOne({ _id: userId }, updateData);
        return result;
    } catch (error) {
        throw new Error('Database error while updating user');
    }
};

const moveUserToVerified = async (userId, role = 'normal') => {
    try {
        // Find user in the collection
        const Model = getUserModel(role);
        
        const user = await Model.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Update verified flag to true
        const result = await Model.updateOne({ _id: userId }, { verified: true });
        
        // Return the updated user
        const updatedUser = await Model.findById(userId);
        return updatedUser;
    } catch (error) {
        throw new Error('Database error while moving user to verified: ' + error.message);
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
    deleteUserVerification,
    getUserModel
};