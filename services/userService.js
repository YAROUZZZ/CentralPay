// User service - handles all user-related business logic
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require("uuid");
const AppError = require('../utils/appError');

// Import utilities
const { findUserByEmail, createUser, createUserVerification, findUserVerification, deleteUserVerification, moveUserToVerified } = require('../utils/database');
const { validateEmail, validateName, validatePassword, validateRequiredFields, sanitizeInput, validateRole } = require('../utils/validation');
const { generateUserToken } = require('../utils/jwt');
const { generateRegistrationQR } = require('../utils/qrcode');
const emailService = require('./emailService');

class UserService {
    /**
     * Register a new user
     */
    async register(userData) {
        const { name, email, password, role} = userData;

        // Sanitize inputs
        const sanitizedData = {
            name: sanitizeInput(name),
            email: sanitizeInput(email),
            password: sanitizeInput(password),
            role: sanitizeInput(role)
        };

        // Validate required fields
        const missingFields = validateRequiredFields(sanitizedData, ['name', 'email', 'password', 'role']);
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
            throw AppError.create("Role must be one of: Normal, Business", 400);
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
           // role: sanitizedData.role,
            verified: false,
        };

        const newUser = await createUser(userDataForDB);

        // Generate JWT token for verification (no email verification needed)
        const verificationToken = generateUserToken(newUser);

        // Generate 6-digit OTP and store hashed version in verification table
        const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
        const hashedOtp = await bcrypt.hash(otp, saltRounds);

        const verificationData = {
            Id: newUser._id,
            otp: hashedOtp,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000 // 1 hour
        };

        await createUserVerification(verificationData);

        // Send OTP via email
        try {
            await emailService.sendVerificationEmail(newUser, otp);
        } catch (err) {
            console.error('Failed to send OTP email:', err);
            // do not fail registration if email sending fails, just log it
        }

        // Generate QR code with all necessary data (include verificationToken)
        const qrCodeData = {
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            verified: newUser.verified
          //  verificationToken: verificationToken
        };

        const qrCode = await generateRegistrationQR(qrCodeData);

        return {
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                verified: newUser.verified
            },
           // token: verificationToken,
            qrCode
        };
    }

    
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
        const qrCodeData = {
            _id: user._id,
            name: user.name,
            email: user.email,
          //  verificationToken: verificationToken
        };

        const qrCode = await generateRegistrationQR(qrCodeData);
        return {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                verified: user.verified
            },
            qrCode
            //token
        };
    }

    /**
     * Verify user account using token (no email required)
     */
    async verifyAccount(identifier, otp) {
        try {
            // identifier can be userId or email
            let userId = identifier;

            // If identifier is an email, resolve to the unverified user id
            if (typeof identifier === 'string' && identifier.includes('@')) {
                const user = await findUserByEmail(identifier);
                if (!user) {
                    throw new Error('User not found');
                }
                // If user already verified (returned User model), reject
                if (user.verified) {
                    throw new Error('Account already verified');
                }
                userId = user._id;
            }

            // Validate OTP record
            const verification = await findUserVerification(userId);
            if (!verification) {
                throw new Error("Invalid or expired OTP. Please request a new one.");
            }

            // Check expiry
            if (verification.expiresAt < Date.now()) {
                await deleteUserVerification(userId);
                throw new Error("OTP has expired. Please request a new one.");
            }

            // Verify OTP
            const isValidOtp = await bcrypt.compare(otp, verification.otp);
            if (!isValidOtp) {
                throw new Error("Invalid OTP provided. Please check your email.");
            }

            // Move user from UnverifiedUser to verified User table
            const verifiedUser = await moveUserToVerified(userId);

            // Clean up verification record
            await deleteUserVerification(userId);

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