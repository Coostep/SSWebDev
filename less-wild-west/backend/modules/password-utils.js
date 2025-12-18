/*
    This password-utils.js file contains utility functions for handling password operations.
    It includes functions for hashing passwords and comparing plain text passwords with hashed passwords.
*/
const argon2 = require('argon2');

const ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 65536,      
    timeCost: 3,            
    parallelism: 4          
};

// Validates password strength based on length, character types, and complexity requirements
function validatePassword(password) {
    const errors = [];
    
    if (!password) {
        errors.push('Password is required');
        return { valid: false, errors };
    }
    
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

// Creates a secure password hash using Argon2 algorithm with configured memory and time costs
async function hashPassword(password) {
    return await argon2.hash(password, ARGON2_OPTIONS);
}

// Compares a plain text password against stored hash using Argon2 verification
async function comparePassword(password, hash) {
    try {
        return await argon2.verify(hash, password);
    } catch (error) {
        console.error('Password comparison error:', error);
        return false;
    }
}

// Generates a cryptographically secure random token for password reset functionality
function generateResetToken() {
    return require('crypto').randomBytes(32).toString('hex');
}

module.exports = {
    validatePassword,
    hashPassword,
    comparePassword,
    generateResetToken
};