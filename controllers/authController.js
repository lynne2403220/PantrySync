const bcrypt = require('bcryptjs');
const path = require('path');
const User = require('../models/user');

function showHome(req, res) {
    res.render('index', { title: 'Home' });
}

function showLogin(req, res) {
    res.render('login', { title: 'Login', error: null, featureCss: '/css/auth.css' });
}

async function login(req, res) {
    try {
        const email = req.body.email;
        const password = req.body.password;
        
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.render('login', { title: 'Login', error: 'Invalid email or password', featureCss: '/css/auth.css' });
        }

        const user = await User.findOne({ email }).select('+passwordHash');

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.render('login', { title: 'Login', error: 'Invalid email or password', featureCss: '/css/auth.css' });
        }

        req.session.userId = user._id;
        return user.isAdmin ? res.redirect('/admin') : res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('login', { title: 'Login', error: 'Something went wrong', featureCss: '/css/auth.css' });
    }
}

function showRegister(req, res) {
    res.render('register', { title: 'Register', error: null, featureCss: '/css/auth.css' });
}

async function register(req, res) {
    try {
        const { username, email, password, adminCode, diet } = req.body;

        if (await User.findOne({ email })) {
            return res.render('register', { title: 'Register', error: 'Email already exists', featureCss: '/css/auth.css' });
        }
        if (!password || password.length < 6) {
            return res.render('register', { title: 'Register', error: 'Password must be at least 6 characters', featureCss: '/css/auth.css' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        
        const isAdmin = (adminCode && adminCode === process.env.ADMIN_CODE);

        await User.create({
            username,
            email,
            passwordHash,
            isAdmin,
            diets: [diet || 'none']
        });

        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.render('register', { title: 'Register', error: 'Something went wrong', featureCss: '/css/auth.css' });
    }
}

function logout(req, res) {
    req.session.destroy(() => res.redirect('/login'));
}

async function checkEmail(req, res) {
    try {
        const exists = await User.findOne({ email: req.query.email });
        res.json({ available: !exists });
    } catch (err) {
        res.json({ available: true });
    }
}

async function updateProfile(req, res, next) {
    try {
        const { username, password, diets } = req.body;
        const update = {};

        if (username && username.trim().length >= 2) update.username = username.trim();

        const dietArr = diets ? (Array.isArray(diets) ? diets : [diets]) : ['none'];
        update.diets = dietArr.length ? dietArr : ['none'];

        if (password && password.length >= 6) {
            update.passwordHash = await bcrypt.hash(password, 10);
        }

        const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
        req.session.userId = user._id;
        res.redirect('/dashboard');
    } catch (err) {
        next(err);
    }
}

async function uploadProfilePicture(req, res, next) {
    try {
        if (!req.files || !req.files.profileImage) {
            return res.redirect('/dashboard');
        }

        const file = req.files.profileImage;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return res.redirect('/dashboard?error=Only+image+files+are+allowed');
        }

        let ext = path.extname(file.name).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
            ext = '.jpg';
        }

        const filename = `profile_${req.user._id}_${Date.now()}${ext}`;
        const uploadPath = path.join(__dirname, '../public/uploads', filename);

        await file.mv(uploadPath);

        await User.findByIdAndUpdate(req.user._id, { profileImage: `/uploads/${filename}` });
        res.redirect('/dashboard');
    } catch (err) {
        next(err);
    }
}

async function deleteAccount(req, res, next) {
    try {
        await User.findByIdAndDelete(req.user._id);
        req.session.destroy(() => res.redirect('/login'));
    } catch (err) {
        next(err);
    }
}

module.exports = { showHome, showLogin, login, showRegister, register, logout, checkEmail, updateProfile, uploadProfilePicture , deleteAccount };