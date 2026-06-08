const mongoose = require('mongoose');

const zones = ['fridge', 'pantry', 'freezer'];
const categories = ['produce', 'protein', 'dairy', 'grain', 'bakery', 'canned', 'frozen', 'spice', 'other'];
const units = ['pcs', 'g', 'kg', 'ml', 'l', 'pack', 'cup', 'tbsp', 'tsp'];

const itemSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        enum: units,
        default: 'pcs'
    },
    expiryDate: {
        type: Date,
        default: null
    },
    category: {
        type: String,
        enum: categories,
        default: 'other'
    },
    zone: {
        type: String,
        enum: zones,
        default: 'pantry'
    },
    price: {
        type: Number,
        min: 0,
        default: 0
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 300,
        default: ''
    }
}, { timestamps: true });

itemSchema.statics.zones = zones;
itemSchema.statics.categories = categories;
itemSchema.statics.units = units;

module.exports = mongoose.model('Item', itemSchema);
