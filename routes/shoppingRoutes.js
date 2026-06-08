const router = require('express').Router();
const shoppingController = require('../controllers/shoppingController');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);

router.get('/', shoppingController.renderShoppingList);
router.post('/add', shoppingController.addShoppingItem);
router.post('/:id/update', shoppingController.updateShoppingItem);
router.post('/:id/toggle', shoppingController.toggleBought);
router.patch('/:id/toggle', shoppingController.toggleBought);
router.post('/:id/delete', shoppingController.deleteShoppingItem);
router.delete('/:id/delete', shoppingController.deleteShoppingItem);
router.post('/from-recipe', shoppingController.addFromRecipe);

module.exports = router;
