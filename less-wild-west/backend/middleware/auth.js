/*
    auth.js
    This middleware file contains security-related middleware functions for the application.
    It includes functions for validating API keys and enforcing HTTPS connections.
*/

const loginTracker = require('../modules/login-tracker');

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