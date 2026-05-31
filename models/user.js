const mongoose = require('mongoose');

const diets = ['none', 'vegan', 'vegetarian', 'halal', 'gluten-free', 'dairy-free', 'nut-free'];

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    profilePicture: { type: String, default: '' },
    diet: [{ type: String, enum: diets, default: 'none' }]
}, { timestamps: true });

userSchema.methods.safe = function () {
    return { id: this._id, name: this.name, email: this.email, role: this.role, diet: this.diet, profilePicture: this.profilePicture };
};

userSchema.statics.diets = diets;

module.exports = mongoose.model('User', userSchema);
