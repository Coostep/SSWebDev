const express = require('express');
const hbs = require('hbs');
const cookieParser = require('cookie-parser');
const path = require('path');


const app = express();
const PORT = 3000;


const users = [];
const comments = [];
const sessions = {};


app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));


hbs.registerPartials(path.join(__dirname, 'views', 'partials'));


app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


app.use((req, res, next) => {
    let sessionId = req.cookies.sessionId;


    if (!sessionId || !sessions[sessionId]) {
        sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        sessions[sessionId] = {
            user: null,
            visitCount: 0,
            createdAt: new Date()
        };


        res.cookie('sessionId', sessionId, {
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
    }


    req.session = sessions[sessionId];
    req.sessionId = sessionId;


    req.session.visitCount = (req.session.visitCount || 0) + 1;


    next();
});


app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));


hbs.registerPartials(path.join(__dirname, 'views/partials'));


hbs.registerHelper('stringify', function(context) {
    return JSON.stringify(context, null, 2);
});


app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.sessionId = req.sessionId;
    next();
});


app.get('/', (req, res) => {
    res.render('home', {
        title: 'Wild West Forum - Home'
    });
});


app.get('/register', (req, res) => {
    res.render('register', {
        title: 'Register',
        error: null
    });
});


app.post('/register', (req, res) => {
    const { username, password } = req.body;


    if (users.find(u => u.username === username)) {
        return res.render('register', {
            title: 'Register',
            error: 'Username already taken'
        });
    }


    users.push({ username, password });
    console.log(`New user registered: ${username}, Password: ${password}`);


    res.redirect('/login');
});


app.get('/login', (req, res) => {
    res.render('login', {
        title: 'Login',
        error: null
    });
});


app.post('/login', (req, res) => {
    const { username, password } = req.body;


    const user = users.find(u => u.username === username && u.password === password);


    if (!user) {
        return res.render('login', {
            title: 'Login',
            error: 'Invalid username or password'
        });
    }


    req.session.user = username;
    req.session.loginTime = new Date();


    console.log(`User ${username} logged in at ${req.session.loginTime}`);


    res.redirect('/');
});


app.post('/logout', (req, res) => {
    const username = req.session.user;


    req.session.user = null;
    delete req.session.loginTime;


    res.clearCookie('sessionId');


    delete sessions[req.sessionId];


    console.log(`User ${username} logged out`);
    res.redirect('/');
});


app.get('/comments', (req, res) => {
    res.render('comments', {
        title: 'All Comments',
        comments: comments.sort((a, b) => b.createdAt - a.createdAt)
    });
});


app.get('/comment/new', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }


    res.render('new-comment', {
        title: 'New Comment'
    });
});


app.post('/comment', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }


    const { text } = req.body;


    comments.push({
        author: req.session.user,
        text: text,
        createdAt: new Date()
    });


    console.log(`New comment posted by ${req.session.user}`);


    res.redirect('/comments');
});

app.listen(PORT, () => {
    console.log(`Wild West Forum running on port ${PORT}`);
});



