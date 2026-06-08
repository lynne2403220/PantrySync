const mongoose = require('mongoose');
const Item = require('../models/item');
const foods = require('../data/foods.json');
const { fail, wantsJson } = require('../middleware/auth');

const zoneLabels = {
    fridge: 'Fridge',
    pantry: 'Pantry',
    freezer: 'Freezer'
};

const categoryLabels = {
    produce: 'Produce',
    protein: 'Protein',
    dairy: 'Dairy',
    grain: 'Grain',
    bakery: 'Bakery',
    canned: 'Canned',
    frozen: 'Frozen',
    spice: 'Spice',
    other: 'Other'
};

const commonFoodNames = [
    'egg', 'spinach', 'milk', 'cheese', 'tomato', 'onion', 'garlic', 'chicken',
    'rice', 'bread', 'potato', 'pasta', 'beans', 'lentils', 'tuna', 'yogurt',
    'cucumber', 'carrot', 'apple', 'banana', 'orange', 'flour', 'oil', 'oats'
];

const foodNames = [...new Set(commonFoodNames.concat(foods.map((food) => String(food.name || '').toLowerCase()).filter(Boolean)))];

function parsePage(query) {
    const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 24, 1), 60);
    return { page, limit, skip: (page - 1) * limit };
}

function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw fail(400, 'Expiry date is not valid.');
    return date;
}

function parseNumber(value, field, minimum) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < minimum) throw fail(400, `${field} must be ${minimum === 0 ? 'non-negative' : 'positive'}.`);
    return number;
}

function pick(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
}

function validateItemInput(body, partial = false) {
    const data = {};

    if (!partial || body.name !== undefined) {
        const name = String(body.name || '').trim();
        if (!name) throw fail(400, 'Item name is required.');
        if (name.length > 100) throw fail(400, 'Item name is too long.');
        data.name = name;
    }

    if (!partial || body.amount !== undefined) {
        data.amount = parseNumber(body.amount, 'Amount', 0);
    }

    if (!partial || body.unit !== undefined) {
        data.unit = pick(String(body.unit || ''), Item.units, 'pcs');
    }

    if (!partial || body.zone !== undefined) {
        data.zone = pick(String(body.zone || ''), Item.zones, 'pantry');
    }

    if (!partial || body.category !== undefined) {
        data.category = pick(String(body.category || ''), Item.categories, 'other');
    }

    if (body.expiryDate !== undefined) {
        data.expiryDate = parseDate(body.expiryDate);
    }

    if (body.price !== undefined && body.price !== '') {
        data.price = parseNumber(body.price, 'Price', 0);
    }

    if (body.notes !== undefined) {
        const notes = String(body.notes || '').trim();
        if (notes.length > 500) throw fail(400, 'Notes are too long.');
        data.notes = notes;
    }

    return data;
}

function ownerFilter(req, id) {
    const filter = { owner: req.user._id };
    if (id) filter._id = id;
    return filter;
}

function ensureValidId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw fail(400, 'Invalid pantry item id.');
}

function itemDto(item) {
    return {
        id: item._id.toString(),
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        expiryDate: item.expiryDate ? item.expiryDate.toISOString().slice(0, 10) : '',
        category: item.category,
        zone: item.zone,
        price: item.price || 0,
        notes: item.notes || '',
        createdAt: item.createdAt
    };
}

