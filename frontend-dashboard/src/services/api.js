const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api = {
  // Auth APIs
  auth: {
    login: (email, password) => 
      fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(res => res.json()),

    register: (userData) =>
      fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      }).then(res => res.json()),

    getMe: () => {
      const token = localStorage.getItem('token');
      return fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).then(res => res.json());
    },

    updateMetaCredentials: (data) => {
      const token = localStorage.getItem('token');
      return fetch(`${API_URL}/auth/meta-credentials`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }).then(res => res.json());
    },
  },

  // Campaign APIs (UPDATED WITH FIXED CREATE AND DELETE)
  campaigns: {
    // CREATE CAMPAIGN - FIXED VERSION
    createCampaign: (data) => {
      const token = localStorage.getItem('token');
      console.log('📤 Creating campaign with data:', data);
      
      return fetch(`${API_URL}/ads/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }).then(async (res) => {
        const responseData = await res.json();
        console.log('📥 Create campaign response:', responseData);
        
        if (!res.ok) {
          // Detailed error handling
          let errorMessage = responseData.error || 'Failed to create campaign';
          if (responseData.details) {
            console.error('Error details:', responseData.details);
          }
          if (responseData.metaError) {
            console.error('Meta API Error:', responseData.metaError);
            errorMessage = responseData.metaError;
          }
          throw new Error(errorMessage);
        }
        return responseData;
      });
    },

    // DELETE CAMPAIGN
    deleteCampaign: (campaignId) => {
      const token = localStorage.getItem('token');
      return fetch(`${API_URL}/ads/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete campaign');
        }
        return data;
      });
    },

    syncCampaigns: () => {
      const token = localStorage.getItem('token');
      return fetch(`${API_URL}/ads/campaigns/sync`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Sync failed');
        }
        return data;
      });
    },

    getCampaigns: (params = {}) => {
      const token = localStorage.getItem('token');
      const queryString = new URLSearchParams(params).toString();
      return fetch(`${API_URL}/ads/campaigns?${queryString}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch campaigns');
        }
        return data;
      });
    },

    getCampaignsWithAnalytics: (params = {}) => {
      const token = localStorage.getItem('token');
      const queryString = new URLSearchParams(params).toString();
      return fetch(`${API_URL}/ads/campaigns/analytics?${queryString}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch analytics');
        }
        return data;
      });
    },

    getCampaignAnalytics: (campaignId, params = {}) => {
      const token = localStorage.getItem('token');
      const queryString = new URLSearchParams(params).toString();
      return fetch(`${API_URL}/ads/campaigns/${campaignId}/analytics?${queryString}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch campaign analytics');
        }
        return data;
      });
    },

    updateCampaignStatus: (campaignId, status) => {
      const token = localStorage.getItem('token');
      return fetch(`${API_URL}/ads/campaigns/${campaignId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update status');
        }
        return data;
      });
    },

    updateCampaign: (campaignId, data) => {
      const token = localStorage.getItem('token');
      return fetch(`${API_URL}/ads/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }).then(async (res) => {
        const response = await res.json();
        if (!res.ok) {
          throw new Error(response.error || 'Failed to update campaign');
        }
        return response;
      });
    },

    updateMetaCredentialsAndSync: (data) => {
      const token = localStorage.getItem('token');
      return fetch(`${API_URL}/ads/meta/update-and-sync`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update credentials');
        }
        return data;
      });
    },

    // DEBUG ENDPOINT - Direct fetch
    getMyCampaignsDirect: () => {
      const token = localStorage.getItem('token');
      return fetch(`${API_URL}/ads/campaigns/direct`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch campaigns directly');
        }
        return data;
      });
    },
  },

  // Admin APIs
  admin: {
    getClients: () => {
      const token = localStorage.getItem('token');
      return fetch(`${API_URL}/clients/admin/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch clients');
        }
        return data;
      });
    },

    getAllCampaigns: (params = {}) => {
      const token = localStorage.getItem('token');
      const queryString = new URLSearchParams(params).toString();
      return fetch(`${API_URL}/clients/admin/campaigns?${queryString}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch all campaigns');
        }
        return data;
      });
    },
  },

  // Meta API validation (direct calls to Meta)
  meta: {
    validateToken: (accessToken) =>
      fetch(`https://graph.facebook.com/v18.0/me?access_token=${accessToken}`)
        .then(async (res) => {
          const data = await res.json();
          if (data.error) {
            throw new Error(data.error.message);
          }
          return {
            valid: true,
            data,
            error: null
          };
        })
        .catch(error => ({
          valid: false,
          error: error.message
        })),

    validateAdAccount: (accessToken, adAccountId) => {
      // Ensure proper format for validation
      let accountId = adAccountId;
      if (!accountId.startsWith('act_')) {
        accountId = `act_${accountId}`;
      }
      
      return fetch(`https://graph.facebook.com/v18.0/${accountId}?access_token=${accessToken}&fields=id,name,account_status,currency`)
        .then(async (res) => {
          const data = await res.json();
          if (data.error) {
            throw new Error(data.error.message);
          }
          return {
            valid: true,
            data,
            error: null
          };
        })
        .catch(error => ({
          valid: false,
          error: error.message
        }));
    },

    getAdAccounts: (accessToken) =>
      fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${accessToken}&fields=id,name,account_id,account_status,currency`)
        .then(async (res) => {
          const data = await res.json();
          if (data.error) {
            throw new Error(data.error.message);
          }
          return data.data || [];
        })
        .catch(() => []),
  },
};

export default api;