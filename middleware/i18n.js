const path = require('path');
const fs = require('fs');

const SUPPORTED = ['en', 'fr', 'ar'];
const DEFAULT_LANG = 'en';
const locales = {};

// Load all locale files at startup
SUPPORTED.forEach(lang => {
    const filePath = path.join(__dirname, '../locales', `${lang}.json`);
    locales[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
});

function i18nMiddleware(req, res, next) {
    // Priority: query ?lang= > session > Accept-Language header > default
    if (req.query.lang && SUPPORTED.includes(req.query.lang)) {
        req.session.lang = req.query.lang;
    }

    let lang = req.session && req.session.lang;

    if (!lang || !SUPPORTED.includes(lang)) {
        const acceptLang = req.headers['accept-language'] || '';
        const preferred = acceptLang.split(',')[0].split('-')[0].toLowerCase();
        lang = SUPPORTED.includes(preferred) ? preferred : DEFAULT_LANG;
    }

    res.locals.lang = lang;
    res.locals.t = locales[lang];
    res.locals.supportedLangs = SUPPORTED;
    res.locals.isRtl = lang === 'ar';
    next();
}

module.exports = i18nMiddleware;
