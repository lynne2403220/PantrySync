require('dotenv').config();

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const fileUpload = require('express-fileupload');
const { loadUser } = require('./middleware/auth');
const i18n = require('./middleware/i18n');
const authenticationRoutes = require('./routes/authenticationRoutes');
const itemRoutes = require('./routes/itemRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const shoppingRoutes = require('./routes/shoppingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const spoonacularRoutes = require('./routes/spoonacularRoutes');
const errorHandler = require('./middleware/error');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pantrysync';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(fileUpload({
    limits: { fileSize: 2 * 1024 * 1024 },
    abortOnLimit: true,
    createParentPath: true,
    safeFileNames: true,
    preserveExtension: false
}));
app.use(session({
    name: 'pantrysync.sid',
    secret: process.env.SESSION_SECRET && process.env.SESSION_SECRET !== '123456' ? process.env.SESSION_SECRET : 'a_very_long_and_secure_random_session_secret_32_chars',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        collectionName: 'sessions'
    }),
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 3
    }
}));

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    res.locals.user = null;
    next();
});

app.use(loadUser);
app.use(i18n);

app.use('/', authenticationRoutes);
app.use('/', itemRoutes);
app.use('/recipes', recipeRoutes);
app.use('/shopping-list', shoppingRoutes);
app.use('/admin', adminRoutes);
app.use('/api/spoonacular', spoonacularRoutes);

app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Page Not Found',
        status: 404,
        message: 'The page you requested does not exist.'
    });
});

app.use(errorHandler);

async function start() {
    await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 5000)
    });
    app.listen(PORT, () => {
        console.log(`PantrySync listening on http://localhost:${PORT}`);
    });
}

if (require.main === module) {
    start().catch((err) => {
        console.error('Startup failed:', err.message);
        process.exit(1);
    });
}

module.exports = app;