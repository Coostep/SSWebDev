/*
    This chat.js file defines the routes for handling chat operations in the backend server.
*/

const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
    try {
        let messages = [];
        if (req.session.user) {
            messages = db.prepare(`
                SELECT cm.*, 
                       u.username, u.display_name, u.profile_color, u.profile_icon
                FROM chat_messages cm
                JOIN users u ON cm.user_id = u.id
                ORDER BY cm.created_at DESC
                LIMIT 50
            `).all();
            

            messages.forEach(msg => {
                if (msg.created_at) {
                    const date = new Date(msg.created_at);
                    msg.formattedTime = date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            });
            
            messages.reverse();
        }
        
        res.render('chat', {
            title: 'Live Chat - Wild West Forum',
            messages: messages,
            currentUser: req.session.user || null
        });
    } catch (error) {
        console.error('Error loading chat:', error);
        res.status(500).render('error', {
            title: 'Error - Wild West Forum',
            message: 'Failed to load chat'
        });
    }
});

router.get('/history', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required' 
        });
    }
    
    try {
        const limit = parseInt(req.query.limit) || 50;
        const before = req.query.before;
        
        let query = `
            SELECT cm.*, 
                   u.username, u.display_name, u.profile_color, u.profile_icon
            FROM chat_messages cm
            JOIN users u ON cm.user_id = u.id
        `;
        
        const params = [];
        
        if (before) {
            query += ` WHERE cm.created_at < ?`;
            params.push(before);
        }
        
        query += ` ORDER BY cm.created_at DESC LIMIT ?`;
        params.push(limit);
        
        const stmt = db.prepare(query);
        const messages = stmt.all(...params);
        
        res.json({
            success: true,
            messages: messages.reverse()
        });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch chat history' 
        });
    }
});

router.get('/online', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required' 
        });
    }
    
    res.json({
        success: true,
        onlineUsers: []
    });
});

module.exports = router;