const User = require('../models/User');
const Campaign = require('../models/Campaign');

// Get all clients
exports.getClients = async (req, res) => {
    try {
        const clients = await User.find({ role: 'client' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all campaigns (admin view)
exports.getAllCampaigns = async (req, res) => {
    try {
        const { clientId, status, page = 1, limit = 10 } = req.query;
        
        let query = {};
        
        if (clientId) {
            query.clientId = clientId;
        }
        
        if (status && status !== 'ALL') {
            query.status = status;
        }

        const campaigns = await Campaign.find(query)
            .populate('clientId', 'name email companyName')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Campaign.countDocuments(query);

        res.json({
            campaigns,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};