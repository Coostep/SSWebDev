/*
    This password-recovery.js file defines the routes for handling password recovery operations in the backend server.
*/

const express = require('express');
const router = express.Router();
const db = require('../database');
const passwordUtils = require('../modules/password-utils');
const emailService = require('../modules/email-service');

// Renders the forgot password page where users can request a password reset
router.get('/forgot', (req, res) => {
    res.render('forgot-password', {
        title: 'Forgot Password - Wild West Forum',
        error: null,
        success: null
    });
});

// Processes forgot password request, generates reset token, and sends reset email
router.post('/forgot', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.render('forgot-password', {
                title: 'Forgot Password - Wild West Forum',
                error: 'Email is required',
                success: null
            });
        }

        const user = db.prepare('SELECT id, username, email FROM users WHERE email = ?').get(email);

        if (!user) {
            console.log(`Password reset requested for non-existent email: ${email}`);
            return res.render('forgot-password', {
                title: 'Forgot Password - Wild West Forum',
                error: null,
                success: 'If an account exists with that email, a password reset link has been sent.'
            });
        }

        const token = passwordUtils.generateResetToken();
        const expiresAt = new Date(Date.now() + (60 * 60 * 1000));
 
        db.prepare(`
            INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES (?, ?, ?)
        `).run(user.id, token, expiresAt.toISOString());

        const resetUrl = `${req.protocol}://${req.get('host')}/password/reset/${token}`;
        await emailService.sendPasswordResetEmail(user.email, user.username, token, resetUrl);
        
        res.render('forgot-password', {
            title: 'Forgot Password - Wild West Forum',
            error: null,
            success: 'If an account exists with that email, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('Error processing password reset request:', error);
        res.render('forgot-password', {
            title: 'Forgot Password - Wild West Forum',
            error: 'An error occurred. Please try again.',
            success: null
        });
    }
});

// Validates reset token and renders password reset form if token is valid
router.get('/reset/:token', (req, res) => {
    const { token } = req.params;
    
    try {
        const tokenRecord = db.prepare(`
            SELECT * FROM password_reset_tokens 
            WHERE token = ? AND used = 0 AND expires_at > datetime('now')
        `).get(token);
        
        if (!tokenRecord) {
            return res.render('reset-password', {
                title: 'Reset Password - Wild West Forum',
                token: token,
                error: 'Invalid or expired reset token.',
                success: null,
                valid: false
            });
        }
        
        res.render('reset-password', {
            title: 'Reset Password - Wild West Forum',
            token: token,
            error: null,
            success: null,
            valid: true
        });
    } catch (error) {
        console.error('Error validating reset token:', error);
        res.render('reset-password', {
            title: 'Reset Password - Wild West Forum',
            token: token,
            error: 'An error occurred. Please try again.',
            success: null,
            valid: false
        });
    }
});

// Processes password reset form, updates password, and invalidates reset token
router.post('/reset/:token', async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    
    try {
        const tokenRecord = db.prepare(`
            SELECT * FROM password_reset_tokens 
            WHERE token = ? AND used = 0 AND expires_at > datetime('now')
        `).get(token);
        
        if (!tokenRecord) {
            return res.render('reset-password', {
                title: 'Reset Password - Wild West Forum',
                token: token,
                error: 'Invalid or expired reset token.',
                success: null,
                valid: false
            });
        }

        if (!password || !confirmPassword) {
            return res.render('reset-password', {
                title: 'Reset Password - Wild West Forum',
                token: token,
                error: 'Both password fields are required.',
                success: null,
                valid: true
            });
        }
        
        if (password !== confirmPassword) {
            return res.render('reset-password', {
                title: 'Reset Password - Wild West Forum',
                token: token,
                error: 'Passwords do not match.',
                success: null,
                valid: true
            });
        }
        
        const validation = passwordUtils.validatePassword(password);
        if (!validation.valid) {
            return res.render('reset-password', {
                title: 'Reset Password - Wild West Forum',
                token: token,
                error: `Password requirements: ${validation.errors.join(', ')}`,
                success: null,
                valid: true
            });
        }
        
        const passwordHash = await passwordUtils.hashPassword(password);
        
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, tokenRecord.user_id);

        db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(tokenRecord.id);
        
        db.prepare(`
            UPDATE users 
            SET failed_login_attempts = 0, account_locked_until = NULL 
            WHERE id = ?
        `).run(tokenRecord.user_id);
        
        res.redirect('/login?success=Password+reset+successfully.+Please+login+with+your+new+password');
    } catch (error) {
        console.error('Error resetting password:', error);
        res.render('reset-password', {
            title: 'Reset Password - Wild West Forum',
            token: token,
            error: 'An error occurred. Please try again.',
            success: null,
            valid: true
        });
    }
});

module.exports = router;