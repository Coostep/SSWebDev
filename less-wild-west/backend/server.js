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

const app = express();
const server = http.createServer(app);

// Configures Handlebars as the template engine and sets views directory
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Registers Handlebars helper to truncate long strings with ellipsis for display
hbs.registerHelper('truncate', function(str, len) {
    if (typeof str !== 'string') return '';
    if (str.length <= len) return str;
    return str.substring(0, len) + '...';
});

// Formats dates to readable string with month, day, year, and time
hbs.registerHelper('formatDate', function(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
});

// Formats time to 12-hour format with hour and minute only
hbs.registerHelper('formatTime', function(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
});

// Formats chat timestamps with relative display (time only, day of week, or full date)
hbs.registerHelper('formatChatTime', function(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (diffHours < 24) {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        else if (diffHours < 168) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return days[date.getDay()] + ' ' + date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    } catch (e) {
        return dateString;
    }
});

// Helper for equality comparison in Handlebars templates
hbs.registerHelper('eq', function(a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
});

// Alternative equality helper with different syntax for template logic
hbs.registerHelper('if_eq', function(a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
});

// Greater than comparison helper for template conditionals
hbs.registerHelper('gt', function(a, b) {
    return a > b;
});

// Extracts substring from string for template display purposes
hbs.registerHelper('substring', function(str, start, end) {
    if (typeof str !== 'string') return '';
    return str.substring(start, end);
});

// Registers Handlebars partials from the specified directory
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

const db = require('./database');
const SQLiteStore = require('./sqlite-session-store');
const authMiddleware = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const commentRoutes = require('./routes/comments');
const profileRoutes = require('./routes/profile');
const passwordRoutes = require('./routes/password-recovery');
const chatRoutes = require('./routes/chat');
const pdfRoutes = require('./routes/pdfs');

// Sets up middleware for JSON parsing, URL encoding, cookies, and static files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configures session management with SQLite storage and security settings
const sessionStore = new SQLiteStore();
const sessionMiddleware = session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, 
        sameSite: 'strict'
    }
});

app.use(sessionMiddleware);

// Middleware to make user session data available in all templates
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.sessionId = req.sessionID;
    next();
});

// Health check endpoint for monitoring server and database status
app.get('/health', (req, res) => {
    try {
        const dbCheck = db.prepare('SELECT 1 as status').get();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbCheck ? 'connected' : 'disconnected',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Renders the home page with features list and user information
app.get('/', (req, res) => {
    res.render('home', {
        title: 'Wild West Forum',
        features: [
            'Secure password hashing',
            'Database persistence',
            'Account protection',
            'Password recovery',
            'Real-time chat',
            'Enhanced comments'
        ],
        currentUser: req.session.user
    });
});

// Registers all route modules for different parts of the application
app.use('/', authRoutes);
app.use('/comments', commentRoutes);
app.use('/profile', profileRoutes);
app.use('/password', passwordRoutes);
app.use('/chat', chatRoutes);
app.use('/pdfs', pdfRoutes);

// Initializes Socket.IO for real-time chat with session integration
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.engine.use(sessionMiddleware);

// Handles WebSocket connections for real-time chat functionality
io.on('connection', (socket) => {
    const session = socket.request.session;

    if (!session || !session.user) {
        socket.disconnect();
        return;
    }
    
    console.log(`User ${session.user.username} connected to chat`);
    
    socket.join(`user_${session.user.id}`);
    
    socket.on('chatMessage', async (data) => {
        try {
            const { message } = data;
            
            if (!message || message.trim().length === 0) {
                return;
            }

            const stmt = db.prepare(`
                INSERT INTO chat_messages (user_id, message) 
                VALUES (?, ?)
            `);
            const result = stmt.run(session.user.id, message.trim());

            const userStmt = db.prepare(`
                SELECT username, display_name, profile_color, profile_icon
                FROM users WHERE id = ?
            `);
            const user = userStmt.get(session.user.id);

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

    socket.on('disconnect', () => {
        console.log(`User ${session.user?.username || 'unknown'} disconnected from chat`);
    });
});

// 404 error handler for undefined routes
app.use((req, res) => {
    res.status(404).render('404', {
        title: '404 - Page Not Found',
        message: 'The page you\'re looking for doesn\'t exist.',
        currentUser: req.session.user
    });
});

// Global error handler for server errors and exceptions
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).render('error', {
        title: '500 - Server Error',
        message: 'Something went wrong. Please try again later.',
        currentUser: req.session.user
    });
});

// Graceful shutdown handler for SIGINT signal (Ctrl+C)
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    sessionStore.close();
    db.close();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Starts the HTTP server and logs startup information
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Wild West Forum running on port ${PORT}`);
});

// PDF discovery and indexing system for automatic PDF file management
const pdfDiscovery = require('./modules/pdf-discovery');
   // Initial indexing
   try {
     pdfDiscovery.indexPdfs();
   } catch (error) {
     console.error('Initial PDF indexing failed:', error);
   }

   // Schedule indexing every hour
   setInterval(() => {
     try {
         const results = pdfDiscovery.indexPdfs();
         if (results.added > 0 || results.updated > 0) {
             console.log(`PDF indexing: ${results.added} added, ${results.updated} updated`);
         }
     } catch (error) {
         console.error('Scheduled PDF indexing failed:', error);
     }
   }, 60 * 60 * 1000);