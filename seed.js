require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');
const Item = require('./models/item');
const Recipe = require('./models/recipe');
const ShoppingItem = require('./models/shoppingItem');
const recipes = require('./data/recipes.seed.json');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pantrysync';

function daysFromNow(days) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date;
}

async function upsertUser({ username, email, password, isAdmin, diets }) {
    const passwordHash = await bcrypt.hash(password, 12);
    return User.findOneAndUpdate(
        { email },
        { username, email, passwordHash, isAdmin, diets },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
}

async function seedUsers() {
    const [admin, user] = await Promise.all([
        upsertUser({
            username: 'Admin User',
            email: 'admin@example.com',
            password: 'Admin123',
            isAdmin: true,
            diets: ['none']
        }),
        upsertUser({
            username: 'Demo User',
            email: 'user@example.com',
            password: 'User123',
            isAdmin: false,
            diets: ['halal']
        })
    ]);

    return { admin, user };
}

async function seedPantry(user) {
    await Item.deleteMany({ owner: user._id });
    await Item.insertMany([
        { owner: user._id, name: 'egg', amount: 6, unit: 'pcs', expiryDate: daysFromNow(0), category: 'protein', zone: 'fridge', price: 30, notes: 'Demo near-expiry item.' },
        { owner: user._id, name: 'spinach', amount: 1, unit: 'pack', expiryDate: daysFromNow(1), category: 'produce', zone: 'fridge', price: 16, notes: 'Near-expiry recipe boost demo.' },
        { owner: user._id, name: 'tomato', amount: 4, unit: 'pcs', expiryDate: daysFromNow(3), category: 'produce', zone: 'pantry', price: 24 },
        { owner: user._id, name: 'rice', amount: 2, unit: 'kg', expiryDate: daysFromNow(90), category: 'grain', zone: 'pantry', price: 55 },
        { owner: user._id, name: 'garlic', amount: 3, unit: 'pcs', expiryDate: daysFromNow(20), category: 'spice', zone: 'pantry', price: 10 },
        { owner: user._id, name: 'peas', amount: 1, unit: 'cup', expiryDate: daysFromNow(5), category: 'frozen', zone: 'freezer', price: 18 },
        { owner: user._id, name: 'yogurt', amount: 1, unit: 'cup', expiryDate: daysFromNow(-1), category: 'dairy', zone: 'fridge', price: 28, notes: 'Expired demo item; recipes flag it but do not boost it.' }
    ]);
}

async function seedRecipes() {
    await Recipe.collection.dropIndex('diets_1_tags_1').catch((err) => {
        if (err.codeName !== 'IndexNotFound' && err.code !== 27) throw err;
    });

    const operations = recipes.map((recipe) => ({
        updateOne: {
            filter: { title: recipe.title, sourceName: recipe.sourceName || 'PantrySync curated' },
            update: { $set: recipe },
            upsert: true
        }
    }));

    if (operations.length) await Recipe.bulkWrite(operations);
}

async function seedShopping(user) {
    await ShoppingItem.deleteMany({ owner: user._id });
    await ShoppingItem.insertMany([
        { owner: user._id, name: 'cheese', quantity: 1, unit: 'pack', bought: false, priceEstimate: 55, sourceRecipe: 'Quick Tomato Omelet' },
        { owner: user._id, name: 'bread', quantity: 1, unit: 'pack', bought: true, priceEstimate: 18 }
    ]);
}

async function run() {
    await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 5000)
    });

    const { user } = await seedUsers();
    await Promise.all([
        seedPantry(user),
        seedRecipes(),
        seedShopping(user)
    ]);

    console.log('Seed complete.');
    console.log('Admin: admin@example.com / Admin123');
    console.log('User: user@example.com / User123');
    await mongoose.disconnect();
}

run().catch(async (err) => {
    console.error('Seed failed:', err.message);
    await mongoose.disconnect();
    process.exit(1);
});
