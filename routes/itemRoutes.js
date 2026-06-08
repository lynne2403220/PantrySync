const router = require('express').Router();
const itemController = require('../controllers/itemController');
const { requireLogin } = require('../middleware/auth');

router.get('/dashboard', requireLogin, itemController.renderDashboard);

router.get('/api/items', requireLogin, itemController.getItems);
router.post('/api/items', requireLogin, itemController.createItem);
router.put('/api/items/:id', requireLogin, itemController.updateItem);
router.patch('/api/items/:id', requireLogin, itemController.updateItem);
router.delete('/api/items/:id', requireLogin, itemController.deleteItem);
router.get('/api/foods', requireLogin, itemController.getFoodSuggestions);

router.post('/items', requireLogin, itemController.createItem);
router.post('/items/:id/update', requireLogin, itemController.updateItem);
router.post('/items/:id/delete', requireLogin, itemController.deleteItem);

module.exports = router;
