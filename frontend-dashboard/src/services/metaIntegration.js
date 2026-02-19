// Meta API Integration Helper
export const META_API_CONFIG = {
  // These scopes are needed for ad management
  requiredScopes: [
    'ads_management',
    'ads_read',
    'business_management'
  ].join(','),
  
  // Base URL for Meta Graph API
  graphApiVersion: 'v18.0',
  
  getAuthUrl: (appId, redirectUri) => {
    const scopes = encodeURIComponent(META_API_CONFIG.requiredScopes);
    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=token`;
  },
  
  // Campaign status mapping
  statusMapping: {
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    STOPPED: 'DELETED'
  },
  
  // Campaign objectives
  objectives: [
    'APP_INSTALLS',
    'BRAND_AWARENESS',
    'CONVERSIONS',
    'EVENT_RESPONSES',
    'LEAD_GENERATION',
    'LINK_CLICKS',
    'LOCAL_AWARENESS',
    'MESSAGES',
    'OFFER_CLAIMS',
    'PAGE_LIKES',
    'POST_ENGAGEMENT',
    'PRODUCT_CATALOG_SALES',
    'REACH',
    'STORE_VISITS',
    'VIDEO_VIEWS'
  ],
  
  // Billing events
  billingEvents: [
    'IMPRESSIONS',
    'LINK_CLICKS',
    'OFFER_CLAIMS',
    'PAGE_LIKES',
    'POST_ENGAGEMENT',
    'THRUPLAY'
  ],
  
  // Optimization goals
  optimizationGoals: [
    'AD_RECALL_LIFT',
    'APP_INSTALLS',
    'BRAND_AWARENESS',
    'CLICKS',
    'DERIVED_EVENTS',
    'ENGAGED_USERS',
    'EVENT_RESPONSES',
    'IMPRESSIONS',
    'LANDING_PAGE_VIEWS',
    'LEADS',
    'LINK_CLICKS',
    'NONE',
    'OFFSITE_CONVERSIONS',
    'PAGE_LIKES',
    'POST_ENGAGEMENT',
    'REACH',
    'REPLIES',
    'SOCIAL_IMPRESSIONS',
    'THRUPLAY',
    'VALUE',
    'VISIT_INSTAGRAM_PROFILE'
  ]
};

// Function to validate Meta Access Token
export const validateMetaToken = async (accessToken) => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_API_CONFIG.graphApiVersion}/me?access_token=${accessToken}`
    );
    const data = await response.json();
    return !data.error;
  } catch (error) {
    console.error('Error validating Meta token:', error);
    return false;
  }
};

// Function to get ad accounts for a user
export const getAdAccounts = async (accessToken) => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_API_CONFIG.graphApiVersion}/me/adaccounts?access_token=${accessToken}&fields=id,name,account_id,account_status,currency`
    );
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching ad accounts:', error);
    return [];
  }
};