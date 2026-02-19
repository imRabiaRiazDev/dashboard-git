const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection - Simplified for newer MongoDB driver
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Meta Ads Dashboard API is running' });
});

// Test route to verify all routes are working
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working!',
        routes: {
            auth: ['POST /api/auth/register', 'POST /api/auth/login', 'GET /api/auth/me'],
            campaigns: ['GET /api/ads/campaigns', 'GET /api/ads/campaigns/sync'],
            admin: ['GET /api/clients/admin/clients', 'GET /api/clients/admin/campaigns']
        }
    });
});

// Import routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const adRoutes = require('./routes/ads');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/ads', adRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API Test URL: http://localhost:${PORT}/api/test`);
});