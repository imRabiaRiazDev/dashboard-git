const Campaign = require('../models/Campaign');
const MetaApiService = require('../services/metaApiService');
const axios = require('axios');

// Helper function to calculate date ranges
const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate = now;
  
  switch(period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'yesterday':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'last7d':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'last30d':
      startDate = new Date(now.setDate(now.getDate() - 30));
      break;
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    default:
      startDate = new Date(now.setHours(now.getHours() - 24));
  }
  
  return { startDate, endDate };
};

// Helper function to convert Meta budget (cents) to local currency
const convertMetaBudgetToLocal = (metaBudgetInCents, userCurrency, metaCurrency = 'USD') => {
  if (!metaBudgetInCents) return 0;
  
  const budgetInUSD = metaBudgetInCents / 100;
  
  if (userCurrency === 'USD' || !userCurrency) {
    return budgetInUSD;
  }
  
  const conversionRates = {
    'USD': 1,
    'PKR': 280,
    'EUR': 0.92,
    'GBP': 0.79
  };
  
  const rate = conversionRates[userCurrency] || 1;
  return parseFloat((budgetInUSD * rate).toFixed(2));
};

// Helper function to convert Meta spend (USD) to local currency
const convertMetaSpendToLocal = (spendInUSD, userCurrency) => {
  if (!spendInUSD) return 0;
  
  if (userCurrency === 'USD' || !userCurrency) {
    return parseFloat(spendInUSD);
  }
  
  const conversionRates = {
    'USD': 1,
    'PKR': 280,
    'EUR': 0.92,
    'GBP': 0.79
  };
  
  const rate = conversionRates[userCurrency] || 1;
  return parseFloat((spendInUSD * rate).toFixed(2));
};

// Helper function to format currency
const formatCurrency = (amount, currency) => {
  if (!amount) amount = 0;
  
  const currencySymbols = {
    'USD': '$',
    'PKR': '₨',
    'EUR': '€',
    'GBP': '£'
  };
  
  const symbol = currencySymbols[currency] || '$';
  
  const formattedAmount = parseFloat(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return `${symbol}${formattedAmount}`;
};

// ==================== SYNC CAMPAIGNS ====================
exports.syncCampaigns = async (req, res) => {
  try {
    const user = req.user;
    
    console.log('🔄 Starting campaign sync for user:', user.email);
    console.log('📋 User Meta details:', {
      hasToken: !!user.metaAccessToken,
      tokenLength: user.metaAccessToken?.length || 0,
      hasAdAccount: !!user.metaAdAccountId,
      adAccountId: user.metaAdAccountId
    });
    
    if (!user.metaAccessToken || !user.metaAdAccountId) {
      return res.status(400).json({ 
        success: false,
        error: 'Meta credentials not set. Please add them in Settings.' 
      });
    }

    const metaApi = new MetaApiService(user.metaAccessToken, user.metaAdAccountId);
    
    let metaCampaigns = [];
    try {
      metaCampaigns = await metaApi.getCampaigns();
      console.log(`✅ Meta API returned ${metaCampaigns?.length || 0} campaigns`);
    } catch (apiError) {
      console.error('❌ Meta API Error:', apiError.message);
      return res.status(400).json({
        success: false,
        error: `Meta API Error: ${apiError.message}`
      });
    }
    
    if (!metaCampaigns || metaCampaigns.length === 0) {
      return res.json({
        success: true,
        message: 'No campaigns found in your Meta Ad Account',
        campaigns: [],
        total: 0
      });
    }

    let syncedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const metaCampaign of metaCampaigns) {
      try {
        console.log(`📦 Processing campaign: ${metaCampaign.name || 'Unnamed'} (ID: ${metaCampaign.id})`);
        
        let insights = {};
        try {
          insights = await metaApi.getCampaignInsights(metaCampaign.id);
        } catch (insightsError) {
          console.warn(`⚠️ Could not fetch insights for campaign ${metaCampaign.id}:`, insightsError.message);
          insights = {
            impressions: 0,
            clicks: 0,
            spend: 0,
            conversions: 0,
            ctr: 0
          };
        }
        
        let campaign = await Campaign.findOne({ 
          campaignId: metaCampaign.id,
          clientId: user._id 
        });

        const dailyBudgetInLocal = convertMetaBudgetToLocal(
          metaCampaign.daily_budget || 0,
          user.currency || 'USD'
        );
        
        const lifetimeBudgetInLocal = convertMetaBudgetToLocal(
          metaCampaign.lifetime_budget || 0,
          user.currency || 'USD'
        );
        
        const spendInLocal = convertMetaSpendToLocal(
          insights.spend || 0,
          user.currency || 'USD'
        );
        
        let ctr = 0;
        if (insights.impressions && insights.clicks) {
          ctr = (insights.clicks / insights.impressions) * 100;
        }

        const campaignData = {
          clientId: user._id,
          campaignId: metaCampaign.id,
          name: metaCampaign.name || 'Unnamed Campaign',
          status: metaCampaign.status || 'ACTIVE',
          objective: metaCampaign.objective || '',
          metaDailyBudget: metaCampaign.daily_budget || 0,
          metaLifetimeBudget: metaCampaign.lifetime_budget || 0,
          dailyBudget: dailyBudgetInLocal,
          lifetimeBudget: lifetimeBudgetInLocal,
          currency: user.currency || 'USD',
          startTime: metaCampaign.start_time ? new Date(metaCampaign.start_time) : null,
          endTime: metaCampaign.end_time ? new Date(metaCampaign.end_time) : null,
          createdAt: metaCampaign.created_time ? new Date(metaCampaign.created_time) : new Date(),
          lastSynced: new Date(),
          metrics: {
            impressions: parseInt(insights.impressions) || 0,
            clicks: parseInt(insights.clicks) || 0,
            spend: spendInLocal,
            conversions: parseInt(insights.conversions) || 0,
            ctr: parseFloat(insights.ctr) || parseFloat(ctr.toFixed(2))
          }
        };

        if (campaign) {
          Object.assign(campaign, campaignData);
          await campaign.save();
          updatedCount++;
        } else {
          campaign = new Campaign(campaignData);
          await campaign.save();
          syncedCount++;
        }
        
        console.log(`✅ Campaign processed successfully: ${metaCampaign.name}`);

      } catch (error) {
        console.error(`❌ Error processing campaign ${metaCampaign.id}:`, error.message);
        errorCount++;
        continue;
      }
    }

    const campaigns = await Campaign.find({ clientId: user._id }).sort({ createdAt: -1 }).lean();
    
    const campaignsWithFormattedCurrency = campaigns.map(campaign => ({
      ...campaign,
      dailyBudgetFormatted: formatCurrency(campaign.dailyBudget, campaign.currency),
      lifetimeBudgetFormatted: formatCurrency(campaign.lifetimeBudget, campaign.currency),
      metrics: {
        ...campaign.metrics,
        spendFormatted: formatCurrency(campaign.metrics.spend, campaign.currency)
      }
    }));

    console.log(`📊 Sync Summary:`);
    console.log(`   ✅ New campaigns: ${syncedCount}`);
    console.log(`   ✅ Updated campaigns: ${updatedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📈 Total in database: ${campaigns.length}`);

    res.json({
      success: true,
      message: `Synced ${syncedCount} new campaigns, updated ${updatedCount} existing campaigns`,
      total: campaigns.length,
      campaigns: campaignsWithFormattedCurrency,
      syncStats: {
        new: syncedCount,
        updated: updatedCount,
        errors: errorCount,
        total: campaigns.length
      }
    });
    
  } catch (error) {
    console.error('🔥 Sync campaigns error:', error.message);
    console.error('🔥 Error stack:', error.stack);
    
    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      return res.status(400).json({
        success: false,
        error: `Meta API Error: ${fbError.message}`,
        code: fbError.code,
        type: fbError.type
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to sync campaigns. Please check your Meta credentials.'
    });
  }
};

