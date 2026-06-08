const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { loadUser } = require('./middleware/auth');
const pageRoutes = require('./routes/pageRoutes');
const authenticationRoutes = require('./routes/authenticationRoutes');
const itemRoutes = require('./routes/itemRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const shoppingRoutes = require('./routes/shoppingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middleware/error');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const keyPath = process.env.HTTPS_KEY || path.join(__dirname, 'certs', 'key.pem');
const certPath = process.env.HTTPS_CERT || path.join(__dirname, 'certs', 'cert.pem');
const httpsReady = process.env.USE_HTTPS === 'true' && fs.existsSync(keyPath) && fs.existsSync(certPath);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileUpload());
app.use(session({
    secret: process.env.SESSION_SECRET || 'pantrysync_dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: httpsReady
    }
}));

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});

app.use(loadUser);
app.use(pageRoutes);
app.use(authenticationRoutes);
app.use(itemRoutes);
app.use(recipeRoutes);
app.use(shoppingRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
    res.status(404).render('error', { title: 'Not Found', status: 404, message: 'Page not found.' });
});

app.use(errorHandler);

async function start() {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pantrysync';
    const timeout = Number(process.env.MONGO_TIMEOUT_MS || 5000);
    await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: timeout });
    console.log('Connected to MongoDB');

    const server = httpsReady
        ? https.createServer({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }, app)
        : http.createServer(app);
    const protocol = httpsReady ? 'https' : 'http';

    server.listen(port, () => {
        console.log(`Server running at ${protocol}://localhost:${port}`);
    });
}

start().catch(err => {
    console.error('Startup error:', err.message);
    process.exit(1);
});
