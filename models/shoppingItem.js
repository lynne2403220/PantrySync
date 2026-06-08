const mongoose = require('mongoose');

const shoppingItemSchema = new mongoose.Schema({
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
        maxlength: 90
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        default: 'pcs',
        trim: true,
        maxlength: 24
    },
    bought: {
        type: Boolean,
        default: false
    },
    priceEstimate: {
        type: Number,
        default: 0,
        min: 0
    },
    sourceRecipe: {
        type: String,
        default: '',
        trim: true,
        maxlength: 120
    }
}, { timestamps: true });

module.exports = mongoose.model('ShoppingItem', shoppingItemSchema);
