const mongoose = require('mongoose');
const ShoppingItem = require('../models/shoppingItem');
const prices = require('../data/prices');
const { fail, wantsJson } = require('../middleware/auth');

function normalizeName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizePriceKey(value) {
    return normalizeName(value).toLowerCase();
}

function estimatePrice(name) {
    const key = normalizePriceKey(name);
    if (prices[key] !== undefined) return prices[key];
    const singular = key.endsWith('s') ? key.slice(0, -1) : key;
    return prices[singular] || 20;
}

function parseNumber(value, label, fallback) {
    if (value === undefined || value === '') return fallback;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw fail(400, `${label} must be non-negative.`);
    return number;
}

function parsePage(query) {
    const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 24, 1), 60);
    return { page, limit, skip: (page - 1) * limit };
}

function validateShoppingItem(body, partial = false) {
    const data = {};
    if (!partial || body.name !== undefined) {
        const name = normalizeName(body.name);
        if (!name) throw fail(400, 'Shopping item name is required.');
        data.name = name;
    }
    if (!partial || body.quantity !== undefined) data.quantity = parseNumber(body.quantity, 'Quantity', 1);
    if (!partial || body.unit !== undefined) data.unit = normalizeName(body.unit) || 'pcs';
    if (body.priceEstimate !== undefined && body.priceEstimate !== '') {
        data.priceEstimate = parseNumber(body.priceEstimate, 'Price estimate', 0);
    }
    if (body.bought !== undefined) data.bought = Boolean(body.bought);
    if (body.notes !== undefined) data.notes = String(body.notes || '').trim();
    return data;
}

async function calcTotal(userId) {
    const unpaid = await ShoppingItem.find({ owner: userId, bought: false });
    return unpaid.reduce((sum, item) => sum + (item.priceEstimate || 0) * (item.quantity || 1), 0);
}

exports.renderShoppingList = async (req, res, next) => {
    try {
        const { page, limit, skip } = parsePage(req.query);
        const filter = { owner: req.user._id };

        const [items, total, totalCost] = await Promise.all([
            ShoppingItem.find(filter).sort({ bought: 1, createdAt: -1 }).skip(skip).limit(limit),
            ShoppingItem.countDocuments(filter),
            calcTotal(req.user._id)
        ]);

        const pendingItems = items.filter(i => !i.bought);
        const boughtItems = items.filter(i => i.bought);

        res.render('shopping-list', {
            title: 'Shopping List',
            featureCss: '/css/shopping.css',
            featureJs: '/js/shopping.js',
            items,
            pendingItems,
            boughtItems,
            totalCost,
            pendingCount: pendingItems.length,
            totalCount: total,
            estimatedTotal: totalCost,
            error: null,
            success: null,
            page,
            limit,
            pages: Math.max(Math.ceil(total / limit), 1)
        });
    } catch (err) {
        next(err);
    }
};

exports.getShoppingItems = async (req, res, next) => {
    try {
        const items = await ShoppingItem.find({ owner: req.user._id }).sort({ bought: 1, createdAt: -1 });
        res.json({ items });
    } catch (err) {
        next(err);
    }
};

exports.addShoppingItem = async (req, res, next) => {
    try {
        const data = validateShoppingItem(req.body);
        if (data.priceEstimate === undefined) data.priceEstimate = estimatePrice(data.name);
        const item = await ShoppingItem.create({ ...data, owner: req.user._id });
        if (wantsJson(req)) return res.status(201).json({ item, message: 'Shopping item added.' });
        res.redirect('/shopping-list');
    } catch (err) {
        next(err);
    }
};

exports.updateShoppingItem = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw fail(400, 'Invalid shopping item id.');
        const data = validateShoppingItem(req.body, true);
        const item = await ShoppingItem.findOneAndUpdate(
            { _id: req.params.id, owner: req.user._id },
            data,
            { returnDocument: 'after', runValidators: true }
        );
        if (!item) throw fail(404, 'Shopping item not found.');
        if (wantsJson(req)) return res.json({ item, message: 'Shopping item updated.' });
        res.redirect('/shopping-list');
    } catch (err) {
        next(err);
    }
};

exports.deleteShoppingItem = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw fail(400, 'Invalid shopping item id.');
        const item = await ShoppingItem.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
        if (!item) throw fail(404, 'Shopping item not found.');
        if (wantsJson(req)) return res.json({ message: 'Shopping item deleted.' });
        res.redirect('/shopping-list');
    } catch (err) {
        next(err);
    }
};

exports.toggleBought = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw fail(400, 'Invalid shopping item id.');
        const item = await ShoppingItem.findOne({ _id: req.params.id, owner: req.user._id });
        if (!item) throw fail(404, 'Shopping item not found.');
        item.bought = !item.bought;
        await item.save();
        if (wantsJson(req)) return res.json({ bought: item.bought });
        res.redirect('/shopping-list');
    } catch (err) {
        next(err);
    }
};

exports.addFromRecipe = async (req, res, next) => {
    try {
        const list = [];
        for (const ing of (req.body.ingredients || [])) {
            if (ing && ing.name) list.push({ name: String(ing.name).trim(), quantity: Number(ing.quantity) || 1, unit: String(ing.unit || 'pcs').trim() });
        }
        for (const it of (req.body.items || [])) {
            if (it && it.name) list.push({ name: String(it.name).trim(), quantity: Number(it.quantity) || 1, unit: String(it.unit || 'pcs').trim() });
        }
        const incoming = list.filter(i => i.name);
        if (!incoming.length) throw fail(400, 'No missing ingredients were provided.');

        let added = 0, skipped = 0;
        const sourceRecipe = normalizeName(req.body.recipeTitle || req.body.sourceRecipe || '');
        for (const item of incoming) {
            const exists = await ShoppingItem.findOne({
                owner: req.user._id,
                name: new RegExp('^' + item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
                bought: false
            });
            if (exists) { skipped++; continue; }
            await ShoppingItem.create({ owner: req.user._id, ...item, bought: false, priceEstimate: estimatePrice(item.name), sourceRecipe });
            added++;
        }
        res.status(201).json({ added, skipped, message: `${added} added, ${skipped} already listed.` });
    } catch (err) {
        next(err);
    }
};

exports.estimatedTotal = calcTotal;
exports.getShoppingList = exports.renderShoppingList;
exports.addItem = exports.addShoppingItem;
exports.updateItem = exports.updateShoppingItem;
exports.deleteItem = exports.deleteShoppingItem;