function expiryInfo(date) {
    if (!date) return { status: 'none', label: 'No expiry date', daysLeft: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(date);
    expiry.setHours(0, 0, 0, 0);

    const daysLeft = Math.round((expiry - today) / 86400000);
    if (daysLeft < 0) return { status: 'expired', label: 'Expired', daysLeft };
    if (daysLeft === 0) return { status: 'today', label: 'Expires today', daysLeft };
    if (daysLeft <= 3) return { status: 'soon', label: `${daysLeft} days left`, daysLeft };
    if (daysLeft <= 7) return { status: 'watch', label: `${daysLeft} days left`, daysLeft };
    return { status: 'safe', label: `${daysLeft} days left`, daysLeft };
}

function redirectOrJson(req, res, payload, redirectPath, status = 200) {
    if (wantsJson(req)) return res.status(status).json(payload);
    return res.redirect(redirectPath);
}

async function pantryStats(userId) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sevenDays = new Date(now);
    sevenDays.setDate(sevenDays.getDate() + 7);

    const [total, expired, nearExpiry] = await Promise.all([
        Item.countDocuments({ owner: userId }),
        Item.countDocuments({ owner: userId, expiryDate: { $ne: null, $lt: now } }),
        Item.countDocuments({ owner: userId, expiryDate: { $gte: now, $lte: sevenDays } })
    ]);

    return { total, expired, nearExpiry };
}

exports.renderDashboard = async (req, res, next) => {
    try {
        const { page, limit, skip } = parsePage(req.query);
        const filter = ownerFilter(req);
        const [items, total, stats] = await Promise.all([
            Item.find(filter).sort({ expiryDate: 1, createdAt: -1 }).skip(skip).limit(limit),
            Item.countDocuments(filter),
            pantryStats(req.user._id)
        ]);

        res.render('dashboard', {
            title: 'Pantry Dashboard',
            featureCss: '/css/pantry.css',
            featureJs: '/js/pantry.js',
            items,
            total,
            page,
            limit,
            pages: Math.max(Math.ceil(total / limit), 1),
            stats,
            zones: Item.zones,
            zoneLabels,
            categories: Item.categories,
            categoryLabels,
            units: Item.units,
            expiryInfo,
            diets: req.user.constructor.diets
        });
    } catch (err) {
        next(err);
    }
};

exports.getItems = async (req, res, next) => {
    try {
        const items = await Item.find(ownerFilter(req)).sort({ expiryDate: 1, createdAt: -1 });
        res.json({ items: items.map(itemDto) });
    } catch (err) {
        next(err);
    }
};

exports.createItem = async (req, res, next) => {
    try {
        const item = await Item.create({ ...validateItemInput(req.body), owner: req.user._id });
        redirectOrJson(req, res, { item: itemDto(item), message: 'Pantry item added.' }, '/dashboard', 201);
    } catch (err) {
        next(err);
    }
};

exports.updateItem = async (req, res, next) => {
    try {
        ensureValidId(req.params.id);
        const item = await Item.findOneAndUpdate(
            ownerFilter(req, req.params.id),
            validateItemInput(req.body, true),
            { returnDocument: 'after', runValidators: true }
        );
        if (!item) throw fail(404, 'Pantry item not found.');
        redirectOrJson(req, res, { item: itemDto(item), message: 'Pantry item updated.' }, '/dashboard');
    } catch (err) {
        next(err);
    }
};

exports.deleteItem = async (req, res, next) => {
    try {
        ensureValidId(req.params.id);
        const item = await Item.findOneAndDelete(ownerFilter(req, req.params.id));
        if (!item) throw fail(404, 'Pantry item not found.');
        redirectOrJson(req, res, { message: 'Pantry item deleted.' }, '/dashboard');
    } catch (err) {
        next(err);
    }
};

exports.getFoodSuggestions = (req, res) => {
    const query = String(req.query.q || '').trim().toLowerCase();
    const suggestions = (query ? foodNames.filter((name) => name.includes(query)) : foodNames).slice(0, 12);
    res.json({ suggestions });
};

exports.validateItemInput = validateItemInput;
exports.expiryInfo = expiryInfo;
exports.zoneLabels = zoneLabels;
exports.categoryLabels = categoryLabels;

exports.dashboard = exports.renderDashboard;
exports.create = exports.createItem;
exports.update = exports.updateItem;
exports.remove = exports.deleteItem;
exports.foods = exports.getFoodSuggestions;