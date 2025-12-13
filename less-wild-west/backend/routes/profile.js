/*
    This profile.js file defines the routes for handling user profile-related operations in the backend server.
*/

const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth } = require('../middleware/auth');
const passwordUtils = require('../modules/password-utils');
const emailService = require('../modules/email-service');

router.get('/', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    
    try {
        const user = db.prepare(`
            SELECT * FROM users WHERE id = ?
        `).get(userId);

        const comments = db.prepare(`
            SELECT * FROM comments 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 10
        `).all(userId);
        
        res.render('profile', {
            title: 'My Profile - Wild West Forum',
            user: user,
            comments: comments,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error loading profile:', error);
        res.status(500).render('error', {
            title: 'Error - Wild West Forum',
            message: 'Failed to load profile'
        });
    }
});

router.post('/password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.user.id;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.redirect('/profile?error=All+fields+are+required');
        }
        
        if (newPassword !== confirmPassword) {
            return res.redirect('/profile?error=New+passwords+do+not+match');
        }
        
        const validation = passwordUtils.validatePassword(newPassword);
        if (!validation.valid) {
            return res.redirect(`/profile?error=${encodeURIComponent(validation.errors.join(', '))}`);
        }

        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);

        const passwordMatch = await passwordUtils.comparePassword(currentPassword, user.password_hash);
        if (!passwordMatch) {
            return res.redirect('/profile?error=Current+password+is+incorrect');
        }

        const newHash = await passwordUtils.hashPassword(newPassword);

        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);

        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
            }
            res.redirect('/login?success=Password+changed+successfully.+Please+login+again');
        });
    } catch (error) {
        console.error('Error updating password:', error);
        res.redirect('/profile?error=Failed+to+update+password');
    }
});

router.post('/email', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newEmail, confirmEmail } = req.body;
        const userId = req.session.user.id;

        if (!currentPassword || !newEmail || !confirmEmail) {
            return res.redirect('/profile?error=All+fields+are+required');
        }
        
        if (newEmail !== confirmEmail) {
            return res.redirect('/profile?error=Email+addresses+do+not+match');
        }
        
        if (!newEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.redirect('/profile?error=Invalid+email+format');
        }

        const existingUser = db.prepare(`
            SELECT id FROM users WHERE email = ? AND id != ?
        `).get(newEmail, userId);
        
        if (existingUser) {
            return res.redirect('/profile?error=Email+already+in+use');
        }
        
        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
        
        const passwordMatch = await passwordUtils.comparePassword(currentPassword, user.password_hash);
        if (!passwordMatch) {
            return res.redirect('/profile?error=Current+password+is+incorrect');
        }

        db.prepare('UPDATE users SET email = ? WHERE id = ?').run(newEmail, userId);

        await emailService.sendEmailConfirmation(newEmail, req.session.user.username);

        req.session.user.email = newEmail;
        
        res.redirect('/profile?success=Email+updated+successfully');
    } catch (error) {
        console.error('Error updating email:', error);
        res.redirect('/profile?error=Failed+to+update+email');
    }
});

router.post('/display-name', requireAuth, (req, res) => {
    try {
        const { displayName } = req.body;
        const userId = req.session.user.id;
        
        if (!displayName || displayName.trim().length === 0) {
            return res.redirect('/profile?error=Display+name+is+required');
        }
        
        if (displayName.trim() === req.session.user.username) {
            return res.redirect('/profile?error=Display+name+cannot+be+same+as+username');
        }

        db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName.trim(), userId);
        
        req.session.user.displayName = displayName.trim();
        
        res.redirect('/profile?success=Display+name+updated+successfully');
    } catch (error) {
        console.error('Error updating display name:', error);
        res.redirect('/profile?error=Failed+to+update+display+name');
    }
});

router.post('/customization', requireAuth, (req, res) => {
    try {
        const { profileColor, profileIcon, bio } = req.body;
        const userId = req.session.user.id;
        
        const colorRegex = /^#[0-9A-F]{6}$/i;
        if (profileColor && !colorRegex.test(profileColor)) {
            return res.redirect('/profile?error=Invalid+color+format');
        }
        
        db.prepare(`
            UPDATE users 
            SET profile_color = COALESCE(?, profile_color),
                profile_icon = COALESCE(?, profile_icon),
                bio = ?
            WHERE id = ?
        `).run(profileColor, profileIcon, bio, userId);
        

        if (profileColor) req.session.user.color = profileColor;
        if (profileIcon) req.session.user.icon = profileIcon;
        
        res.redirect('/profile?success=Profile+updated+successfully');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.redirect('/profile?error=Failed+to+update+profile');
    }
});

module.exports = router;