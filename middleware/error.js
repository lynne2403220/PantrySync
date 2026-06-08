function errorHandler(err, req, res, next) {
    console.error(err);
    
    const status = err.status || 500;
    const message = status >= 500 ? 'Something went wrong.' : err.message;
    
    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.path && req.path.startsWith('/api/'));

    if (wantsJson) {
        return res.status(status).json({ error: message });
    }
    
    res.status(status).render('error', {
        title: 'Error',
        status: status,
        message: message
    });
}

module.exports = errorHandler;
