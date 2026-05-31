const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const User = require('../models/user');
const { fail } = require('../middleware/auth');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function renderLogin(res, form, error) {
    res.status(error ? 400 : 200).render('login', { title: 'Login', form, error });
}

function renderRegister(res, form, error) {
    res.status(error ? 400 : 200).render('register', { title: 'Register', form, error, diets: User.diets });
}

exports.showLogin = (req, res) => {
    renderLogin(res, {}, null);
};

exports.showRegister = (req, res) => {
    renderRegister(res, {}, null);
};

exports.checkEmail = async (req, res, next) => {
    try {
        const email = cleanEmail(req.query.email);
        if (!emailPattern.test(email)) return res.json({ exists: false, valid: false });
        const user = await User.findOne({ email });
        res.json({ exists: !!user, valid: true });
    } catch (err) {
        next(err);
    }
};

exports.register = async (req, res, next) => {
    try {
        const name = String(req.body.name || '').trim();
        const email = cleanEmail(req.body.email);
        const password = String(req.body.password || '');
        const diet = [].concat(req.body.diet || 'none').filter(Boolean);

        if (!name) return renderRegister(res, req.body, 'Name is required.');
        if (!emailPattern.test(email)) return renderRegister(res, req.body, 'Valid email is required.');
        if (password.length < 6) return renderRegister(res, req.body, 'Password must be at least 6 characters.');
        if (await User.findOne({ email })) return renderRegister(res, req.body, 'Email already exists.');

        const canCreateAdmin = process.env.ADMIN_CODE && req.body.adminCode === process.env.ADMIN_CODE;
        const role = canCreateAdmin ? 'admin' : 'user';
        const user = await User.create({
            name,
            email,
            role,
            diet: diet.length ? diet : ['none'],
            passwordHash: await bcrypt.hash(password, 10)
        });

        req.session.userId = user._id;
        res.redirect(role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        const email = cleanEmail(req.body.email);
        const password = String(req.body.password || '');

        if (!emailPattern.test(email)) return renderLogin(res, req.body, 'Valid email is required.');

        const user = await User.findOne({ email }).select('+passwordHash');
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) return renderLogin(res, req.body, 'Wrong email or password.');

        req.session.userId = user._id;
        res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
        next(err);
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
};

exports.profile = async (req, res, next) => {
    try {
        const name = String(req.body.name || req.user.name).trim();
        const diet = [].concat(req.body.diet || 'none').filter(Boolean);
        if (!name) throw fail(400, 'Name is required.');
        req.user.name = name;
        req.user.diet = diet.length ? diet : ['none'];
        if (req.body.password) {
            if (String(req.body.password).length < 6) throw fail(400, 'Password must be at least 6 characters.');
            req.user.passwordHash = await bcrypt.hash(req.body.password, 10);
        }
        await req.user.save();
        res.redirect('/dashboard');
    } catch (err) {
        next(err);
    }
};

exports.profilePicture = async (req, res, next) => {
    try {
        if (!req.files || !req.files.profilePicture) throw fail(400, 'Choose a picture first.');
        const file = req.files.profilePicture;
        const ext = path.extname(file.name || '').toLowerCase();
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

        if (!allowed.includes(ext)) throw fail(400, 'Only JPG, PNG, GIF, or WEBP pictures are allowed.');
        if (file.size > 1024 * 1024) throw fail(400, 'Picture must be smaller than 1 MB.');

        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'profiles');
        fs.mkdirSync(uploadDir, { recursive: true });

        if (req.user.profilePicture && req.user.profilePicture.startsWith('/uploads/profiles/')) {
            const oldPath = path.join(__dirname, '..', 'public', req.user.profilePicture);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        const fileName = `${req.user._id}-${Date.now()}${ext}`;
        await file.mv(path.join(uploadDir, fileName));
        req.user.profilePicture = `/uploads/profiles/${fileName}`;
        await req.user.save();
        res.redirect('/dashboard');
    } catch (err) {
        next(err);
    }
};
