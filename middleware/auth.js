// Middleware: loads user session and protects routes

const User = require('../models/user');

function fail(status, message) {
    return Object.assign(new Error(message), { status });
}

function wantsJson(req) {
    return req.path.startsWith('/api') || req.xhr || (req.headers.accept || '').includes('application/json');
}

async function loadUser(req, res, next) {
    try {
        res.locals.currentUser = null;
        if (!req.session.userId) return next();

        const user = await User.findById(req.session.userId);
        if (!user) {
            req.session.destroy(() => {});
            return next();
        }

        req.user = user;
        res.locals.currentUser = user.safe();
        next();
    } catch (err) {
        next(err);
    }
}

function protect(req, res, next) {
    if (req.user) return next();
    if (wantsJson(req)) return res.status(401).json({ message: 'Please log in first.' });
    res.redirect('/login');
}

function guestOnly(req, res, next) {
    if (!req.user) return next();
    res.redirect(req.user.role === 'admin' ? '/admin' : '/dashboard');
}

function adminOnly(req, res, next) {
    if (req.user && req.user.role === 'admin') return next();
    if (wantsJson(req)) return res.status(403).json({ message: 'Admin access only.' });
    res.status(403).render('error', { title: 'Admin Access', status: 403, message: 'Admin access only.' });
}

module.exports = { fail, loadUser, protect, guestOnly, adminOnly, wantsJson };
