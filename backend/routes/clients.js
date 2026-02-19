const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, isAdmin } = require('../middleware/auth');

// Admin routes
router.get('/admin/clients', auth, isAdmin, adminController.getClients);
router.get('/admin/campaigns', auth, isAdmin, adminController.getAllCampaigns);

module.exports = router;