// User service - handles all user-related business logic
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require("uuid");
const AppError = require('../utils/appError');

// Import utilities
const { findUserByEmail, createUser, moveUserToRoleTable } = require('../utils/database');
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

        // Create user in UnverifiedUser table
        const userDataForDB = {
            name: sanitizedData.name,
            email: sanitizedData.email,
            password: hashedPassword,
            verified: false,
            role: sanitizedData.role
        };

        const newUser = await createUser(userDataForDB);

        // Generate JWT token for verification (no email verification needed)
        const verificationToken = generateUserToken(newUser);

        // Generate QR code with all necessary data
        const qrCodeData = {
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            verificationToken: verificationToken
        };

        const qrCode = await generateRegistrationQR(qrCodeData);

        return {
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            },
            token: verificationToken,
            qrCode
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

        // Find user - only search in verified tables (not UnverifiedUser)
        const user = await findUserByEmail(sanitizedEmail);
        if (!user) {
            throw AppError.create("Invalid credentials entered!", 401);
        }

        // Check if user is verified
        if (!user.verified) {
            throw AppError.create("Please verify your account first using the token sent during registration", 403);
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

    /**
     * Verify user account using token (no email required)
     */
    async verifyAccount(userId) {
        try {
            // Move user from UnverifiedUser to appropriate role table
            const verifiedUser = await moveUserToRoleTable(userId);

            return {
                success: true,
                message: "Account verified successfully",
                user: {
                    id: verifiedUser._id,
                    name: verifiedUser.name,
                    email: verifiedUser.email,
                    role: verifiedUser.role,
                    verified: verifiedUser.verified
                }
            };
        } catch (error) {
            throw AppError.create(error.message, 400);
        }
    }
}

module.exports = new UserService();
