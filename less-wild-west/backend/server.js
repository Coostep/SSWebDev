/*
    server.js file for Less Wild West backend
    This file sets up the Express server, configures middleware,
    handles routing, and manages user sessions.
*/
const express = require('express');
const http = require('http');
const session = require('express-session');
const { Server } = require('socket.io');
const path = require('path');
const cookieParser = require('cookie-parser');
const hbs = require('hbs');

// Custom modules
const db = require('./database');
const SQLiteStore = require('./sqlite-session-store');
const authMiddleware = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const commentRoutes = require('./routes/comments');
const profileRoutes = require('./routes/profile');
const passwordRoutes = require('./routes/password-recovery');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configure view engine
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
const sessionStore = new SQLiteStore();
const sessionMiddleware = session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
    }
});

app.use(sessionMiddleware);

// Share session with Socket.IO
io.engine.use(sessionMiddleware);

// Global view variables
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.sessionId = req.sessionID;
    next();
});

// Routes
app.use('/', authRoutes);
app.use('/comments', commentRoutes);
app.use('/profile', profileRoutes);
app.use('/password', passwordRoutes);
app.use('/chat', chatRoutes);

// Home route
app.get('/', (req, res) => {
    res.render('home', {
        title: 'Wild West Forum - Secure Edition',
        features: [
            'Password hashing',
            'SQLite3 database persistence',
            'Account lockout protection',
            'Email-based password recovery',
            'Real-time chat',
            'Enhanced comment system'
        ]
    });
});

// Socket.IO connection handler
io.on('connection', (socket) => {
    const session = socket.request.session;
    
    // Only allow authenticated users to use chat
    if (!session || !session.user) {
        socket.disconnect();
        return;
    }
    
    console.log(`User ${session.user.username} connected to chat`);
    
    // Join user to their personal room
    socket.join(`user_${session.user.id}`);
    
    // Handle chat messages
    socket.on('chatMessage', async (data) => {
        try {
            const { message } = data;
            
            if (!message || message.trim().length === 0) {
                return;
            }
            
            // Store message in database
            const stmt = db.prepare(`
                INSERT INTO chat_messages (user_id, message) 
                VALUES (?, ?)
            `);
            const result = stmt.run(session.user.id, message.trim());
            
            // Get user info for the message
            const userStmt = db.prepare(`
                SELECT username, display_name, profile_color, profile_icon
                FROM users WHERE id = ?
            `);
            const user = userStmt.get(session.user.id);
            
            // Broadcast message to all connected users
            io.emit('chatMessage', {
                id: result.lastInsertRowid,
                user: {
                    id: session.user.id,
                    username: user.username,
                    displayName: user.display_name,
                    color: user.profile_color,
                    icon: user.profile_icon
                },
                message: message.trim(),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error handling chat message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User ${session.user?.username || 'unknown'} disconnected from chat`);
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('404', {
        title: '404 - Page Not Found',
        message: 'The page you\'re looking for doesn\'t exist.'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).render('error', {
        title: '500 - Server Error',
        message: 'Something went wrong on our end. Please try again later.'
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    sessionStore.close();
    db.close();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Secure Wild West Forum running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});



