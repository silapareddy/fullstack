const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');
const passwordHash = require('password-hash');
const session = require('express-session');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const serviceAccount = require('./key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure: true if using HTTPS
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/dashboard', (req, res) => {
    if (req.session.username) {
        res.render('dashboard', { username: req.session.username });
    } else {
        res.redirect('/');
    }
});


app.post('/signupSubmit', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const usersData = await db.collection('users')
            .where('email', '==', email)
            .get();

        if (!usersData.empty) {
            return res.send('Hey! This account already exists...');
        }

        await db.collection('users').add({
            userName: username,
            email: email,
            password: passwordHash.generate(password)
        });

        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    } catch (error) {
        console.error('Error during signup:', error);
        res.send('Something went wrong...');
    }
});

//The code for the login route...
app.post('/loginSubmit', async (req, res) => {
    const { username, password } = req.body;

    try {
        const usersData = await db.collection('users')
            .where('userName', '==', username)
            .get();

        let verified = false;
        let user = null;

        usersData.forEach((doc) => {
            if (passwordHash.verify(password, doc.data().password)) {
                verified = true;
                user = doc.data();
            }
        });

        if (verified) {
            res.render('dashboard', { username: user.username });
        } else {
            res.send('Login failed...');
        }
        
    } catch (error) {
        console.error('Error during login:', error);
        res.send('Something went wrong...');
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err);
            res.send('Something went wrong...');
        } else {
            res.redirect('/');
        }
    });
});

//Opening the port 2000 in web server...
app.listen(2000, () => {
    console.log('server is running on port http://localhost:2000');
});