import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  Menu,
  MenuItem,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Grid,
  LinearProgress,
  Alert,
  useMediaQuery,
  useTheme,
  alpha,
  Skeleton,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  FormHelperText
} from '@mui/material';
import {
  MoreVert,
  PlayArrow,
  Pause,
  Stop,
  Edit,
  Sync,
  FilterList,
  Search,
  Refresh,
  Warning,
  CheckCircle,
  Add,
  Delete
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CampaignEditModal from '../components/CampaignEditModal';
import { formatCurrency, formatDate } from '../utils/format';

const statusColors = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  STOPPED: 'error',
  DELETED: 'default'
};

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    status: 'ALL',
    search: ''
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState(null);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  // ==================== UPDATED NEW CAMPAIGN STATE WITH META'S NEW OBJECTIVES ====================
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    objective: 'OUTCOME_TRAFFIC', // Default to Traffic (Meta's new objective)
    dailyBudget: 10,
    status: 'PAUSED',
    audience: {
      ageMin: 18,
      ageMax: 65,
      genders: [1, 2]
    },
    creatives: {
      primaryText: 'Enter your ad copy here...',
      headline: 'Campaign Headline',
      description: 'Campaign Description',
      callToAction: 'LEARN_MORE'
    },
    settings: {
      billingEvent: 'IMPRESSIONS',
      optimizationGoal: 'REACH'
    }
  });
  
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError('');
    setDebugInfo('Fetching campaigns...');
    
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        status: filters.status !== 'ALL' ? filters.status : undefined
      };
      
      console.log('🔄 Fetching campaigns with params:', params);
      
      let response = null;
      let endpointUsed = '';
      
      try {
        endpointUsed = 'Direct endpoint';
        response = await api.campaigns.getMyCampaignsDirect();
      } catch (error1) {
        console.log('⚠️ Direct endpoint failed, trying regular...');
        
        try {
          endpointUsed = 'Regular endpoint';
          response = await api.campaigns.getCampaigns(params);
        } catch (error2) {
          console.log('⚠️ Regular endpoint failed, trying admin...');
          
          if (user?.role === 'admin') {
            try {
              endpointUsed = 'Admin endpoint';
              const adminResponse = await api.admin.getAllCampaigns(params);
              response = {
                success: true,
                campaigns: adminResponse.campaigns || [],
                total: adminResponse.total || 0,
                page: adminResponse.page || 1,
                pages: adminResponse.pages || 1
              };
            } catch (error3) {
              console.log('⚠️ All endpoints failed');
              throw new Error('All API endpoints failed');
            }
          } else {
            throw new Error('Failed to fetch campaigns');
          }
        }
      }
      
      console.log(`✅ Got response from ${endpointUsed}:`, response);
      
      if (response.success) {
        setCampaigns(response.campaigns || []);
        setTotal(response.total || response.campaigns?.length || 0);
        setDebugInfo(`Found ${response.campaigns?.length || 0} campaigns via ${endpointUsed}`);
      } else {
        setError(response.error || 'Failed to fetch campaigns');
        setDebugInfo(`API error: ${response.error}`);
        setCampaigns([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('🔥 Error fetching campaigns:', error);
      setError(error.message || 'Network error');
      setDebugInfo(`Error: ${error.message}`);
      setCampaigns([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters.status, user?.role]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    setDebugInfo('Syncing campaigns...');
    
    try {
      const response = await api.campaigns.syncCampaigns();
      
      if (response.success) {
        await fetchCampaigns();
        setDebugInfo(`Synced ${response.total || 0} campaigns`);
        showSnackbar(`Synced ${response.total || 0} campaigns from Meta Ads`, 'success');
      } else {
        setError(response.error || 'Sync failed');
        setDebugInfo(`Sync failed: ${response.error}`);
        showSnackbar(response.error || 'Sync failed', 'error');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setError(error.message || 'Failed to sync campaigns');
      setDebugInfo(`Sync error: ${error.message}`);
      showSnackbar(error.message || 'Failed to sync campaigns', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(0);
  };

  const handleMenuClick = (event, campaign) => {
    setAnchorEl(event.currentTarget);
    setSelectedCampaign(campaign);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCampaign(null);
  };

  const handleStatusChange = async (status) => {
    if (!selectedCampaign) return;
    
    try {
      const response = await api.campaigns.updateCampaignStatus(selectedCampaign._id, status);
      
      if (response.success) {
        await fetchCampaigns();
        showSnackbar(
          response.metaSynced 
            ? 'Campaign status updated locally and on Meta Ads' 
            : 'Campaign status updated locally',
          response.metaSynced ? 'success' : 'warning'
        );
      } else {
        setError(response.error);
        showSnackbar(response.error, 'error');
      }
    } catch (error) {
      console.error('Error updating campaign status:', error);
      setError(error.message);
      showSnackbar(error.message, 'error');
    } finally {
      handleMenuClose();
    }
  };

  const handleEdit = (campaign) => {
    setCampaignToEdit(campaign);
    setEditModalOpen(true);
    handleMenuClose();
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setCampaignToEdit(null);
  };

  const handleEditSave = async (updatedData) => {
    try {
      const response = await api.campaigns.updateCampaign(campaignToEdit._id, updatedData);
      
      if (response.success) {
        await fetchCampaigns();
        handleEditClose();
        
        if (response.metaSynced) {
          setDebugInfo('✅ Campaign updated locally and synced with Meta Ads');
          showSnackbar('Campaign updated and synced with Meta Ads!', 'success');
        } else {
          setDebugInfo('⚠️ Campaign updated locally (Meta sync not available)');
          showSnackbar(
            'Campaign updated locally. Meta sync failed. Check your Meta credentials.',
            'warning'
          );
        }
      } else {
        setError(response.error);
        showSnackbar(response.error, 'error');
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      setError(error.message);
      showSnackbar(error.message, 'error');
    }
  };

  // ==================== CREATE CAMPAIGN FUNCTIONS - FIXED VERSION ====================
  const handleCreateOpen = () => {
    setCreateModalOpen(true);
    setNewCampaign({
      name: `New Campaign ${new Date().toLocaleDateString()}`,
      objective: 'OUTCOME_TRAFFIC', // Default to Traffic (Meta's new objective)
      dailyBudget: 10,
      status: 'PAUSED',
      audience: {
        ageMin: 18,
        ageMax: 65,
        genders: [1, 2]
      },
      creatives: {
        primaryText: 'Enter your ad copy here...',
        headline: 'Campaign Headline',
        description: 'Campaign Description',
        callToAction: 'LEARN_MORE'
      },
      settings: {
        billingEvent: 'IMPRESSIONS',
        optimizationGoal: 'REACH'
      }
    });
  };

  const handleCreateClose = () => {
    setCreateModalOpen(false);
  };

  const handleCreateChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setNewCampaign(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setNewCampaign(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // CREATE CAMPAIGN SUBMIT - FIXED VERSION
  const handleCreateSubmit = async () => {
    try {
      console.log('📝 Submitting new campaign:', newCampaign);
      setLoading(true);
      
      // Ensure status is UPPERCASE before sending
      const campaignToSubmit = {
        ...newCampaign,
        status: newCampaign.status.toUpperCase()
      };
      
      console.log('📤 Sending to API with UPPERCASE status:', campaignToSubmit.status);
      console.log('📤 Sending with Meta objective:', campaignToSubmit.objective);
      
      const response = await api.campaigns.createCampaign(campaignToSubmit);
      console.log('✅ Create campaign response:', response);
      
      if (response.success) {
        await fetchCampaigns();
        handleCreateClose();
        
        let message = '';
        let severity = 'success';
        
        if (response.metaSynced) {
          message = `✅ Campaign "${newCampaign.name}" created successfully in Meta Business and local database! Meta Campaign ID: ${response.metaCampaignId} | Objective: ${response.metaObjective}`;
          severity = 'success';
          setDebugInfo(`Campaign created in Meta (ID: ${response.metaCampaignId}, Objective: ${response.metaObjective})`);
        } else if (response.metaError) {
          message = `⚠️ Campaign "${newCampaign.name}" created locally only. ${response.metaError}`;
          severity = 'warning';
          setDebugInfo(`Local campaign created. Meta sync failed: ${response.metaError}`);
        } else {
          message = '⚠️ Campaign created locally only. Connect Meta account to sync.';
          severity = 'warning';
          setDebugInfo('Local campaign created. Meta credentials not configured.');
        }
        
        showSnackbar(message, severity);
      } else {
        throw new Error(response.error || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('❌ Create campaign error:', error);
      setError(error.message || 'Failed to create campaign');
      showSnackbar(`❌ Error: ${error.message}`, 'error');
      setDebugInfo(`Create failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // DELETE CAMPAIGN FUNCTION
  const handleDelete = async () => {
    if (!selectedCampaign) return;
    
    if (!window.confirm(`Are you sure you want to delete "${selectedCampaign.name}"?`)) {
      handleMenuClose();
      return;
    }

    try {
      const response = await api.campaigns.deleteCampaign(selectedCampaign._id);
      
      if (response.success) {
        await fetchCampaigns();
        showSnackbar(
          response.metaDeleted 
            ? 'Campaign deleted locally and from Meta Business' 
            : 'Campaign deleted locally only',
          response.metaDeleted ? 'success' : 'warning'
        );
      } else {
        setError(response.error || 'Failed to delete campaign');
        showSnackbar(response.error || 'Failed to delete campaign', 'error');
      }
    } catch (error) {
      console.error('Delete campaign error:', error);
      setError(error.message || 'Failed to delete campaign');
      showSnackbar(error.message || 'Failed to delete campaign', 'error');
    } finally {
      handleMenuClose();
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        campaign.name.toLowerCase().includes(searchLower) ||
        campaign.objective.toLowerCase().includes(searchLower) ||
        campaign.campaignId.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3,
          gap: 2
        }}>
          <Typography variant="h4" component="h1" sx={{ 
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            fontWeight: 700
          }}>
            Campaigns
            {debugInfo && (
              <Typography variant="caption" display="block" color="info.main">
                {debugInfo}
              </Typography>
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={syncing ? <CircularProgress size={20} /> : <Sync />}
              onClick={handleSync}
              disabled={syncing || !user?.metaAdAccountId || !user?.metaAccessToken}
              size={isMobile ? 'small' : 'medium'}
            >
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateOpen}
              size={isMobile ? 'small' : 'medium'}
              startIcon={<Add />}
            >
              Create Campaign
            </Button>
          </Box>
        </Box>

        {/* Alerts - Improved Version */}
        {!user?.metaAdAccountId && !user?.metaAccessToken && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" href="/settings">
                Connect Now
              </Button>
            }
          >
            <Typography variant="subtitle2" fontWeight="bold">
              Meta Ads Account Not Connected
            </Typography>
            <Typography variant="body2">
              Please connect your Meta Ads account in Settings to create campaigns in Meta Business Manager.
            </Typography>
          </Alert>
        )}

        {user?.metaAdAccountId && !user?.metaAccessToken && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" href="/settings">
                Fix Now
              </Button>
            }
          >
            <Typography variant="subtitle2" fontWeight="bold">
              Meta Access Token Missing
            </Typography>
            <Typography variant="body2">
              Your Ad Account ID is saved but Access Token is missing. Please reconnect in Settings.
            </Typography>
          </Alert>
        )}

        {!user?.metaAdAccountId && user?.metaAccessToken && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" href="/settings">
                Fix Now
              </Button>
            }
          >
            <Typography variant="subtitle2" fontWeight="bold">
              Meta Ad Account ID Missing
            </Typography>
            <Typography variant="body2">
              Your Access Token is saved but Ad Account ID is missing. Please reconnect in Settings.
            </Typography>
          </Alert>
        )}

        {user?.metaAdAccountId && user?.metaAccessToken && (
          <Alert 
            severity="success" 
            sx={{ mb: 3 }}
            icon={<CheckCircle fontSize="inherit" />}
          >
            <Typography variant="subtitle2" fontWeight="bold">
              ✅ Meta Ads Connected
            </Typography>
            <Typography variant="body2">
              Your Meta Ads account is connected. Campaigns will be created in Meta Business Manager.
            </Typography>
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search campaigns..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
                }}
                size={isMobile ? 'small' : 'medium'}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="ALL">All Status</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="PAUSED">Paused</MenuItem>
                  <MenuItem value="STOPPED">Stopped</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  onClick={() => setFilters({ status: 'ALL', search: '' })}
                  size={isMobile ? 'small' : 'medium'}
                >
                  Clear Filters
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Campaigns Table */}
      <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
        {loading && <LinearProgress />}
        
        <Table size={isMobile ? 'small' : isTablet ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Campaign Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Objective</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Budget</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Metrics</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Last Updated</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="circular" width={40} height={40} /></TableCell>
                </TableRow>
              ))
            ) : filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    {user?.metaAdAccountId && user?.metaAccessToken ? (
                      <>
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                          No campaigns found
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                          Click Sync to fetch campaigns from your Meta Ads account or Create to make a new one
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
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
                            onClick={handleCreateOpen}
                          >
                            Create Campaign
                          </Button>
                        </Box>
                      </>
                    ) : (
                      <>
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                          Connect Meta Ads Account
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                          Add your Meta credentials in Settings to sync and create campaigns
                        </Typography>
                        <Button
                          variant="contained"
                          href="/settings"
                        >
                          Go to Settings
                        </Button>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((campaign) => (
                <TableRow key={campaign._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium" noWrap>
                      {campaign.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" noWrap>
                      ID: {campaign.campaignId}
                    </Typography>
                    {campaign.metaObjective && (
                      <Typography variant="caption" color="info.main" display="block" noWrap>
                        Meta: {campaign.metaObjective}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={campaign.status}
                      color={statusColors[campaign.status] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {campaign.objective || '-'}
                    {campaign.metaObjective && campaign.metaObjective !== campaign.objective && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        → {campaign.metaObjective}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium" noWrap>
                      {formatCurrency(campaign.dailyBudget)} daily
                    </Typography>
                    {campaign.lifetimeBudget > 0 && (
                      <Typography variant="caption" color="textSecondary" display="block" noWrap>
                        {formatCurrency(campaign.lifetimeBudget)} total
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" noWrap>
                        Impressions: {campaign.metrics?.impressions?.toLocaleString() || 0}
                      </Typography>
                      <Typography variant="caption" noWrap>
                        Clicks: {campaign.metrics?.clicks?.toLocaleString() || 0}
                      </Typography>
                      <Typography variant="caption" noWrap>
                        Spend: {formatCurrency(campaign.metrics?.spend || 0)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {formatDate(campaign.lastSynced)}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, campaign)}
                    >
                      <MoreVert fontSize={isMobile ? 'small' : 'medium'} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage={isMobile ? '' : 'Rows per page:'}
          labelDisplayedRows={({ from, to, count }) => 
            isMobile ? `${from}-${to}` : `${from}-${to} of ${count}`
          }
        />
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            maxHeight: 200,
            minWidth: 150
          }
        }}
      >
        {selectedCampaign?.status !== 'ACTIVE' && (
          <MenuItem onClick={() => handleStatusChange('ACTIVE')} dense>
            <PlayArrow sx={{ mr: 1 }} fontSize="small" />
            Activate
          </MenuItem>
        )}
        {selectedCampaign?.status !== 'PAUSED' && (
          <MenuItem onClick={() => handleStatusChange('PAUSED')} dense>
            <Pause sx={{ mr: 1 }} fontSize="small" />
            Pause
          </MenuItem>
        )}
        {selectedCampaign?.status !== 'STOPPED' && (
          <MenuItem onClick={() => handleStatusChange('STOPPED')} dense>
            <Stop sx={{ mr: 1 }} fontSize="small" />
            Stop
          </MenuItem>
        )}
        <MenuItem onClick={() => handleEdit(selectedCampaign)} dense>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} dense sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Edit Modal */}
      <CampaignEditModal
        open={editModalOpen}
        campaign={campaignToEdit}
        onClose={handleEditClose}
        onSave={handleEditSave}
      />

      {/* ==================== CREATE CAMPAIGN MODAL - UPDATED WITH META'S NEW OBJECTIVES ==================== */}
      <Dialog open={createModalOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          bgcolor: theme.palette.primary.main,
          color: 'white',
          fontWeight: 600
        }}>
          Create New Campaign
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Campaign Name"
              value={newCampaign.name}
              onChange={(e) => handleCreateChange('name', e.target.value)}
              size="small"
              required
              helperText="Name must be between 1-255 characters"
              variant="outlined"
            />
            
            <FormControl fullWidth size="small" required variant="outlined">
              <InputLabel>Campaign Objective</InputLabel>
              <Select
                value={newCampaign.objective}
                label="Campaign Objective"
                onChange={(e) => handleCreateChange('objective', e.target.value)}
              >
                <MenuItem value="OUTCOME_SALES">
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight="600">💰 Sales</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Drive online sales, conversions, and purchases
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="OUTCOME_LEADS">
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight="600">📋 Leads</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Collect leads, sign-ups, and form submissions
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="OUTCOME_TRAFFIC">
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight="600">🔄 Traffic</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Send users to your website or app (Recommended)
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="OUTCOME_ENGAGEMENT">
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight="600">❤️ Engagement</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Boost post engagement, page likes, and event responses
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="OUTCOME_AWARENESS">
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight="600">👁️ Awareness</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Maximize reach and brand awareness
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="OUTCOME_APP_PROMOTION">
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight="600">📱 App Promotion</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Increase app installs and engagement
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
              <FormHelperText>
                Select your campaign goal (Meta's new objectives)
              </FormHelperText>
            </FormControl>
            
            <TextField
              fullWidth
              label="Daily Budget ($)"
              type="number"
              value={newCampaign.dailyBudget}
              onChange={(e) => handleCreateChange('dailyBudget', e.target.value)}
              size="small"
              helperText="Minimum $1.00 per day"
              inputProps={{ min: 1, step: 0.01 }}
              required
              variant="outlined"
            />
            
            <FormControl fullWidth size="small" required variant="outlined">
              <InputLabel>Campaign Status</InputLabel>
              <Select
                value={newCampaign.status}
                label="Campaign Status"
                onChange={(e) => handleCreateChange('status', e.target.value)}
              >
                <MenuItem value="PAUSED">
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight="600">⏸️ Paused (Recommended)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Campaign won't spend budget until activated
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="ACTIVE">
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight="600">▶️ Active</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Campaign will start immediately
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
              <FormHelperText>
                Start with Paused to review before launching
              </FormHelperText>
            </FormControl>
            
            <Alert 
              severity={user?.metaAdAccountId && user?.metaAccessToken ? "success" : "info"} 
              sx={{ mt: 2, borderRadius: 2 }}
              icon={user?.metaAdAccountId && user?.metaAccessToken ? <CheckCircle /> : <Warning />}
            >
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                {user?.metaAdAccountId && user?.metaAccessToken
                  ? "✅ Meta Business Integration Active" 
                  : "⚠️ Local Only Mode"}
              </Typography>
              <Typography variant="caption" display="block">
                {user?.metaAdAccountId && user?.metaAccessToken
                  ? "Your Meta credentials are connected. This campaign will appear in your Meta Ads Manager immediately with the objective you selected."
                  : "Connect your Meta account in Settings to sync campaigns with Meta Business Manager."}
              </Typography>
              {user?.metaAdAccountId && user?.metaAccessToken && (
                <Typography variant="caption" display="block" sx={{ mt: 0.5, fontWeight: 500 }}>
                  Meta Objective: {newCampaign.objective}
                </Typography>
              )}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
          <Button 
            onClick={handleCreateClose} 
            variant="outlined"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateSubmit} 
            variant="contained"
            disabled={!newCampaign.name || !newCampaign.objective || !newCampaign.dailyBudget || newCampaign.dailyBudget < 1}
            sx={{
              background: user?.metaAdAccountId && user?.metaAccessToken
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                : theme.palette.primary.main,
              borderRadius: 2,
              px: 4,
              py: 1,
              '&:hover': {
                background: user?.metaAdAccountId && user?.metaAccessToken
                  ? 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
                  : theme.palette.primary.dark
              }
            }}
          >
            {user?.metaAdAccountId && user?.metaAccessToken 
              ? '🚀 Create Campaign in Meta' 
              : '💾 Create Local Campaign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          sx={{ 
            width: '100%', 
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
          icon={
            snackbar.severity === 'success' ? <CheckCircle /> :
            snackbar.severity === 'warning' ? <Warning /> :
            null
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default Campaigns;