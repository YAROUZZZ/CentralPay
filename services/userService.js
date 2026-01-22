// User service - handles all user-related business logic
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require("uuid");
const AppError = require('../utils/appError');

// Import utilities
const { findUserByEmail, createUser, createUserVerification, findUserVerification, deleteUserVerification, moveUserToRoleTable } = require('../utils/database');
const { validateEmail, validateName, validatePassword, validateRequiredFields, sanitizeInput, validateRole, getDefaultRole } = require('../utils/validation');
const { generateUserToken } = require('../utils/jwt');
const { generateRegistrationQR } = require('../utils/qrcode');

class UserService {
    /**
     * Register a new user
     */
    async register(userData) {
        const { name, email, password, role } = userData;

        // Sanitize inputs
        const sanitizedData = {
            name: sanitizeInput(name),
            email: sanitizeInput(email),
            password: sanitizeInput(password),
            role: role ? sanitizeInput(role) : getDefaultRole()
        };

        // Validate required fields
        const missingFields = validateRequiredFields(sanitizedData, ['name', 'email', 'password']);
        if (missingFields) {
            throw AppError.create(missingFields, 400);
        }

        // Validate input formats
        if (!validateName(sanitizedData.name)) {
            throw AppError.create("Invalid name entered", 400);
        }

        if (!validateEmail(sanitizedData.email)) {
            throw AppError.create("Invalid email entered", 400);
        }

        if (!validatePassword(sanitizedData.password)) {
            throw AppError.create("Password must be at least 8 characters long", 400);
        }

        if (!validateRole(sanitizedData.role)) {
            throw AppError.create("Invalid role. Must be one of: normal, business, admin", 400);
        }

        // Check if user already exists
        const existingUser = await findUserByEmail(sanitizedData.email);
        if (existingUser) {
            throw AppError.create("User already exists", 409);
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(sanitizedData.password, saltRounds);

        // Create user
        const userDataForDB = {
            name: sanitizedData.name,
            email: sanitizedData.email,
            password: hashedPassword,
            verified: false,
            role: sanitizedData.role
        };

        const newUser = await createUser(userDataForDB);

        // Create verification record
        const uniqueString = uuidv4();
        const hashedUniqueString = await bcrypt.hash(uniqueString, saltRounds);

        const verificationData = {
            Id: newUser._id,
            uniqueString: hashedUniqueString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000
        };

        await createUserVerification(verificationData);

        // Generate QR code
        const qrCodeData = {
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            verificationString: uniqueString
        };

        const qrCode = await generateRegistrationQR(qrCodeData);

        return {
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            },
            qrCode,
            verificationString: uniqueString,
            verificationUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/user/verify/${newUser._id}/${uniqueString}`
        };
    }

    /**
     * Authenticate user and generate token
     */
    async authenticate({ email, password }) {
        // Sanitize inputs
        const sanitizedEmail = sanitizeInput(email);
        const sanitizedPassword = sanitizeInput(password);

        // Validate required fields
        const missingFields = validateRequiredFields({ email: sanitizedEmail, password: sanitizedPassword }, ['email', 'password']);
        if (missingFields) {
            throw AppError.create(missingFields, 400);
        }

        // Find user
        const user = await findUserByEmail(sanitizedEmail);
        if (!user) {
            throw AppError.create("Invalid credentials entered!", 401);
        }

        // Check if email is verified
        if (!user.verified) {
            throw AppError.create("Email hasn't been verified yet. Check your inbox", 403);
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(sanitizedPassword, user.password);
        if (!isPasswordValid) {
            throw AppError.create("Invalid credentials entered!", 401);
        }

        // Generate JWT token
        const token = generateUserToken(user);

        return {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                verified: user.verified
            },
            token
        };
    }

    // Verify user email
    
    async verifyEmail(userId, uniqueString) {
       
        const verification = await findUserVerification(userId);

        if (!verification) {
            throw AppError.create("Account record doesn't exist or has been verified already. Please sign up or log in.", 404);
        }

        const { expiresAt, uniqueString: hashedUniqueString } = verification;

        // Check if link has expired
        if (expiresAt < Date.now()) {
            await deleteUserVerification(userId);
            throw AppError.create("Link has expired. Please sign up again", 410);
        }

        // Verify the unique string
        const isValidString = await bcrypt.compare(uniqueString, hashedUniqueString);
        
        if (!isValidString) {
            throw AppError.create("Invalid verification details passed. Check your inbox.", 400);
        }

        // Move user from UnverifiedUser to appropriate role table
        const moveResult = await moveUserToRoleTable(userId);
        
        // Clean up verification record
        console.log('Deleting verification record...');
        const deleteResult = await deleteUserVerification(userId);
        console.log('Delete result:', deleteResult);

        return { success: true, message: "Email verified successfully" };
    }
}

module.exports = new UserService();
