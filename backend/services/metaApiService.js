// metaApiService.js - Enhanced with better insights and currency handling
const axios = require('axios');

class MetaApiService {
  constructor(accessToken, adAccountId) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.baseURL = 'https://graph.facebook.com/v18.0';
  }

  async getCampaigns() {
    try {
      console.log('🔍 Fetching campaigns from Meta API...');
      
      let adAccountId = this.adAccountId;
      if (!adAccountId.startsWith('act_')) {
        adAccountId = `act_${adAccountId}`;
      }
      
      const response = await axios.get(
        `${this.baseURL}/${adAccountId}/campaigns`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,end_time,created_time,updated_time',
            limit: 100
          },
          timeout: 30000
        }
      );
      
      console.log(`✅ Found ${response.data.data?.length || 0} campaigns`);
      
      let accountCurrency = 'USD';
      try {
        const accountResponse = await axios.get(
          `${this.baseURL}/${adAccountId}`,
          {
            params: {
              access_token: this.accessToken,
              fields: 'currency'
            }
          }
        );
        accountCurrency = accountResponse.data.currency || 'USD';
      } catch (error) {
        console.log('Could not fetch account currency');
      }
      
      const campaigns = response.data.data || [];
      campaigns.forEach(campaign => {
        campaign.currency = accountCurrency;
      });
      
      return campaigns;
      
    } catch (error) {
      console.error('❌ Meta API Error:', error.response?.data?.error || error.message);
      throw new Error(`Meta API Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async getCampaignInsights(campaignId, period = 'last_30d') {
    try {
      console.log(`📊 Fetching insights for campaign ${campaignId}...`);
      
      const response = await axios.get(
        `${this.baseURL}/${campaignId}/insights`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'impressions,clicks,ctr,spend,conversions,cpc,cpm,frequency,reach',
            date_preset: period,
            time_increment: 1
          },
          timeout: 30000
        }
      );
      
      const insights = response.data.data[0] || {};
      
      if (insights.impressions && insights.clicks) {
        insights.ctr = (insights.clicks / insights.impressions * 100).toFixed(2);
      }
      
      if (insights.clicks && insights.spend) {
        insights.cpc = (insights.spend / insights.clicks).toFixed(2);
      }
      
      return insights;
      
    } catch (error) {
      console.error(`❌ Insights error for ${campaignId}:`, error.response?.data?.error?.message || error.message);
      return {};
    }
  }

  async getCampaignInsightsByDate(campaignId, startDate, endDate) {
    try {
      const response = await axios.get(
        `${this.baseURL}/${campaignId}/insights`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'impressions,clicks,spend,conversions',
            time_range: JSON.stringify({
              since: startDate,
              until: endDate
            })
          }
        }
      );
      
      return response.data.data[0] || {};
      
    } catch (error) {
      console.error(`Date range insights error:`, error.message);
      return {};
    }
  }

  async validateCredentials() {
    try {
      let adAccountId = this.adAccountId;
      if (!adAccountId.startsWith('act_')) {
        adAccountId = `act_${adAccountId}`;
      }
      
      const response = await axios.get(
        `${this.baseURL}/me`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name'
          }
        }
      );
      
      const accountResponse = await axios.get(
        `${this.baseURL}/${adAccountId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,account_status,currency'
          }
        }
      );
      
      return {
        valid: true,
        user: response.data,
        adAccount: accountResponse.data,
        permissions: await this.checkPermissions()
      };
      
    } catch (error) {
      return {
        valid: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async checkPermissions() {
    try {
      const response = await axios.get(
        `${this.baseURL}/me/permissions`,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );
      
      return response.data.data || [];
      
    } catch (error) {
      return [];
    }
  }

  async updateCampaignStatus(campaignId, status) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${campaignId}`,
        null,
        {
          params: {
            access_token: this.accessToken,
            status: status.toUpperCase()
          }
        }
      );
      
      console.log(`✅ Campaign ${campaignId} status updated to ${status}`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Update campaign error:`, error.response?.data || error.message);
      throw error;
    }
  }

  async updateCampaign(campaignId, updateData) {
    try {
      console.log(`🔄 Updating campaign ${campaignId} on Meta...`);
      
      const response = await axios.post(
        `${this.baseURL}/${campaignId}`,
        null,
        {
          params: {
            access_token: this.accessToken,
            ...updateData
          }
        }
      );
      
      console.log(`✅ Campaign ${campaignId} updated on Meta`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Update campaign error:`, error.response?.data || error.message);
      throw error;
    }
  }

  // ==================== CREATE CAMPAIGN IN META - ULTIMATE FIXED VERSION ====================
  async createCampaign(campaignData) {
    try {
      console.log('🔄 Creating campaign in Meta...');
      console.log('📦 Campaign data received:', {
        name: campaignData.name,
        objective: campaignData.objective,
        dailyBudget: campaignData.dailyBudget,
        status: campaignData.status
      });
      
      // Ensure adAccountId has 'act_' prefix
      let adAccountId = this.adAccountId;
      if (!adAccountId.startsWith('act_')) {
        adAccountId = `act_${adAccountId}`;
      }
      
      // Validate required fields
      if (!campaignData.name) {
        throw new Error('Campaign name is required');
      }
      
      if (!campaignData.objective) {
        throw new Error('Campaign objective is required');
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

      let objective = campaignData.objective.toUpperCase();
      
      // Map old objective to new one
      if (objectiveMapping[objective]) {
        objective = objectiveMapping[objective];
        console.log(`🔄 Mapped objective from ${campaignData.objective} to ${objective}`);
      }

      // Validate objective
      if (!validObjectives.includes(objective)) {
        console.log(`⚠️ Invalid objective: ${objective}, defaulting to OUTCOME_TRAFFIC`);
        objective = 'OUTCOME_TRAFFIC';
      }

      console.log(`📋 Meta Objective: ${objective}`);
      
      // Status must be UPPERCASE for Meta API
      let status = 'PAUSED';
      if (campaignData.status) {
        status = campaignData.status.toUpperCase();
      }
      
      if (status !== 'ACTIVE' && status !== 'PAUSED') {
        console.log(`⚠️ Invalid status: ${status}, defaulting to PAUSED`);
        status = 'PAUSED';
      }
      
      console.log(`📋 Meta Status: ${status}`);
      
      // CRITICAL FIX: special_ad_categories MUST be a JSON stringified array
      const specialAdCategories = JSON.stringify([]);
      console.log(`📋 Meta Special Ad Categories: ${specialAdCategories}`);
      
      // CRITICAL FIX: buying_type must be exactly 'AUCTION'
      const buyingType = 'AUCTION';
      console.log(`📋 Meta Buying Type: ${buyingType}`);
      
      // Get account currency first
      let accountCurrency = 'USD';
      try {
        const accountResponse = await axios.get(
          `${this.baseURL}/${adAccountId}`,
          {
            params: {
              access_token: this.accessToken,
              fields: 'currency'
            }
          }
        );
        accountCurrency = accountResponse.data.currency || 'USD';
        console.log(`💰 Meta Account Currency: ${accountCurrency}`);
      } catch (error) {
        console.log('Could not fetch account currency, using USD');
        accountCurrency = 'USD';
      }
      
      // Calculate budget in minor units
      let dailyBudgetInMinorUnits = 100; // Minimum $1.00 = 100 cents
      
      if (campaignData.dailyBudget) {
        const budget = parseFloat(campaignData.dailyBudget);
        if (budget >= 1) {
          dailyBudgetInMinorUnits = Math.round(budget * 100);
        }
      }
      
      console.log(`💰 Daily budget: ${dailyBudgetInMinorUnits} minor units (${dailyBudgetInMinorUnits/100} ${accountCurrency})`);
      
      // Prepare request parameters
      const params = {
        access_token: this.accessToken,
        name: campaignData.name,
        objective: objective,
        status: status,
        special_ad_categories: specialAdCategories,
        buying_type: buyingType,
        daily_budget: dailyBudgetInMinorUnits
      };
      
      // Add lifetime budget if provided
      if (campaignData.lifetimeBudget && campaignData.lifetimeBudget > 0) {
        const lifetimeBudget = parseFloat(campaignData.lifetimeBudget);
        params.lifetime_budget = Math.round(lifetimeBudget * 100);
      }
      
      console.log('📤 Sending request to Meta API:');
      console.log(`   URL: ${this.baseURL}/${adAccountId}/campaigns`);
      console.log('   Params:', JSON.stringify(params, null, 2));
      
      // Make the API call
      const response = await axios({
        method: 'post',
        url: `${this.baseURL}/${adAccountId}/campaigns`,
        params: params,
        timeout: 30000
      });
      
      console.log('✅ Campaign created successfully in Meta:');
      console.log(`   Campaign ID: ${response.data.id}`);
      console.log(`   Campaign Name: ${campaignData.name}`);
      console.log(`   Campaign Objective: ${objective}`);
      console.log(`   Campaign Status: ${status}`);
      console.log(`   Campaign Buying Type: ${buyingType}`);
      console.log(`   Special Ad Categories: ${specialAdCategories}`);
      
      return {
        id: response.data.id,
        success: true,
        currency: accountCurrency,
        objective: objective,
        status: status
      };
      
    } catch (error) {
      console.error('❌ Create campaign error in MetaApiService:');
      
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        
        const fbError = error.response.data?.error;
        if (fbError) {
          console.error('Facebook Error Code:', fbError.code);
          console.error('Facebook Error Type:', fbError.type);
          console.error('Facebook Error Message:', fbError.message);
          console.error('Facebook Error Subcode:', fbError.error_subcode);
          
          if (fbError.code === 100) {
            if (fbError.message.includes('daily_budget')) {
              throw new Error('Invalid daily budget. Minimum budget is $1.00 USD (100 cents).');
            } else if (fbError.message.includes('objective')) {
              throw new Error('Invalid campaign objective. Must be one of: OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_ENGAGEMENT, OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_APP_PROMOTION');
            } else if (fbError.message.includes('name')) {
              throw new Error('Invalid campaign name. Name must be between 1 and 255 characters.');
            } else if (fbError.message.includes('status')) {
              throw new Error('Invalid campaign status. Status must be ACTIVE or PAUSED.');
            } else if (fbError.message.includes('special_ad_categories')) {
              throw new Error('Missing special_ad_categories. This field is required and must be a JSON string.');
            } else if (fbError.message.includes('buying_type')) {
              throw new Error('Invalid buying_type. Must be AUCTION.');
            } else {
              throw new Error(`Invalid parameter: ${fbError.message}`);
            }
          } else if (fbError.code === 200) {
            throw new Error('Permission error. Your access token needs ads_management permission.');
          } else if (fbError.code === 190) {
            throw new Error('Invalid or expired access token. Please reconnect your Meta account.');
          } else if (fbError.code === 368) {
            throw new Error('Temporary issue with Meta API. Please try again in a few minutes.');
          } else if (fbError.code === 2) {
            throw new Error('Meta API temporary issue. Please try again.');
          } else if (fbError.code === 10) {
            throw new Error('Permission denied. Your app may not be approved for this action.');
          } else {
            throw new Error(`Meta API Error (${fbError.code}): ${fbError.message}`);
          }
        }
      } else if (error.request) {
        console.error('No response received from Meta API');
        throw new Error('No response from Meta API. Please check your internet connection.');
      }
      
      throw error;
    }
  }

  async deleteCampaign(campaignId) {
    try {
      console.log(`🗑️ Deleting campaign ${campaignId} from Meta...`);
      
      const response = await axios.delete(
        `${this.baseURL}/${campaignId}`,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );
      
      console.log(`✅ Campaign ${campaignId} deleted from Meta`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Delete campaign error:`, error.response?.data || error.message);
      throw error;
    }
  }

  async testConnection() {
    try {
      const response = await axios.get(
        `${this.baseURL}/me`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,permissions'
          }
        }
      );
      
      let adAccountId = this.adAccountId;
      if (!adAccountId.startsWith('act_')) {
        adAccountId = `act_${adAccountId}`;
      }
      
      const adAccountResponse = await axios.get(
        `${this.baseURL}/${adAccountId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,account_status,currency'
          }
        }
      );
      
      return {
        success: true,
        user: response.data,
        adAccount: adAccountResponse.data,
        currency: adAccountResponse.data.currency || 'USD',
        permissions: response.data.permissions?.data || []
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async getAccountCurrency() {
    try {
      let adAccountId = this.adAccountId;
      if (!adAccountId.startsWith('act_')) {
        adAccountId = `act_${adAccountId}`;
      }
      
      const response = await axios.get(
        `${this.baseURL}/${adAccountId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'currency'
          }
        }
      );
      
      return response.data.currency || 'USD';
      
    } catch (error) {
      console.error('❌ Get account currency error:', error.message);
      return 'USD';
    }
  }
}

module.exports = MetaApiService;