// ==================== GET CAMPAIGNS WITH ANALYTICS ====================
exports.getCampaignsWithAnalytics = async (req, res) => {
  try {
    const { period = 'last7d', page = 1, limit = 10, status } = req.query;
    const userId = req.user._id;
    
    console.log(`📊 Getting campaigns for user ${userId}, period: ${period}`);
    
    let query = { clientId: userId };
    
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const { startDate, endDate } = getDateRange(period);

    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const campaignsWithFormattedCurrency = campaigns.map(campaign => ({
      ...campaign,
      dailyBudgetFormatted: formatCurrency(campaign.dailyBudget, campaign.currency),
      lifetimeBudgetFormatted: formatCurrency(campaign.lifetimeBudget, campaign.currency),
      metrics: {
        ...campaign.metrics,
        spendFormatted: formatCurrency(campaign.metrics.spend, campaign.currency)
      }
    }));

    const totalCampaigns = await Campaign.countDocuments(query);
    const activeCampaigns = await Campaign.countDocuments({ ...query, status: 'ACTIVE' });
    
    const totalSpendResult = await Campaign.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$metrics.spend" } } }
    ]);
    
    const totalSpend = totalSpendResult[0]?.total || 0;
    
    const totalSpendFormatted = formatCurrency(totalSpend, req.user.currency || 'USD');

    const dailyTrends = await Campaign.aggregate([
      { 
        $match: { 
          ...query,
          lastSynced: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: "%Y-%m-%d", date: "$lastSynced" }
          },
          impressions: { $sum: "$metrics.impressions" },
          clicks: { $sum: "$metrics.clicks" },
          spend: { $sum: "$metrics.spend" },
          conversions: { $sum: "$metrics.conversions" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    console.log(`✅ Found ${campaigns.length} campaigns (page ${page} of ${Math.ceil(totalCampaigns / limit)}) for user ${userId}`);

    res.json({
      success: true,
      campaigns: campaignsWithFormattedCurrency,
      analytics: {
        total: totalCampaigns,
        active: activeCampaigns,
        totalSpend: totalSpend,
        totalSpendFormatted: totalSpendFormatted,
        currency: req.user.currency || 'USD',
        period,
        startDate,
        endDate
      },
      trends: dailyTrends.map(trend => ({
        ...trend,
        spendFormatted: formatCurrency(trend.spend, req.user.currency || 'USD')
      })),
      page: parseInt(page),
      pages: Math.ceil(totalCampaigns / limit)
    });
  } catch (error) {
    console.error('🔥 Get campaigns analytics error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// ==================== GET CAMPAIGNS (BASIC) ====================
exports.getCampaigns = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const userId = req.user._id;
    
    console.log(`📋 Getting campaigns for user ${userId}, status: ${status || 'ALL'}`);
    
    let query = { clientId: userId };
    
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const campaignsWithFormattedCurrency = campaigns.map(campaign => ({
      ...campaign,
      dailyBudgetFormatted: formatCurrency(campaign.dailyBudget, campaign.currency),
      lifetimeBudgetFormatted: formatCurrency(campaign.lifetimeBudget, campaign.currency),
      metrics: {
        ...campaign.metrics,
        spendFormatted: formatCurrency(campaign.metrics.spend, campaign.currency)
      }
    }));

    const total = await Campaign.countDocuments(query);

    console.log(`✅ Found ${campaigns.length} campaigns (total: ${total}) for user ${userId}`);

    res.json({
      success: true,
      campaigns: campaignsWithFormattedCurrency,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('🔥 Get campaigns error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// ==================== GET CAMPAIGN ANALYTICS ====================
exports.getCampaignAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { period = 'last7d' } = req.query;
    const userId = req.user._id;

    console.log(`📊 Getting analytics for campaign ${campaignId} for user ${userId}`);

    const campaign = await Campaign.findOne({
      _id: campaignId,
      clientId: userId
    }).lean();

    if (!campaign) {
      console.log(`❌ Campaign ${campaignId} not found for user ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const { startDate, endDate } = getDateRange(period);

    const campaignWithFormattedCurrency = {
      ...campaign,
      dailyBudgetFormatted: formatCurrency(campaign.dailyBudget, campaign.currency),
      lifetimeBudgetFormatted: formatCurrency(campaign.lifetimeBudget, campaign.currency),
      metrics: {
        ...campaign.metrics,
        spendFormatted: formatCurrency(campaign.metrics.spend, campaign.currency)
      }
    };

    res.json({
      success: true,
      campaignId: campaign.campaignId,
      name: campaign.name,
      period,
      campaign: campaignWithFormattedCurrency,
      metrics: campaignWithFormattedCurrency.metrics,
      dailyAverage: {
        impressions: campaign.metrics.impressions / 7,
        clicks: campaign.metrics.clicks / 7,
        spend: campaign.metrics.spend / 7,
        spendFormatted: formatCurrency(campaign.metrics.spend / 7, campaign.currency),
        conversions: campaign.metrics.conversions / 7
      },
      currency: campaign.currency,
      startDate,
      endDate
    });

  } catch (error) {
    console.error('🔥 Get campaign analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ==================== UPDATE META CREDENTIALS AND SYNC ====================
exports.updateMetaCredentialsAndSync = async (req, res) => {
  try {
    const { metaAccessToken, metaAdAccountId, currency = 'USD' } = req.body;
    const user = req.user;
    
    console.log('🔄 Updating Meta credentials for:', user.email);
    console.log('📋 Token length:', metaAccessToken?.length || 0);
    console.log('📋 Ad Account ID:', metaAdAccountId);
    
    user.metaAccessToken = metaAccessToken || '';
    user.metaAdAccountId = metaAdAccountId || '';
    
    if (currency) {
      user.currency = currency;
    }
    
    await user.save();
    
    console.log('✅ Meta credentials updated, starting auto-sync...');
    
    const metaApi = new MetaApiService(metaAccessToken, metaAdAccountId);
    let metaCampaigns = [];
    
    try {
      metaCampaigns = await metaApi.getCampaigns();
      console.log(`✅ Found ${metaCampaigns?.length || 0} campaigns in Meta`);
    } catch (syncError) {
      console.error('❌ Error fetching campaigns during auto-sync:', syncError.message);
      metaCampaigns = [];
    }
    
    let syncedCount = 0;
    for (const metaCampaign of metaCampaigns.slice(0, 5)) {
      try {
        let insights = {};
        try {
          insights = await metaApi.getCampaignInsights(metaCampaign.id);
        } catch (insightsError) {
          console.warn(`⚠️ Could not fetch insights for ${metaCampaign.id}:`, insightsError.message);
          insights = {
            impressions: 0,
            clicks: 0,
            spend: 0,
            conversions: 0
          };
        }
        
        const dailyBudgetInLocal = convertMetaBudgetToLocal(
          metaCampaign.daily_budget || 0,
          user.currency || 'USD'
        );
        
        const spendInLocal = convertMetaSpendToLocal(
          insights.spend || 0,
          user.currency || 'USD'
        );

        let campaign = await Campaign.findOne({
          campaignId: metaCampaign.id,
          clientId: user._id
        });

        const campaignData = {
          clientId: user._id,
          campaignId: metaCampaign.id,
          name: metaCampaign.name || 'Unnamed Campaign',
          status: metaCampaign.status || 'ACTIVE',
          objective: metaCampaign.objective || '',
          metaDailyBudget: metaCampaign.daily_budget || 0,
          dailyBudget: dailyBudgetInLocal,
          currency: user.currency || 'USD',
          startTime: metaCampaign.start_time ? new Date(metaCampaign.start_time) : null,
          endTime: metaCampaign.end_time ? new Date(metaCampaign.end_time) : null,
          lastSynced: new Date(),
          metrics: {
            impressions: parseInt(insights.impressions) || 0,
            clicks: parseInt(insights.clicks) || 0,
            spend: spendInLocal,
            conversions: parseInt(insights.conversions) || 0
          }
        };

        if (campaign) {
          Object.assign(campaign, campaignData);
        } else {
          campaign = new Campaign(campaignData);
        }
        
        await campaign.save();
        syncedCount++;
        
        console.log(`✅ Auto-synced campaign: ${metaCampaign.name}`);
        
      } catch (error) {
        console.error(`❌ Error syncing campaign ${metaCampaign.id}:`, error.message);
      }
    }

    res.json({
      success: true,
      message: 'Meta credentials updated successfully',
      syncedCampaigns: syncedCount,
      metaAdAccountId: user.metaAdAccountId,
      currency: user.currency
    });
    
  } catch (error) {
    console.error('🔥 Update Meta credentials error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ==================== UPDATE CAMPAIGN STATUS (WITH META SYNC) ====================
exports.updateCampaignStatus = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { status } = req.body;
    const user = req.user;

    console.log(`🔄 Updating status for campaign ${campaignId} to ${status} for user ${user._id}`);

    const campaign = await Campaign.findOne({ 
      _id: campaignId,
      clientId: user._id 
    });

    if (!campaign) {
      console.log(`❌ Campaign ${campaignId} not found for user ${user._id}`);
      return res.status(404).json({ 
        success: false,
        error: 'Campaign not found' 
      });
    }

    console.log(`📝 Updating local status from ${campaign.status} to ${status}`);

    campaign.status = status;
    campaign.lastSynced = new Date();
    await campaign.save();

    let metaSynced = false;
    if (user.metaAccessToken && campaign.campaignId && !campaign.campaignId.startsWith('local_')) {
      try {
        console.log(`🔄 Updating campaign status on Meta Ads: ${campaign.campaignId}`);
        
        await axios.post(
          `https://graph.facebook.com/v18.0/${campaign.campaignId}`,
          null,
          {
            params: {
              access_token: user.metaAccessToken,
              status: status.toUpperCase()
            }
          }
        );
        
        console.log(`✅ Campaign status updated on Meta Ads: ${campaign.campaignId}`);
        metaSynced = true;
      } catch (metaError) {
        console.error('⚠️ Meta status update failed:', metaError.response?.data || metaError.message);
        metaSynced = false;
      }
    }

    const campaignWithFormattedCurrency = {
      ...campaign.toObject(),
      dailyBudgetFormatted: formatCurrency(campaign.dailyBudget, campaign.currency),
      metrics: {
        ...campaign.metrics,
        spendFormatted: formatCurrency(campaign.metrics.spend, campaign.currency)
      }
    };

    res.json({ 
      success: true,
      message: metaSynced ? 
        'Campaign status updated locally and on Meta Ads' : 
        'Campaign status updated locally (Meta sync not available)',
      campaign: campaignWithFormattedCurrency,
      metaSynced
    });
  } catch (error) {
    console.error('🔥 Update campaign status error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// ==================== UPDATE CAMPAIGN (WITH META SYNC) ====================
exports.updateCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const updates = req.body;
    const user = req.user;

    console.log(`🔄 Updating campaign ${campaignId} for user ${user._id}`);
    console.log('📝 Updates:', updates);

    const campaign = await Campaign.findOne({ 
      _id: campaignId,
      clientId: user._id 
    });

    if (!campaign) {
      console.log(`❌ Campaign ${campaignId} not found for user ${user._id}`);
      return res.status(404).json({ 
        success: false,
        error: 'Campaign not found' 
      });
    }

    let metaSynced = false;
    let metaUpdateData = {};
    
    if (user.metaAccessToken && user.metaAdAccountId && campaign.campaignId && !campaign.campaignId.startsWith('local_')) {
      try {
        if (updates.name !== undefined) {
          metaUpdateData.name = updates.name;
          console.log(`📝 Meta: Updating name to ${updates.name}`);
        }
        
        if (updates.dailyBudget !== undefined) {
          let metaDailyBudgetInCents = Math.round(updates.dailyBudget * 100);
          if (user.currency !== 'USD') {
            const conversionRates = {
              'USD': 1,
              'PKR': 1/280,
              'EUR': 1/0.92,
              'GBP': 1/0.79
            };
            const rate = conversionRates[user.currency] || 1;
            metaDailyBudgetInCents = Math.round((updates.dailyBudget * rate) * 100);
          }
          metaUpdateData.daily_budget = metaDailyBudgetInCents;
          console.log(`💰 Meta: Updating budget to ${metaDailyBudgetInCents} cents (${updates.dailyBudget} ${user.currency})`);
        }
        
        if (updates.status !== undefined) {
          metaUpdateData.status = updates.status.toUpperCase();
          console.log(`🔄 Meta: Updating status to ${updates.status}`);
        }
        
        if (Object.keys(metaUpdateData).length > 0) {
          console.log(`🔄 Updating campaign on Meta Ads: ${campaign.campaignId}`);
          console.log('📦 Meta update data:', metaUpdateData);
          
          await axios.post(
            `https://graph.facebook.com/v18.0/${campaign.campaignId}`,
            null,
            {
              params: {
                access_token: user.metaAccessToken,
                ...metaUpdateData
              }
            }
          );
          
          console.log(`✅ Campaign updated on Meta Ads: ${campaign.campaignId}`);
          metaSynced = true;
          
          if (updates.dailyBudget !== undefined && metaUpdateData.daily_budget) {
            campaign.metaDailyBudget = metaUpdateData.daily_budget;
          }
        } else {
          console.log('ℹ️ No Meta updates needed');
        }
      } catch (metaError) {
        console.error('⚠️ Meta API update failed:', metaError.response?.data || metaError.message);
        metaSynced = false;
      }
    } else {
      console.log('ℹ️ Meta sync not available (no token, no ad account, or local campaign)');
    }

    const allowedUpdates = ['name', 'dailyBudget', 'lifetimeBudget', 'objective', 
                           'audience', 'creatives', 'settings', 'status'];
    
    console.log('📝 Updating local fields:', Object.keys(updates).filter(key => allowedUpdates.includes(key)));
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        campaign[key] = updates[key];
      }
    });

    campaign.lastSynced = new Date();
    await campaign.save();

    console.log(`✅ Local campaign updated successfully`);

    const campaignWithFormattedCurrency = {
      ...campaign.toObject(),
      dailyBudgetFormatted: formatCurrency(campaign.dailyBudget, campaign.currency),
      lifetimeBudgetFormatted: formatCurrency(campaign.lifetimeBudget, campaign.currency),
      metrics: {
        ...campaign.metrics,
        spendFormatted: formatCurrency(campaign.metrics.spend, campaign.currency)
      }
    };

    res.json({ 
      success: true,
      message: metaSynced ? 
        'Campaign updated locally and synced with Meta Ads' : 
        'Campaign updated locally (Meta sync not available)',
      campaign: campaignWithFormattedCurrency,
      metaSynced
    });
  } catch (error) {
    console.error('🔥 Update campaign error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// ==================== GET MY CAMPAIGNS DIRECT (FOR DEBUGGING) ====================
exports.getMyCampaignsDirect = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = req.user;
    
    console.log('🔍 [DEBUG] Fetching campaigns directly for user:', userId);
    console.log('🔍 [DEBUG] User currency:', user.currency);
    console.log('🔍 [DEBUG] Meta connected:', {
      hasToken: !!user.metaAccessToken,
      tokenLength: user.metaAccessToken?.length || 0,
      hasAdAccount: !!user.metaAdAccountId,
      adAccountId: user.metaAdAccountId
    });
    
    const campaigns = await Campaign.find({ clientId: userId })
      .sort({ createdAt: -1 })
      .lean();
    
    const campaignsWithFormattedCurrency = campaigns.map(campaign => ({
      ...campaign,
      dailyBudgetFormatted: formatCurrency(campaign.dailyBudget, campaign.currency),
      lifetimeBudgetFormatted: formatCurrency(campaign.lifetimeBudget, campaign.currency),
      metaDailyBudgetInUSD: campaign.metaDailyBudget ? (campaign.metaDailyBudget / 100).toFixed(2) : 'N/A',
      isMetaCampaign: !campaign.campaignId.startsWith('local_'),
      metrics: {
        ...campaign.metrics,
        spendFormatted: formatCurrency(campaign.metrics.spend, campaign.currency)
      }
    }));
    
    console.log(`✅ [DEBUG] Found ${campaigns.length} campaigns for user ${userId}`);
    
    res.json({
      success: true,
      campaigns: campaignsWithFormattedCurrency,
      total: campaigns.length,
      message: `Found ${campaigns.length} campaigns`,
      currency: user.currency,
      hasMetaToken: !!user.metaAccessToken,
      tokenLength: user.metaAccessToken?.length || 0,
      hasMetaAdAccount: !!user.metaAdAccountId,
      metaAdAccountId: user.metaAdAccountId
    });
    
  } catch (error) {
    console.error('[DEBUG] Error in getMyCampaignsDirect:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ==================== CREATE NEW CAMPAIGN - ULTIMATE FIXED VERSION ====================
exports.createCampaign = async (req, res) => {
  try {
    const user = req.user;
    const {
      name,
      objective,
      dailyBudget,
      lifetimeBudget,
      status = 'PAUSED',
      audience = {},
      creatives = {},
      settings = {}
    } = req.body;

    console.log('🆕 Creating new campaign for user:', user.email);
    console.log('📦 Campaign data received:', { 
      name, 
      objective, 
      dailyBudget, 
      status,
      currency: user.currency 
    });
    console.log('🔑 Meta credentials present:', {
      hasToken: !!user.metaAccessToken,
      tokenLength: user.metaAccessToken?.length || 0,
      hasAdAccount: !!user.metaAdAccountId,
      adAccountId: user.metaAdAccountId
    });

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name is required'
      });
    }
    
    if (!objective) {
      return res.status(400).json({
        success: false,
        error: 'Campaign objective is required'
      });
    }
    
    if (!dailyBudget || dailyBudget < 1) {
      return res.status(400).json({
        success: false,
        error: 'Daily budget must be at least $1'
      });
    }

    let metaCampaignId = null;
    let metaSynced = false;
    let metaDailyBudgetInCents = 0;
    let metaErrorMessage = '';
    let metaSuccessMessage = '';

    // Create campaign in Meta Business if credentials available
    if (user.metaAccessToken && user.metaAdAccountId) {
      try {
        console.log('🔄 Creating campaign in Meta Business...');
        console.log('🏦 Ad Account ID:', user.metaAdAccountId);
        console.log('💰 Daily Budget:', dailyBudget, user.currency || 'USD');

        // IMPORTANT: First test if token is still valid
        try {
          const testResponse = await axios.get(
            `https://graph.facebook.com/v18.0/me`,
            {
              params: {
                access_token: user.metaAccessToken,
                fields: 'id,name'
              }
            }
          );
          console.log('✅ Token is valid for user:', testResponse.data.name);
        } catch (tokenError) {
          console.error('❌ Token is invalid or expired:', tokenError.message);
          throw new Error('Your Meta access token is invalid or expired. Please reconnect your account in Settings.');
        }

        // Get account currency
        let accountCurrency = 'USD';
        try {
          let adAccountIdForCurrency = user.metaAdAccountId;
          if (!adAccountIdForCurrency.startsWith('act_')) {
            adAccountIdForCurrency = `act_${adAccountIdForCurrency}`;
          }
          
          const accountResponse = await axios.get(
            `https://graph.facebook.com/v18.0/${adAccountIdForCurrency}`,
            {
              params: {
                access_token: user.metaAccessToken,
                fields: 'currency'
              }
            }
          );
          accountCurrency = accountResponse.data.currency || 'USD';
          console.log(`💰 Meta Account Currency: ${accountCurrency}`);
        } catch (currencyError) {
          console.log('Could not fetch account currency, using USD');
          accountCurrency = 'USD';
        }

        // Convert budget to the account's currency minor units
        metaDailyBudgetInCents = Math.round(parseFloat(dailyBudget) * 100);
        console.log(`💰 Meta daily budget in minor units: ${metaDailyBudgetInCents} (${accountCurrency})`);

        // Ensure adAccountId has 'act_' prefix for Meta API
        let adAccountId = user.metaAdAccountId;
        if (!adAccountId.startsWith('act_')) {
          adAccountId = `act_${adAccountId}`;
        }

        // Map old objectives to new OUTCOME_* objectives
        const objectiveMapping = {
          'CONVERSIONS': 'OUTCOME_SALES',
          'LEAD_GENERATION': 'OUTCOME_LEADS',
          'LINK_CLICKS': 'OUTCOME_TRAFFIC',
          'BRAND_AWARENESS': 'OUTCOME_AWARENESS',
          'REACH': 'OUTCOME_AWARENESS',
          'VIDEO_VIEWS': 'OUTCOME_ENGAGEMENT',
          'POST_ENGAGEMENT': 'OUTCOME_ENGAGEMENT',
          'PAGE_LIKES': 'OUTCOME_ENGAGEMENT',
          'APP_INSTALLS': 'OUTCOME_APP_PROMOTION',
          'MESSAGES': 'OUTCOME_ENGAGEMENT',
          'EVENT_RESPONSES': 'OUTCOME_ENGAGEMENT',
          'PRODUCT_CATALOG_SALES': 'OUTCOME_SALES',
          'STORE_VISITS': 'OUTCOME_TRAFFIC',
          'OUTCOME_SALES': 'OUTCOME_SALES',
          'OUTCOME_LEADS': 'OUTCOME_LEADS',
          'OUTCOME_TRAFFIC': 'OUTCOME_TRAFFIC',
          'OUTCOME_ENGAGEMENT': 'OUTCOME_ENGAGEMENT',
          'OUTCOME_AWARENESS': 'OUTCOME_AWARENESS',
          'OUTCOME_APP_PROMOTION': 'OUTCOME_APP_PROMOTION'
        };

        // Valid Meta objectives (new format)
        const validObjectives = [
          'OUTCOME_LEADS',
          'OUTCOME_SALES',
          'OUTCOME_ENGAGEMENT',
          'OUTCOME_AWARENESS',
          'OUTCOME_TRAFFIC',
          'OUTCOME_APP_PROMOTION'
        ];

        let metaObjective = objective.toUpperCase();
        
        // Map old objective to new one
        if (objectiveMapping[metaObjective]) {
          metaObjective = objectiveMapping[metaObjective];
          console.log(`🔄 Mapped objective from ${objective} to ${metaObjective}`);
        }

        // Validate objective
        if (!validObjectives.includes(metaObjective)) {
          console.log(`⚠️ Invalid objective: ${metaObjective}, defaulting to OUTCOME_TRAFFIC`);
          metaObjective = 'OUTCOME_TRAFFIC';
        }

        console.log(`📋 Meta Objective: ${metaObjective}`);

        // Status must be UPPERCASE for Meta API
        let metaStatus = status.toUpperCase();
        if (metaStatus !== 'ACTIVE' && metaStatus !== 'PAUSED') {
          console.log(`⚠️ Invalid status: ${metaStatus}, defaulting to PAUSED`);
          metaStatus = 'PAUSED';
        }

        console.log(`📋 Meta Status: ${metaStatus}`);

        // CRITICAL FIX: special_ad_categories MUST be a JSON stringified array
        const specialAdCategories = JSON.stringify([]);
        console.log(`📋 Meta Special Ad Categories: ${specialAdCategories}`);

        // CRITICAL FIX: buying_type must be exactly 'AUCTION'
        const buyingType = 'AUCTION';
        console.log(`📋 Meta Buying Type: ${buyingType}`);

        // Prepare campaign data for Meta API - MUST use params object NOT query string
        const metaCampaignData = {
          access_token: user.metaAccessToken,
          name: name,
          objective: metaObjective,
          status: metaStatus,
          special_ad_categories: specialAdCategories,
          buying_type: buyingType,
          daily_budget: metaDailyBudgetInCents
        };

        // Add lifetime budget if provided and valid
        if (lifetimeBudget && lifetimeBudget > 0) {
          let metaLifetimeBudgetInCents = Math.round(parseFloat(lifetimeBudget) * 100);
          metaCampaignData.lifetime_budget = metaLifetimeBudgetInCents;
        }

        console.log('📦 Final Meta campaign data:', JSON.stringify(metaCampaignData, null, 2));

        // Create campaign on Meta - using params object
        const createResponse = await axios({
          method: 'post',
          url: `https://graph.facebook.com/v18.0/${adAccountId}/campaigns`,
          params: metaCampaignData,
          timeout: 30000
        });

        console.log('✅ Meta API Response:', createResponse.data);
        metaCampaignId = createResponse.data.id;
        console.log('✅ Campaign created in Meta Business, ID:', metaCampaignId);
        console.log('✅ Campaign Objective in Meta:', metaObjective);
        console.log('✅ Campaign Status in Meta:', metaStatus);
        metaSynced = true;
        metaSuccessMessage = `Campaign created in Meta with ID: ${metaCampaignId} | Objective: ${metaObjective} | Status: ${metaStatus}`;

      } catch (metaError) {
        console.error('❌ Meta API create failed - DETAILED ERROR:');
        
        if (metaError.response) {
          console.error('Response Status:', metaError.response.status);
          console.error('Response Headers:', metaError.response.headers);
          console.error('Response Data:', JSON.stringify(metaError.response.data, null, 2));
          
          const fbError = metaError.response.data?.error;
          if (fbError) {
            metaErrorMessage = `Meta API Error (${fbError.code}): ${fbError.message}`;
            console.error('Facebook Error Code:', fbError.code);
            console.error('Facebook Error Type:', fbError.type);
            console.error('Facebook Error Message:', fbError.message);
            console.error('Facebook Error Subcode:', fbError.error_subcode);
            
            // Specific error handling
            if (fbError.code === 100) {
              if (fbError.message.includes('daily_budget')) {
                metaErrorMessage = 'Invalid daily budget. Minimum budget is $1.00 USD (100 cents).';
              } else if (fbError.message.includes('objective')) {
                metaErrorMessage = 'Invalid campaign objective. Must be one of: OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_ENGAGEMENT, OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_APP_PROMOTION';
              } else if (fbError.message.includes('name')) {
                metaErrorMessage = 'Invalid campaign name. Name must be between 1 and 255 characters.';
              } else if (fbError.message.includes('status')) {
                metaErrorMessage = 'Invalid campaign status. Status must be ACTIVE or PAUSED.';
              } else if (fbError.message.includes('special_ad_categories')) {
                metaErrorMessage = 'Missing special_ad_categories. This field is required and must be a JSON string.';
              } else if (fbError.message.includes('buying_type')) {
                metaErrorMessage = 'Invalid buying_type. Must be AUCTION.';
              } else {
                metaErrorMessage = `Invalid parameter: ${fbError.message}. Please check your campaign settings.`;
              }
            } else if (fbError.code === 200) {
              metaErrorMessage = 'Permission error. Your access token needs ads_management permission.';
            } else if (fbError.code === 190) {
              metaErrorMessage = 'Invalid or expired access token. Please reconnect your Meta account.';
            } else if (fbError.code === 368) {
              metaErrorMessage = 'Temporary issue with Meta API. Please try again in a few minutes.';
            } else if (fbError.code === 2) {
              metaErrorMessage = 'Meta API temporary issue. Please try again.';
            } else if (fbError.code === 10) {
              metaErrorMessage = 'Permission denied. Your app may not be approved for this action.';
            }
          }
        } else if (metaError.request) {
          console.error('No response received from Meta API');
          metaErrorMessage = 'No response from Meta API. Please check your internet connection.';
        } else {
          console.error('Error setting up request:', metaError.message);
          metaErrorMessage = `Request setup error: ${metaError.message}`;
        }
        
        metaSynced = false;
        console.log('🔄 Creating campaign locally only...');
      }
    } else {
      console.log('ℹ️ Meta credentials not available, creating local campaign only');
      console.log('🔑 Token present:', !!user.metaAccessToken);
      console.log('🏦 Ad Account present:', !!user.metaAdAccountId);
      metaErrorMessage = 'Meta credentials not configured. Please connect your Meta account in Settings.';
    }

    // Generate campaign ID
    const campaignId = metaCampaignId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create campaign in local database
    const campaignData = {
      clientId: user._id,
      campaignId: campaignId,
      name: name,
      status: status || 'PAUSED',
      objective: objective,
      metaObjective: metaSynced ? metaObjective : null,
      metaDailyBudget: metaSynced ? metaDailyBudgetInCents : 0,
      dailyBudget: parseFloat(dailyBudget),
      lifetimeBudget: lifetimeBudget ? parseFloat(lifetimeBudget) : 0,
      currency: user.currency || 'USD',
      audience: audience || {},
      creatives: creatives || {},
      settings: settings || {},
      metrics: {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        ctr: 0
      },
      createdAt: new Date(),
      lastSynced: new Date()
    };

    console.log('📦 Creating local campaign with data:', {
      campaignId: campaignData.campaignId,
      name: campaignData.name,
      status: campaignData.status,
      objective: campaignData.objective,
      metaObjective: campaignData.metaObjective,
      dailyBudget: campaignData.dailyBudget,
      currency: campaignData.currency
    });

    const campaign = new Campaign(campaignData);
    await campaign.save();

    console.log('✅ Campaign created successfully in database:', campaign._id);

    // Add formatted currency for frontend
    const campaignWithFormattedCurrency = {
      ...campaign.toObject(),
      dailyBudgetFormatted: formatCurrency(campaign.dailyBudget, campaign.currency),
      lifetimeBudgetFormatted: formatCurrency(campaign.lifetimeBudget, campaign.currency),
      metrics: {
        ...campaign.metrics,
        spendFormatted: formatCurrency(campaign.metrics.spend, campaign.currency)
      }
    };

    // Prepare response message
    let responseMessage = '';
    if (metaSynced) {
      responseMessage = `✅ Campaign "${name}" created successfully in Meta Business and local database! Meta Campaign ID: ${metaCampaignId} | Objective: ${metaObjective} | Status: ${metaStatus}`;
    } else if (metaErrorMessage) {
      responseMessage = `⚠️ Campaign "${name}" created locally only. ${metaErrorMessage}`;
    } else {
      responseMessage = `⚠️ Campaign "${name}" created locally only. Connect Meta account to sync.`;
    }

    res.status(201).json({
      success: true,
      message: responseMessage,
      campaign: campaignWithFormattedCurrency,
      metaSynced: metaSynced,
      metaCampaignId: metaCampaignId,
      metaObjective: metaSynced ? metaObjective : null,
      metaError: metaErrorMessage || null,
      metaSuccess: metaSuccessMessage || null,
      credentialsPresent: {
        token: !!user.metaAccessToken,
        tokenLength: user.metaAccessToken?.length || 0,
        adAccount: !!user.metaAdAccountId,
        adAccountId: user.metaAdAccountId
      }
    });

  } catch (error) {
    console.error('🔥 Create campaign error:', error);
    console.error('🔥 Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create campaign',
      details: error.stack
    });
  }
};

// ==================== DELETE CAMPAIGN (WITH META SYNC) ====================
exports.deleteCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const user = req.user;

    console.log('🗑️ Deleting campaign:', campaignId);

    const campaign = await Campaign.findOne({
      _id: campaignId,
      clientId: user._id
    });

    if (!campaign) {
      console.log(`❌ Campaign ${campaignId} not found for user ${user._id}`);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    let metaDeleted = false;

    if (user.metaAccessToken && !campaign.campaignId.startsWith('local_')) {
      try {
        console.log('🔄 Deleting campaign from Meta Business:', campaign.campaignId);
        
        await axios.delete(
          `https://graph.facebook.com/v18.0/${campaign.campaignId}`,
          {
            params: {
              access_token: user.metaAccessToken
            }
          }
        );
        
        console.log('✅ Campaign deleted from Meta Business:', campaign.campaignId);
        metaDeleted = true;
      } catch (metaError) {
        console.error('⚠️ Meta API delete failed:', metaError.response?.data || metaError.message);
        metaDeleted = false;
      }
    }

    await Campaign.deleteOne({ _id: campaignId, clientId: user._id });

    console.log('✅ Campaign deleted locally:', campaignId);

    res.json({
      success: true,
      message: metaDeleted ? 
        'Campaign deleted locally and from Meta Business' : 
        'Campaign deleted locally (Meta sync not available or local campaign)',
      campaignId: campaignId,
      metaDeleted: metaDeleted,
      campaignName: campaign.name
    });

  } catch (error) {
    console.error('🔥 Delete campaign error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete campaign'
    });
  }
};