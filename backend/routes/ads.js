const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Campaign routes
router.get('/campaigns/sync', campaignController.syncCampaigns);
router.get('/campaigns', campaignController.getCampaigns);
router.get('/campaigns/analytics', campaignController.getCampaignsWithAnalytics);
router.get('/campaigns/direct', campaignController.getMyCampaignsDirect); // DEBUG ROUTE
router.get('/campaigns/:campaignId/analytics', campaignController.getCampaignAnalytics);
router.put('/campaigns/:campaignId/status', campaignController.updateCampaignStatus);
router.put('/campaigns/:campaignId', campaignController.updateCampaign);

// NEW ROUTES FOR CREATE AND DELETE
router.post('/campaigns', campaignController.createCampaign); // CREATE
router.delete('/campaigns/:campaignId', campaignController.deleteCampaign); // DELETE

router.put('/meta/update-and-sync', campaignController.updateMetaCredentialsAndSync);

module.exports = router;