import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Button,
  Chip,
  Alert,
  useMediaQuery,
  useTheme,
  alpha,
  IconButton,
  Avatar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Tooltip,
  Skeleton
} from '@mui/material';
import {
  TrendingUp,
  Visibility,
  Mouse,
  MonetizationOn,
  Sync,
  Add,
  ArrowUpward,
  ArrowDownward,
  TrendingFlat,
  FilterList,
  CalendarToday,
  Refresh,
  Warning,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CampaignChart from '../components/CampaignChart';
import { formatCurrency, formatNumber } from '../utils/format';

const StatCard = ({ title, value, icon, color, subtitle, trend, loading, onClick }) => {
  const theme = useTheme();
  
  return (
    <Card 
      onClick={onClick}
      sx={{ 
        height: '100%', 
        minHeight: 140,
        borderRadius: 3,
        bgcolor: 'white',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          transform: onClick ? 'translateY(-4px)' : 'none',
          boxShadow: onClick ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' : 'none',
        }
      }}
    >
      <CardContent sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 3
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="textSecondary" sx={{ 
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600,
              mb: 1
            }}>
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width="60%" height={40} />
            ) : (
              <Typography variant="h4" component="div" sx={{ 
                mb: 0.5,
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                fontWeight: 700,
                color: theme.palette.text.primary
              }}>
                {value}
              </Typography>
            )}
            {subtitle && !loading && (
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ 
            bgcolor: alpha(color, 0.1), 
            color: color,
            width: 48,
            height: 48
          }}>
            {icon}
          </Avatar>
        </Box>
        
        {trend && !loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <Chip
              icon={trend.direction === 'up' ? <ArrowUpward /> : 
                    trend.direction === 'down' ? <ArrowDownward /> : <TrendingFlat />}
              label={`${trend.value}%`}
              size="small"
              color={trend.direction === 'up' ? 'success' : 
                     trend.direction === 'down' ? 'error' : 'default'}
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
            <Typography variant="caption" color="textSecondary">
              vs. previous period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSpend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cpc: 0
  });
  
  const [analytics, setAnalytics] = useState({
    period: 'last7d',
    trends: [],
    dailyAverage: {}
  });
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Period options
  const periodOptions = [
    { value: 'last7d', label: 'Last 7 days' },
    { value: 'last30d', label: 'Last 30 days' },
    { value: 'this_month', label: 'This Month' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' }
  ];

  // Fetch dashboard data with analytics
  const fetchDashboardData = async (period = 'last7d') => {
    try {
      setLoading(true);
      setDebugInfo('Fetching data...');
      
      console.log('🔄 Fetching dashboard data for period:', period);
      
      // Try different endpoints until we get data
      let response = null;
      let endpointUsed = '';
      
      // Try 1: Direct endpoint (for debugging)
      try {
        endpointUsed = 'Direct endpoint';
        response = await api.campaigns.getMyCampaignsDirect();
        console.log('✅ Got data from direct endpoint:', response);
      } catch (error1) {
        console.log('⚠️ Direct endpoint failed, trying analytics...');
        
        // Try 2: Analytics endpoint
        try {
          endpointUsed = 'Analytics endpoint';
          response = await api.campaigns.getCampaignsWithAnalytics({ period });
          console.log('✅ Got data from analytics endpoint:', response);
        } catch (error2) {
          console.log('⚠️ Analytics endpoint failed, trying regular...');
          
          // Try 3: Regular campaigns endpoint
          try {
            endpointUsed = 'Regular endpoint';
            response = await api.campaigns.getCampaigns({ limit: 100 });
            console.log('✅ Got data from regular endpoint:', response);
          } catch (error3) {
            console.log('⚠️ All endpoints failed');
            throw new Error('All API endpoints failed');
          }
        }
      }
      
      if (response && response.success) {
        const campaigns = response.campaigns || [];
        
        console.log('📊 Campaigns found:', campaigns.length);
        setDebugInfo(`Found ${campaigns.length} campaigns via ${endpointUsed}`);
        
        // Calculate stats
        const totalSpend = campaigns.reduce((sum, campaign) => sum + (campaign.metrics?.spend || 0), 0);
        const impressions = campaigns.reduce((sum, campaign) => sum + (campaign.metrics?.impressions || 0), 0);
        const clicks = campaigns.reduce((sum, campaign) => sum + (campaign.metrics?.clicks || 0), 0);
        const conversions = campaigns.reduce((sum, campaign) => sum + (campaign.metrics?.conversions || 0), 0);
        const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
        
        const ctr = impressions ? (clicks / impressions * 100) : 0;
        const cpc = clicks ? (totalSpend / clicks) : 0;
        
        setStats({
          totalCampaigns: campaigns.length,
          activeCampaigns,
          totalSpend,
          impressions,
          clicks,
          conversions,
          ctr,
          cpc
        });
        
        setAnalytics({
          period,
          trends: response.trends || [],
          dailyAverage: {
            impressions: impressions / 7,
            clicks: clicks / 7,
            spend: totalSpend / 7,
            conversions: conversions / 7
          }
        });
        
        setLastSync(new Date());
        setSyncError(null);
      } else {
        console.error('❌ API response not successful:', response);
        setDebugInfo(`API failed: ${response?.error || 'Unknown error'}`);
        setSyncError(response?.error || 'Failed to fetch data');
      }
      
    } catch (error) {
      console.error('🔥 Error fetching dashboard data:', error);
      setDebugInfo(`Error: ${error.message}`);
      setSyncError(error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // Handle sync
  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    setDebugInfo('Syncing...');
    
    try {
      const response = await api.campaigns.syncCampaigns();
      
      if (response.success) {
        // Refresh data after sync
        await fetchDashboardData(analytics.period);
        setDebugInfo(`Synced ${response.total || 0} campaigns`);
      } else {
        setSyncError(response.error || 'Sync failed');
        setDebugInfo(`Sync failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncError(error.message || 'Failed to sync campaigns');
      setDebugInfo(`Sync error: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchDashboardData();
    
    const interval = setInterval(() => {
      if (user?.metaAdAccountId) {
        fetchDashboardData(analytics.period);
      }
    }, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [user?.metaAdAccountId]);

  // Handle period change
  const handlePeriodChange = (event, newPeriod) => {
    if (newPeriod !== null) {
      fetchDashboardData(newPeriod);
    }
  };

  // Handle create campaign
  const handleCreateCampaign = () => {
    window.location.href = '/campaigns?create=true';
  };

  if (loading && !stats.totalCampaigns) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const statCards = [
    {
      title: "Active Campaigns",
      value: stats.activeCampaigns,
      subtitle: `${stats.totalCampaigns} total`,
      icon: <TrendingUp />,
      color: theme.palette.primary.main,
      trend: { direction: 'up', value: '12.5' }
    },
    {
      title: "Total Spend",
      value: formatCurrency(stats.totalSpend),
      icon: <MonetizationOn />,
      color: theme.palette.success.main,
      trend: { direction: 'up', value: '8.2' }
    },
    {
      title: "Impressions",
      value: formatNumber(stats.impressions),
      icon: <Visibility />,
      color: theme.palette.warning.main,
      trend: { direction: 'up', value: '5.7' }
    },
    {
      title: "CTR",
      value: `${stats.ctr.toFixed(2)}%`,
      subtitle: `CPC: ${formatCurrency(stats.cpc)}`,
      icon: <Mouse />,
      color: theme.palette.info.main,
      trend: { direction: stats.ctr > 2 ? 'up' : 'down', value: '2.3' }
    }
  ];

  return (
    <Layout>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3,
          gap: 2
        }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ 
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 0.5
            }}>
              Campaign Dashboard
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ 
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}>
              {lastSync ? `Last updated: ${lastSync.toLocaleTimeString()}` : 'Loading...'}
              {debugInfo && (
                <Typography variant="caption" display="block" color="info.main">
                  {debugInfo}
                </Typography>
              )}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <ToggleButtonGroup
              value={analytics.period}
              exclusive
              onChange={handlePeriodChange}
              size="small"
              sx={{ flexWrap: 'wrap' }}
            >
              {periodOptions.map((option) => (
                <ToggleButton 
                  key={option.value} 
                  value={option.value}
                  sx={{ 
                    px: 2,
                    py: 0.5,
                    fontSize: '0.75rem',
                    '&.Mui-selected': {
                      bgcolor: theme.palette.primary.main,
                      color: 'white',
                      '&:hover': {
                        bgcolor: theme.palette.primary.dark
                      }
                    }
                  }}
                >
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            
            <Tooltip title="Sync with Meta Ads">
              <Button
                variant="contained"
                startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <Sync />}
                onClick={handleSync}
                disabled={syncing || !user?.metaAdAccountId}
                sx={{
                  minWidth: 'auto',
                  px: 2
                }}
              >
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
            </Tooltip>
          </Box>
        </Box>
        
        {/* Alerts */}
        {!user?.metaAdAccountId && (
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              '& .MuiAlert-icon': { alignItems: 'center' }
            }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                href="/settings"
                sx={{ fontWeight: 600 }}
              >
                Connect Now
              </Button>
            }
          >
            <Typography variant="subtitle2" fontWeight="600">
              Connect your Meta Ads account
            </Typography>
            <Typography variant="body2">
              Add your Access Token and Ad Account ID in Settings to sync campaigns
            </Typography>
          </Alert>
        )}
        
        {syncError && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: 2 
            }}
            onClose={() => setSyncError(null)}
          >
            {syncError}
          </Alert>
        )}
        
        {user?.metaAdAccountId && stats.totalCampaigns === 0 && (
          <Alert 
            severity="info" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              '& .MuiAlert-icon': { alignItems: 'center' }
            }}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={handleSync}
                  startIcon={<Sync />}
                  sx={{ fontWeight: 600 }}
                >
                  Sync Now
                </Button>
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={handleCreateCampaign}
                  startIcon={<Add />}
                  sx={{ fontWeight: 600 }}
                >
                  Create
                </Button>
              </Box>
            }
          >
            <Typography variant="subtitle2" fontWeight="600">
              No campaigns found
            </Typography>
            <Typography variant="body2">
              Sync campaigns from Meta or create a new one to get started
            </Typography>
          </Alert>
        )}
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.title}>
            <StatCard {...stat} loading={loading} />
          </Grid>
        ))}
      </Grid>
      
      {/* Charts & Analytics */}
      <Grid container spacing={3}>
        {/* Performance Chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ 
            p: { xs: 2, sm: 3 },
            height: '100%',
            minHeight: 400,
            borderRadius: 3,
            bgcolor: 'white',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', sm: 'center' },
              mb: 3,
              gap: 2
            }}>
              <Typography variant="h6" sx={{ 
                fontSize: { xs: '1rem', sm: '1.25rem' },
                fontWeight: 600,
                color: theme.palette.text.primary
              }}>
                Performance Trends - {periodOptions.find(p => p.value === analytics.period)?.label}
              </Typography>
              
              <Chip
                icon={<CalendarToday />}
                label={`${analytics.period.replace('_', ' ')}`}
                size="small"
                variant="outlined"
                sx={{ textTransform: 'capitalize' }}
              />
            </Box>
            
            {stats.totalCampaigns > 0 ? (
              <Box sx={{ height: 300 }}>
                <CampaignChart 
                  data={analytics.trends.length > 0 ? analytics.trends.map(t => ({
                    label: t._id,
                    impressions: t.impressions,
                    clicks: t.clicks,
                    spend: t.spend,
                    conversions: t.conversions
                  })) : [
                    { label: 'Mon', value: stats.impressions / 7 },
                    { label: 'Tue', value: stats.impressions / 7 },
                    { label: 'Wed', value: stats.impressions / 7 },
                    { label: 'Thu', value: stats.impressions / 7 },
                    { label: 'Fri', value: stats.impressions / 7 },
                    { label: 'Sat', value: stats.impressions / 7 },
                    { label: 'Sun', value: stats.impressions / 7 }
                  ]}
                />
              </Box>
            ) : (
              <Box sx={{ 
                height: 300, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: theme.palette.text.secondary
              }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  No campaigns data
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {user?.metaAdAccountId 
                    ? 'Sync campaigns or create a new one to see performance data' 
                    : 'Connect your Meta Ads account to get started'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {user?.metaAdAccountId && (
                    <>
                      <Button
                        variant="contained"
                        startIcon={<Sync />}
                        onClick={handleSync}
                        disabled={syncing}
                      >
                        {syncing ? 'Syncing...' : 'Sync Campaigns'}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={handleCreateCampaign}
                      >
                        Create Campaign
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            )}
            
            {stats.totalCampaigns > 0 && (
              <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Daily Average
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    {formatNumber(analytics.dailyAverage.impressions)} impressions
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Daily Spend
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    {formatCurrency(analytics.dailyAverage.spend)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Daily Clicks
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    {formatNumber(analytics.dailyAverage.clicks)}
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Quick Actions & Status */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Connection Status */}
            <Paper sx={{ 
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
              bgcolor: 'white',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <Typography variant="h6" sx={{ 
                fontSize: { xs: '1rem', sm: '1.25rem' },
                fontWeight: 600,
                color: theme.palette.text.primary,
                mb: 3
              }}>
                Account Status
              </Typography>
              
              <Stack spacing={2}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(
                    user?.metaAdAccountId ? theme.palette.success.main : theme.palette.warning.main, 
                    0.1
                  )
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {user?.metaAdAccountId ? (
                      <CheckCircle sx={{ color: theme.palette.success.main }} />
                    ) : (
                      <Warning sx={{ color: theme.palette.warning.main }} />
                    )}
                    <Box>
                      <Typography variant="body2" fontWeight="600">
                        Meta Ads Account
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {user?.metaAdAccountId ? 'Connected' : 'Not Connected'}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={user?.metaAdAccountId ? 'Active' : 'Setup Required'}
                    color={user?.metaAdAccountId ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
                
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.info.main, 0.1)
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Refresh sx={{ color: theme.palette.info.main }} />
                    <Box>
                      <Typography variant="body2" fontWeight="600">
                        Auto Refresh
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Every 5 minutes
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label="Enabled"
                    color="info"
                    size="small"
                  />
                </Box>
                
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1)
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Sync sx={{ color: theme.palette.primary.main }} />
                    <Box>
                      <Typography variant="body2" fontWeight="600">
                        Campaigns
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {stats.totalCampaigns} total, {stats.activeCampaigns} active
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    onClick={handleSync}
                    disabled={syncing}
                    startIcon={syncing ? <CircularProgress size={16} /> : <Sync />}
                    sx={{ minWidth: 'auto' }}
                  >
                    {syncing ? '' : 'Sync'}
                  </Button>
                </Box>
              </Stack>
            </Paper>
            
            {/* Quick Actions */}
            <Paper sx={{ 
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
              bgcolor: 'white',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <Typography variant="h6" sx={{ 
                fontSize: { xs: '1rem', sm: '1.25rem' },
                fontWeight: 600,
                color: theme.palette.text.primary,
                mb: 3
              }}>
                Quick Actions
              </Typography>
              
              <Stack spacing={2}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateCampaign}
                  sx={{
                    justifyContent: 'flex-start',
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  Create New Campaign
                </Button>
                
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Sync />}
                  onClick={handleSync}
                  disabled={syncing || !user?.metaAdAccountId}
                  sx={{
                    justifyContent: 'flex-start',
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  {syncing ? 'Syncing Campaigns...' : 'Sync Campaigns'}
                </Button>
                
                <Button
                  fullWidth
                  variant="outlined"
                  component="a"
                  href="/campaigns"
                  sx={{
                    justifyContent: 'flex-start',
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  View All Campaigns
                </Button>
                
                {!user?.metaAdAccountId && (
                  <Button
                    fullWidth
                    variant="contained"
                    color="warning"
                    component="a"
                    href="/settings"
                    sx={{
                      justifyContent: 'flex-start',
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                  >
                    Connect Meta Account
                  </Button>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Layout>
  );
};

export default Dashboard;