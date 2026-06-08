const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 90
    },
    amount: {
        type: Number,
        default: 1,
        min: 0
    },
    unit: {
        type: String,
        default: '',
        trim: true,
        maxlength: 24
    }
}, { _id: false });

const recipeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
        index: true
    },
    ingredients: {
        type: [ingredientSchema],
        validate: {
            validator: (items) => Array.isArray(items) && items.length > 0,
            message: 'At least one ingredient is required.'
        }
    },
    steps: {
        type: [String],
        default: []
    },
    preparationTimeMinutes: {
        type: Number,
        required: true,
        min: 1
    },
    diets: {
        type: [String],
        default: []
    },
    tags: {
        type: [String],
        default: []
    },
    estimatedCost: {
        type: Number,
        default: 0,
        min: 0
    },
    sourceName: {
        type: String,
        default: 'PantrySync seed',
        trim: true
    },
    sourceUrl: {
        type: String,
        default: '',
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Recipe', recipeSchema);
