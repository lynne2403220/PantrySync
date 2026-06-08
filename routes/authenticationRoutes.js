const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireGuest, requireLogin } = require('../middleware/auth');

router.get('/', authController.showHome);

router.get('/login', requireGuest, authController.showLogin);
router.post('/login', requireGuest, authController.login);

router.get('/register', requireGuest, authController.showRegister);
router.post('/register', requireGuest, authController.register);

router.get('/logout', requireLogin, authController.logout);
router.post('/logout', requireLogin, authController.logout);

router.post('/profile', requireLogin, authController.updateProfile);
router.post('/profile/picture', requireLogin, authController.uploadProfilePicture);
router.post('/profile/delete', requireLogin, authController.deleteAccount);

router.get('/api/check-email', authController.checkEmail);

module.exports = router;
