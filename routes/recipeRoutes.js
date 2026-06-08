const router = require('express').Router();
const recipeController = require('../controllers/recipeController');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);
router.get('/', recipeController.renderRecipesPage);
router.get('/discover', (req, res) => {
    res.render('discover', {
        title: 'Discover Recipes',
        featureCss: '/css/recipes.css'
    });
});
router.get('/api/recommendations', recipeController.getRecommendations);
router.post('/api/recommendations', recipeController.getRecommendations);
router.post('/:id/delete', recipeController.deleteRecipe);

module.exports = router;
