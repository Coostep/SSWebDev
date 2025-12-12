/*
server.js file for Less Wild West backend
This file sets up the Express server, configures middleware,
handles routing, and manages user sessions.
*/



// Importing modules

const express = require('express');
const hbs = require('hbs');
const cookieParser = require('cookie-parser');
const path = require('path');

//  Initializng express and hard setting port
const app = express();
const PORT = 3000;

// Temp in-memory storage 
const users = [];
const comments = [];
const sessions = {};

// Configure view templating settings and hbs
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// Set up middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Setting up session IDs
app.use((req, res, next) => {
    let sessionId = req.cookies.sessionId;

    // Create a new session if one doesnt exist
    if (!sessionId || !sessions[sessionId]) {
        sessionId = Math.random().toString(36).substring(6,7);
	sessions[sessionId] = {
            user: null,
            visitCount: 0,
            createdAt: new Date()
        };

	// Set session cookie for 24 hours
        res.cookie('sessionId', sessionId, {
            maxAge: 24 * 60 * 60 * 1000
        });
    }

    // Attatch session to req 
    req.session = sessions[sessionId];
    req.sessionId = sessionId;


    req.session.visitCount = (req.session.visitCount || 0) + 1;


    next();
});

// Regist hbs helper for json formatting
hbs.registerHelper('stringify', function(context) {
    return JSON.stringify(context, null, 2);
});

// make all user data available
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.sessionId = req.sessionId;
    next();
});

// handling routes
app.get('/', (req, res) => {
    res.render('home', {
        title: 'Wild West Forum - Home'
    });
});

// registation routes
app.get('/register', (req, res) => {
    res.render('register', {
        title: 'Register',
        error: null
    });
});


app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // check if username already exists
    if (users.find(u => u.username === username)) {
        return res.render('register', {
            title: 'Register',
            error: 'Username already taken'
        });
    }

    // Creates new user
    users.push({ username, password });
    console.log(`New user registered: ${username}, Password: ${password}`);


    res.redirect('/login');
});

// login route
app.get('/login', (req, res) => {
    res.render('login', {
        title: 'Login',
        error: null
    });
});


app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // find mathing user
    const user = users.find(u => u.username === username && u.password === password);


    if (!user) {
        return res.render('login', {
            title: 'Login',
            error: 'Invalid username or password'
        });
    }

    // create session
    req.session.user = username;
    req.session.loginTime = new Date();


    console.log(`User ${username} logged in at ${req.session.loginTime}`);


    res.redirect('/');
});

// logout route
app.post('/logout', (req, res) => {
    const username = req.session.user;

    // clear session data
    req.session.user = null;
    delete req.session.loginTime;

    // clear client cookies and server session
    res.clearCookie('sessionId');
    delete sessions[req.sessionId];


    console.log(`User ${username} logged out`);
    res.redirect('/');
});

// comments route
app.get('/comments', (req, res) => {
    res.render('comments', {
        title: 'All Comments',
        comments: comments.sort((a, b) => b.createdAt - a.createdAt)
    });
});

// new comment route
app.get('/comment/new', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }


    res.render('new-comment', {
        title: 'New Comment'
    });
});

// comment creation route
app.post('/comment', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }


    const { text } = req.body;

    // add comments to storage
    comments.push({
        author: req.session.user,
        text: text,
        createdAt: new Date()
    });


    console.log(`New comment posted by ${req.session.user}`);


    res.redirect('/comments');
});
// makes sure server is working on right port
app.listen(PORT, () => {
    console.log(`Wild West Forum running on port ${PORT}`);
});



