/*
    This login-tracker.js file contains utility functions for tracking login attempts.
    It includes functions for recording login attempts and checking for excessive failed attempts.
*/

const db = require('../database');

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Records a login attempt (success or failure) for tracking and security monitoring
function recordAttempt(ipAddress, username, success) {
    try {
        const stmt = db.prepare(`
            INSERT INTO login_attempts (ip_address, username, success)
            VALUES (?, ?, ?)
        `);
        stmt.run(ipAddress, username, success ? 1 : 0);
    } catch (error) {
        console.error('Error recording login attempt:', error);
    }
}

// Checks if an IP/username combination is currently locked out due to too many failed attempts
function checkLockout(ipAddress, username) {
    try {
        const cutoffTime = Date.now() - LOCKOUT_DURATION;
        
        const stmt = db.prepare(`
            SELECT COUNT(*) as count, MAX(attempt_time) as last_attempt
            FROM login_attempts
            WHERE ip_address = ? 
                AND username = ?
                AND success = 0
                AND datetime(attempt_time) > datetime(?, 'unixepoch')
        `);
        
        const result = stmt.get(ipAddress, username, cutoffTime / 1000);
        
        if (result.count >= MAX_ATTEMPTS) {
            const lastAttempt = new Date(result.last_attempt).getTime();
            const lockoutEnds = lastAttempt + LOCKOUT_DURATION;
            const remainingTime = Math.max(0, lockoutEnds - Date.now());
            
            return {
                locked: true,
                remainingTime: remainingTime,
                attempts: result.count
            };
        }
        
        return {
            locked: false,
            remainingTime: 0,
            attempts: result.count
        };
    } catch (error) {
        console.error('Error checking lockout:', error);
        return { locked: false, remainingTime: 0, attempts: 0 };
    }
}

// Removes old login attempts from database to prevent table from growing indefinitely
function cleanupOldAttempts() {
    try {
        const cutoffTime = Date.now() - LOCKOUT_DURATION;
        
        const stmt = db.prepare(`
            DELETE FROM login_attempts
            WHERE datetime(attempt_time) < datetime(?, 'unixepoch')
        `);
        
        const result = stmt.run(cutoffTime / 1000);
        return result.changes;
    } catch (error) {
        console.error('Error cleaning up login attempts:', error);
        return 0;
    }
}

// Periodically cleans up old login attempts every hour to maintain database performance
setInterval(() => {
    const deleted = cleanupOldAttempts();
    if (deleted > 0) {
        console.log(`Cleaned up ${deleted} old login attempt(s)`);
    }
}, 60 * 60 * 1000);

module.exports = {
    recordAttempt,
    checkLockout,
    cleanupOldAttempts
};