const User = require('../models/user');
const Item = require('../models/item');
const Recipe = require('../models/recipe');
const ShoppingItem = require('../models/shoppingItem');

async function recentRows() {
    const [users, pantryItems, recipes, shoppingItems] = await Promise.all([
        User.find().sort({ createdAt: -1 }).limit(5),
        Item.find().populate('owner', 'username email').sort({ createdAt: -1 }).limit(5),
        Recipe.find().sort({ createdAt: -1 }).limit(5),
        ShoppingItem.find().populate('owner', 'username email').sort({ createdAt: -1 }).limit(5)
    ]);

    return { users, pantryItems, recipes, shoppingItems };
}

async function counts() {
    const [users, admins, pantryItems, recipes, shoppingItems, unboughtShoppingItems] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isAdmin: true }),
        Item.countDocuments(),
        Recipe.countDocuments(),
        ShoppingItem.countDocuments(),
        ShoppingItem.countDocuments({ bought: false })
    ]);

    return {
        users,
        admins,
        pantryItems,
        recipes,
        shoppingItems,
        unboughtShoppingItems
    };
}

exports.renderAdminDashboard = async (req, res, next) => {
    try {
        const [stats, recent] = await Promise.all([counts(), recentRows()]);
        res.render('admin', {
            title: 'Admin Dashboard',
            featureCss: '/css/admin.css',
            featureJs: '/js/admin.js',
            stats,
            recent
        });
    } catch (err) {
        next(err);
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (err) {
        next(err);
    }
};

exports.deleteRecipe = async (req, res, next) => {
    try {
        await Recipe.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (err) {
        next(err);
    }
};

exports.index = exports.renderAdminDashboard;
