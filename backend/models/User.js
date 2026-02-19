const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'client'],
        default: 'client'
    },
    metaAccessToken: {
        type: String,
        default: ''
    },
    metaAdAccountId: {
        type: String,
        default: ''
    },
    metaPageId: {
        type: String,
        default: ''
    },
    companyName: {
        type: String,
        default: ''
    },
    // ADD THIS NEW FIELD
    currency: {
        type: String,
        enum: ['USD', 'PKR', 'EUR', 'GBP'],
        default: 'USD'
    },
    // OPTIONAL: Add conversion rate for PKR
    currencyRate: {
        type: Number,
        default: 1 // Default 1 for USD
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);