const router = require('express').Router();
const ctrl = require('../controllers/spoonacularController');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);
router.get('/search', ctrl.searchByIngredients);
router.get('/recipe/:id', ctrl.getRecipeDetail);

module.exports = router;
