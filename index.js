const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const session = require('express-session');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.use(express.static('public'));

// Home Route
app.get('/', (req, res) => {
    if (req.session.access_token) {
        res.redirect('/profile');
    } else {
        res.render('index');
    }
});

// Login Page
app.get('/login', (req, res) => {
    res.render('login');
});

// Login with Discord Route
app.get('/auth/discord', (req, res) => {
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;
    res.redirect(authUrl);
});

// OAuth Callback Route
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('No code provided');

    try {
        const response = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.DISCORD_REDIRECT_URI,
            scope: 'identify'
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        req.session.access_token = response.data.access_token;
        res.redirect('/profile');
    } catch (error) {
        res.status(500).send('Error while exchanging code for token');
    }
});

// Profile Route
app.get('/profile', async (req, res) => {
    if (!req.session.access_token) return res.redirect('/');

    try {
        const userResponse = await axios.get('https://discord.com/api/v10/users/@me', {
            headers: {
                Authorization: `Bearer ${req.session.access_token}`
            }
        });
        res.render('profile', { user: userResponse.data });
    } catch (error) {
        res.redirect('/');
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
