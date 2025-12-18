/*
    This auth.js file sets up the main application routes for the backend server.
*/

const express = require('express');
const router = express.Router();
const db = require('../database');
const passwordUtils = require('../modules/password-utils');
const loginTracker = require('../modules/login-tracker');
const { checkLoginLockout, getClientIP } = require('../middleware/auth');
const markdownParser = require('../modules/markdown-parser');

// Renders the login page if user is not already logged in
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { 
        title: 'Login - Wild West Forum',
        error: null 
    });
});

// Processes login form submission with security checks and lockout prevention
router.post('/login', checkLoginLockout, async (req, res) => {
    try {
        const { username, password } = req.body;
        const ipAddress = getClientIP(req);
        
        if (!username || !password) {
            loginTracker.recordAttempt(ipAddress, username || 'unknown', false);
            return res.render('login', {
                title: 'Login - Wild West Forum',
                error: 'Username and password are required'
            });
        }
        
        const user = db.prepare(`
            SELECT * FROM users 
            WHERE username = ? 
            AND (account_locked_until IS NULL OR account_locked_until < datetime('now'))
        `).get(username);
        
        if (!user) {
            loginTracker.recordAttempt(ipAddress, username, false);
            return res.render('login', {
                title: 'Login - Wild West Forum',
                error: 'Invalid username or password'
            });
        }
        
        const passwordMatch = await passwordUtils.comparePassword(password, user.password_hash);
        
        if (!passwordMatch) {
            db.prepare(`
                UPDATE users 
                SET failed_login_attempts = failed_login_attempts + 1
                WHERE id = ?
            `).run(user.id);
            
            const newAttempts = user.failed_login_attempts + 1;
            if (newAttempts >= 5) {
                const lockoutTime = new Date(Date.now() + (15 * 60 * 1000));
                db.prepare(`
                    UPDATE users 
                    SET account_locked_until = ?,
                        failed_login_attempts = ?
                    WHERE id = ?
                `).run(lockoutTime.toISOString(), newAttempts, user.id);
                
                loginTracker.recordAttempt(ipAddress, username, false);
                return res.render('login', {
                    title: 'Login - Wild West Forum',
                    error: 'Account locked due to too many failed attempts. Try again in 15 minutes.'
                });
            }
            
            loginTracker.recordAttempt(ipAddress, username, false);
            return res.render('login', {
                title: 'Login - Wild West Forum',
                error: `Invalid username or password (${4 - newAttempts} attempts remaining)`
            });
        }
        
        db.prepare(`
            UPDATE users 
            SET failed_login_attempts = 0,
                account_locked_until = NULL
            WHERE id = ?
        `).run(user.id);
        
        loginTracker.recordAttempt(ipAddress, username, true);
          
        req.session.user = {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            email: user.email,
            color: user.profile_color,
            icon: user.profile_icon
        };
        
        res.redirect('/');
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', {
            title: 'Login - Wild West Forum',
            error: 'An error occurred during login'
        });
    }
});

// Renders the registration page if user is not already logged in
router.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('register', { 
        title: 'Register - Wild West Forum',
        error: null 
    });
});

// Processes registration form submission with validation and user creation
router.post('/register', async (req, res) => {
    try {
        const { username, email, displayName, password, confirmPassword } = req.body;
        

        if (!username || !email || !displayName || !password || !confirmPassword) {
            return res.render('register', {
                title: 'Register - Wild West Forum',
                error: 'All fields are required'
            });
        }
        
        if (password !== confirmPassword) {
            return res.render('register', {
                title: 'Register - Wild West Forum',
                error: 'Passwords do not match'
            });
        }
        
        const validation = passwordUtils.validatePassword(password);
        if (!validation.valid) {
            return res.render('register', {
                title: 'Register - Wild West Forum',
                error: `Password requirements: ${validation.errors.join(', ')}`
            });
        }
        
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.render('register', {
                title: 'Register - Wild West Forum',
                error: 'Invalid email format'
            });
        }
        
        if (username === displayName) {
            return res.render('register', {
                title: 'Register - Wild West Forum',
                error: 'Username and display name must be different'
            });
        }
        
        const existingUser = db.prepare(`
            SELECT id FROM users WHERE username = ? OR email = ?
        `).get(username, email);
        
        if (existingUser) {
            return res.render('register', {
                title: 'Register - Wild West Forum',
                error: 'Username or email already exists'
            });
        }
        
        const passwordHash = await passwordUtils.hashPassword(password);
        
        const stmt = db.prepare(`
            INSERT INTO users (username, email, display_name, password_hash)
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(username, email, displayName, passwordHash);
        
    
        req.session.user = {
            id: result.lastInsertRowid,
            username: username,
            displayName: displayName,
            email: email,
            color: '#8B4513',
            icon: '🤠'
        };
        
        res.redirect('/');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('register', {
            title: 'Register - Wild West Forum',
            error: 'An error occurred during registration'
        });
    }
});

// Handles user logout by destroying session and redirecting to home
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

module.exports = router;