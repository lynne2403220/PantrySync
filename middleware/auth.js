const User = require('../models/user');

async function loadUser(req, res, next) {
    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            if (user) {
                req.user = user;
                res.locals.user = user;
            }
        } catch (err) {
            console.log(err);
        }
    }
    next();
}

function requireLogin(req, res, next) {
    if (req.user) return next();
    if (req.path.startsWith('/api/') || wantsJson(req)) {
        return res.status(401).json({ error: 'Authentication required.' });
    }
    res.redirect('/login');
}

function requireGuest(req, res, next) {
    if (req.user) return res.redirect('/dashboard');
    next();
}

function requireAdmin(req, res, next) {
    if (req.user && req.user.isAdmin) return next();
    if (req.path.startsWith('/api/') || wantsJson(req)) {
        return res.status(403).json({ error: 'Admin only' });
    }
    res.status(403).render('error', {
        title: 'Forbidden',
        status: 403,
        message: 'Admin only'
    });
}

function wantsJson(req) {
    return req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
}

function fail(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

module.exports = { loadUser, requireLogin, requireGuest, requireAdmin, wantsJson, fail };// Lynne - Auth Middleware
