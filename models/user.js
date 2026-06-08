const mongoose = require('mongoose');

const allowedDiets = ['none', 'vegetarian', 'vegan', 'halal', 'gluten-free', 'dairy-free', 'nut-free'];

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    profileImage: { type: String, default: '' },
    isAdmin: { type: Boolean, default: false },
    diets: [{ type: String, enum: allowedDiets, default: 'none' }]
}, { timestamps: true });

userSchema.methods.toSessionUser = function toSessionUser() {
    return {
        _id: this._id,
        id: this._id.toString(),
        username: this.username,
        email: this.email,
        profileImage: this.profileImage,
        isAdmin: this.isAdmin,
        diets: this.diets && this.diets.length ? this.diets : ['none']
    };
};

userSchema.statics.diets = allowedDiets;

module.exports = mongoose.model('User', userSchema);