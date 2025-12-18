/*
    auth.js
    This middleware file contains security-related middleware functions for the application.
    It includes functions for validating API keys and enforcing HTTPS connections.
*/

const loginTracker = require('../modules/login-tracker');

// Middleware that checks if user is authenticated via session; returns 401 if not
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).json({ 
            error: 'Authentication required',
            redirect: '/login'
        });
    }
}

// Checks login lockout status for client IP/username to prevent brute-force attacks
function checkLoginLockout(req, res, next) {
    const ipAddress = getClientIP(req);
    const username = req.body?.username;
    
    if (!username) {
        return next();
    }
    
    const lockoutStatus = loginTracker.checkLockout(ipAddress, username);
    
    if (lockoutStatus.locked) {
        const minutesRemaining = Math.ceil(lockoutStatus.remainingTime / (60 * 1000));
        return res.status(429).json({
            error: 'Account locked',
            message: `Too many failed attempts. Try again in ${minutesRemaining} minute(s).`
        });
    }
    
    next();
}

// Extracts client IP address from request headers and connection properties
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.ip || 
           req.connection.remoteAddress || 
           'unknown';
}

module.exports = {
    requireAuth,
    checkLoginLockout,
    getClientIP
};