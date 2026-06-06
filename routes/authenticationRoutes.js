// Authentication routes = used to handle login, register and logout endpoints

const router = require('express').Router();
const authController = require('../controllers/authController');
const { guestOnly, protect } = require('../middleware/auth');

router.get('/login', guestOnly, authController.showLogin);
router.post('/login', guestOnly, authController.login);
router.get('/register', guestOnly, authController.showRegister);
router.post('/register', guestOnly, authController.register);
router.get('/api/check-email', authController.checkEmail);
router.post('/profile', protect, authController.profile);
router.post('/profile/picture', protect, authController.profilePicture);
router.get('/logout', protect, authController.logout);
router.post('/logout', protect, authController.logout);

module.exports = router;
