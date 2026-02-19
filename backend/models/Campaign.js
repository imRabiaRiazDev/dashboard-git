const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    campaignId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'PAUSED', 'STOPPED', 'DELETED'],
        default: 'ACTIVE'
    },
    objective: {
        type: String,
        default: ''
    },
    // NEW FIELD: Store the Meta objective (OUTCOME_*)
    metaObjective: {
        type: String,
        default: ''
    },
    dailyBudget: {
        type: Number,
        default: 0
    },
    lifetimeBudget: {
        type: Number,
        default: 0
    },
    metaDailyBudget: {
        type: Number,
        default: 0
    },
    metaLifetimeBudget: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        enum: ['USD', 'PKR', 'EUR', 'GBP'],
        default: 'USD'
    },
    startTime: {
        type: Date
    },
    endTime: {
        type: Date
    },
    audience: {
        ageMin: Number,
        ageMax: Number,
        genders: [Number],
        locations: [{
            country: String,
            region: String,
            city: String
        }],
        interests: [String]
    },
    creatives: {
        primaryText: String,
        headline: String,
        description: String,
        imageUrl: String,
        videoUrl: String,
        callToAction: String
    },
    settings: {
        billingEvent: String,
        optimizationGoal: String,
        bidStrategy: String
    },
    metrics: {
        impressions: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 },
        ctr: { type: Number, default: 0 },
        spend: { type: Number, default: 0 },
        conversions: { type: Number, default: 0 }
    },
    lastSynced: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Campaign', campaignSchema);