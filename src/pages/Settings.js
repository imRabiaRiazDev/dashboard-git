import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  useMediaQuery,
  useTheme,
  alpha,
  FormHelperText
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Link as LinkIcon,
  CheckCircle,
  Warning,
  ExpandMore,
  ArrowForward,
  Sync,
  AccountBalance,
  Security,
  Info,
  CopyAll,
  DoneAll
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const steps = [
  'Enter Meta Credentials',
  'Validate Connection',
  'Auto-Sync Campaigns'
];

const Settings = () => {
  const { user, logout, updateMetaCredentials } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [showToken, setShowToken] = useState(false);
  const [formData, setFormData] = useState({
    metaAccessToken: '',
    metaAdAccountId: ''
  });
  const [loading, setLoading] = useState({
    validate: false,
    save: false,
    sync: false
  });
  const [validation, setValidation] = useState({
    token: { valid: false, message: '', data: null },
    account: { valid: false, message: '', data: null }
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [adAccounts, setAdAccounts] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // ==================== CHECK META CONNECTION STATUS ====================
  const checkConnectionStatus = async () => {
    if (!user?.metaAccessToken || !user?.metaAdAccountId) {
      return {
        connected: false,
        message: 'Meta credentials not configured'
      };
    }

    try {
      // Test token validity
      const tokenResult = await api.meta.validateToken(user.metaAccessToken);
      
      if (!tokenResult.valid) {
        return {
          connected: false,
          message: 'Token is invalid or expired',
          error: tokenResult.error
        };
      }

      // Test ad account validity
      const accountResult = await api.meta.validateAdAccount(
        user.metaAccessToken,
        user.metaAdAccountId
      );

      if (!accountResult.valid) {
        return {
          connected: false,
          message: 'Ad account is invalid or inaccessible',
          error: accountResult.error
        };
      }

      return {
        connected: true,
        message: 'Connected to Meta Ads',
        data: {
          user: tokenResult.data,
          account: accountResult.data
        }
      };
    } catch (error) {
      console.error('Error checking connection status:', error);
      return {
        connected: false,
        message: 'Failed to verify connection',
        error: error.message
      };
    }
  };

  // Check connection on page load
  useEffect(() => {
    const verifyConnection = async () => {
      if (user?.metaAdAccountId) {
        const status = await checkConnectionStatus();
        if (!status.connected) {
          setSnackbar({
            open: true,
            message: `⚠️ Meta connection issue: ${status.message}. Please reconnect in Settings.`,
            severity: 'warning'
          });
        }
      }
    };
    
    verifyConnection();
  }, [user]);

  // Initialize form with user data if available
  useEffect(() => {
    if (user?.metaAccessToken) {
      setFormData(prev => ({
        ...prev,
        metaAccessToken: user.metaAccessToken
      }));
    }
    if (user?.metaAdAccountId) {
      setFormData(prev => ({
        ...prev,
        metaAdAccountId: user.metaAdAccountId
      }));
      setActiveStep(2);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'metaAccessToken') {
      setValidation(prev => ({ ...prev, token: { valid: false, message: '' } }));
    }
    if (name === 'metaAdAccountId') {
      setValidation(prev => ({ ...prev, account: { valid: false, message: '' } }));
    }
  };

  const handleValidateToken = async () => {
    if (!formData.metaAccessToken.trim()) {
      setMessage({ type: 'error', text: 'Please enter an access token' });
      return;
    }

    setLoading(prev => ({ ...prev, validate: true }));
    setMessage({ type: '', text: '' });

    try {
      const result = await api.meta.validateToken(formData.metaAccessToken);
      
      if (result.valid) {
        setValidation(prev => ({
          ...prev,
          token: {
            valid: true,
            message: `Token validated for user: ${result.data.name}`,
            data: result.data
          }
        }));
        
        const accounts = await api.meta.getAdAccounts(formData.metaAccessToken);
        setAdAccounts(accounts);
        
        setMessage({ 
          type: 'success', 
          text: 'Token validated successfully!' 
        });
        setActiveStep(1);
        
        if (accounts.length > 0 && !formData.metaAdAccountId) {
          // Store just the numeric ID without act_ prefix
          const firstAccount = accounts[0];
          const numericId = firstAccount.account_id || firstAccount.id.replace('act_', '');
          setFormData(prev => ({
            ...prev,
            metaAdAccountId: numericId
          }));
        }
      } else {
        setValidation(prev => ({
          ...prev,
          token: {
            valid: false,
            message: `Invalid token: ${result.error?.message || 'Unknown error'}`,
            data: null
          }
        }));
        setMessage({ 
          type: 'error', 
          text: `Token validation failed: ${result.error?.message || 'Unknown error'}` 
        });
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setMessage({ type: 'error', text: 'Error validating token' });
    } finally {
      setLoading(prev => ({ ...prev, validate: false }));
    }
  };

  // ==================== FIXED AD ACCOUNT VALIDATION FUNCTION ====================
  const handleValidateAccount = async () => {
    if (!formData.metaAccessToken || !formData.metaAdAccountId) {
      setMessage({ type: 'error', text: 'Both token and account ID are required' });
      return;
    }

    // Format Ad Account ID properly
    let adAccountId = formData.metaAdAccountId.trim();
    
    // Remove 'act_' if user added it (we store without prefix)
    if (adAccountId.startsWith('act_')) {
      adAccountId = adAccountId.substring(4);
    }
    
    // Remove any non-numeric characters
    adAccountId = adAccountId.replace(/\D/g, '');
    
    if (!adAccountId) {
      setMessage({ type: 'error', text: 'Invalid Ad Account ID format. Please enter only numbers.' });
      return;
    }

    // Update form data with cleaned ID
    setFormData(prev => ({
      ...prev,
      metaAdAccountId: adAccountId // Store without act_ prefix
    }));

    setLoading(prev => ({ ...prev, validate: true }));

    try {
      const result = await api.meta.validateAdAccount(
        formData.metaAccessToken,
        adAccountId
      );
      
      if (result.valid) {
        setValidation(prev => ({
          ...prev,
          account: {
            valid: true,
            message: `Account validated: ${result.data.name}`,
            data: result.data
          }
        }));
        
        setMessage({ 
          type: 'success', 
          text: 'Ad Account validated successfully!' 
        });
        setActiveStep(2);
      } else {
        setValidation(prev => ({
          ...prev,
          account: {
            valid: false,
            message: `Invalid account: ${result.error?.message || 'Unknown error'}`,
            data: null
          }
        }));
        setMessage({ 
          type: 'error', 
          text: `Account validation failed: ${result.error?.message || 'Unknown error'}` 
        });
      }
    } catch (error) {
      console.error('Account validation error:', error);
      setMessage({ type: 'error', text: 'Error validating account' });
    } finally {
      setLoading(prev => ({ ...prev, validate: false }));
    }
  };

  const handleSaveAndSync = async () => {
    if (!formData.metaAccessToken || !formData.metaAdAccountId) {
      setMessage({ type: 'error', text: 'Both fields are required' });
      return;
    }

    setLoading(prev => ({ ...prev, save: true, sync: true }));
    setMessage({ type: '', text: '' });

    try {
      const result = await api.campaigns.updateMetaCredentialsAndSync(formData);
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Credentials saved and ${result.syncedCampaigns || 0} campaigns synced successfully!` 
        });
        
        setSnackbar({
          open: true,
          message: `Successfully connected and synced ${result.syncedCampaigns || 0} campaigns`,
          severity: 'success'
        });

        // Update user in auth context
        await updateMetaCredentials(formData);

        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save credentials' });
      }
    } catch (error) {
      console.error('Save credentials error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save credentials' });
    } finally {
      setLoading(prev => ({ ...prev, save: false, sync: false }));
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbar({
        open: true,
        message: 'Copied to clipboard',
        severity: 'success'
      });
    });
  };

  const handleAccordionChange = () => {
    setExpanded(!expanded);
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const isStepComplete = (step) => {
    switch(step) {
      case 0:
        return validation.token.valid;
      case 1:
        return validation.account.valid;
      case 2:
        return user?.metaAdAccountId && user.metaAdAccountId === formData.metaAdAccountId;
      default:
        return false;
    }
  };

  return (
    <Layout>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
        Settings
      </Typography>

      {!user?.metaAdAccountId && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Stepper activeStep={activeStep} orientation={isMobile ? 'vertical' : 'horizontal'}>
            {steps.map((label, index) => (
              <Step key={label} completed={isStepComplete(index)}>
                <StepLabel>{label}</StepLabel>
                {isMobile && (
                  <StepContent>
                    {index === 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="textSecondary" paragraph>
                          Enter your Meta Access Token to begin
                        </Typography>
                      </Box>
                    )}
                  </StepContent>
                )}
              </Step>
            ))}
          </Stepper>
        </Paper>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <AccountBalance sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Meta Ads Integration
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Connect your Meta Ads account to sync campaigns automatically
                </Typography>
              </Box>
            </Box>
            
            {message.text && (
              <Alert 
                severity={message.type} 
                sx={{ mb: 3 }}
                icon={message.type === 'success' ? <CheckCircle /> : <Warning />}
              >
                {message.text}
              </Alert>
            )}

            {/* Step 1: Access Token */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security fontSize="small" />
                Step 1: Meta Access Token
              </Typography>
              
              <TextField
                fullWidth
                name="metaAccessToken"
                label="Meta Access Token"
                type={showToken ? 'text' : 'password'}
                value={formData.metaAccessToken}
                onChange={handleChange}
                disabled={loading.save || loading.sync}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowToken(!showToken)}
                        edge="end"
                        size="small"
                      >
                        {showToken ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                      <IconButton
                        onClick={() => handleCopyToClipboard(formData.metaAccessToken)}
                        edge="end"
                        size="small"
                        disabled={!formData.metaAccessToken}
                      >
                        <CopyAll fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                  startAdornment: (
                    <InputAdornment position="start">
                      {validation.token.valid ? (
                        <CheckCircle color="success" fontSize="small" />
                      ) : (
                        <Warning color="warning" fontSize="small" />
                      )}
                    </InputAdornment>
                  )
                }}
                helperText={
                  validation.token.valid 
                    ? validation.token.message
                    : "Get your access token from Meta Graph API Explorer"
                }
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={handleValidateToken}
                  disabled={loading.validate || !formData.metaAccessToken || loading.save}
                  startIcon={loading.validate ? <CircularProgress size={20} /> : <CheckCircle />}
                >
                  {loading.validate ? 'Validating...' : 'Validate Token'}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                >
                  Get Access Token
                </Button>

                <Button
                  variant="text"
                  startIcon={<Info />}
                  onClick={handleAccordionChange}
                  size="small"
                >
                  How to get token
                </Button>
              </Box>
            </Box>

            {/* Step 2: Ad Account ID - FIXED VERSION */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalance fontSize="small" />
                Step 2: Ad Account ID
              </Typography>
              
              <TextField
                fullWidth
                name="metaAdAccountId"
                label="Ad Account ID"
                value={formData.metaAdAccountId}
                onChange={handleChange}
                disabled={loading.save || loading.sync || !validation.token.valid}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {validation.account.valid ? (
                        <CheckCircle color="success" fontSize="small" />
                      ) : (
                        <Warning color="warning" fontSize="small" />
                      )}
                    </InputAdornment>
                  )
                }}
                helperText={
                  validation.account.valid 
                    ? validation.account.message
                    : "Enter your Meta Ads Account ID (numbers only, no 'act_' prefix)"
                }
                placeholder="123456789"
                sx={{ mb: 2 }}
              />
              <FormHelperText sx={{ ml: 1, mt: -1, mb: 2 }}>
                Example: 123456789 (not act_123456789)
              </FormHelperText>

              {/* Available Ad Accounts */}
              {adAccounts.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Available Ad Accounts:
                  </Typography>
                  <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: alpha(theme.palette.primary.main, 0.02), borderRadius: 2 }}>
                    {adAccounts.map((account) => {
                      const numericId = account.account_id || account.id.replace('act_', '');
                      return (
                        <ListItem
                          key={account.id}
                          button
                          selected={formData.metaAdAccountId === numericId}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, metaAdAccountId: numericId }));
                            // Reset validation when selecting new account
                            setValidation(prev => ({ ...prev, account: { valid: false, message: '' } }));
                          }}
                          sx={{
                            borderRadius: 1,
                            mb: 0.5,
                            '&.Mui-selected': {
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.15),
                              }
                            }
                          }}
                          secondaryAction={
                            <Chip
                              label={account.account_status === 1 ? 'Active' : 'Inactive'}
                              color={account.account_status === 1 ? 'success' : 'error'}
                              size="small"
                            />
                          }
                        >
                          <ListItemIcon>
                            <AccountBalance fontSize="small" color={formData.metaAdAccountId === numericId ? 'primary' : 'inherit'} />
                          </ListItemIcon>
                          <ListItemText
                            primary={account.name || account.id}
                            secondary={`ID: ${numericId} • ${account.currency || 'USD'}`}
                            primaryTypographyProps={{
                              fontWeight: formData.metaAdAccountId === numericId ? 600 : 400
                            }}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                    Click on an account to select it. Only Active accounts can be used.
                  </Typography>
                </Box>
              )}

              <Button
                variant="contained"
                onClick={handleValidateAccount}
                disabled={loading.validate || !formData.metaAdAccountId || !validation.token.valid || loading.save}
                startIcon={loading.validate ? <CircularProgress size={20} /> : <CheckCircle />}
                sx={{ mt: 1 }}
              >
                {loading.validate ? 'Validating...' : 'Validate Account'}
              </Button>
            </Box>

            {/* Step 3: Save and Sync */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Sync fontSize="small" />
                Step 3: Save & Auto-Sync
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Saving credentials will automatically sync your campaigns from Meta Ads.
                  The system will fetch campaign data daily and update statistics in real-time.
                </Typography>
              </Alert>

              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveAndSync}
                disabled={loading.save || loading.sync || !validation.token.valid || !validation.account.valid}
                startIcon={
                  loading.save || loading.sync ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <DoneAll />
                  )
                }
                size="large"
                sx={{ 
                  py: 1.5,
                  px: 4,
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                }}
              >
                {loading.save || loading.sync ? 'Saving & Syncing...' : 'Save & Sync Campaigns'}
              </Button>
            </Box>
          </Paper>

          {/* Help Accordion */}
          <Accordion expanded={expanded} onChange={handleAccordionChange} sx={{ mt: 3, borderRadius: '8px !important' }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography sx={{ fontWeight: 600 }}>How to get Meta Ads credentials</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <ListItemIcon><ArrowForward /></ListItemIcon>
                  <ListItemText 
                    primary="1. Go to Meta Graph API Explorer"
                    secondary="https://developers.facebook.com/tools/explorer/"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ArrowForward /></ListItemIcon>
                  <ListItemText 
                    primary="2. Select your app and get token with permissions"
                    secondary="ads_management, ads_read, business_management"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ArrowForward /></ListItemIcon>
                  <ListItemText 
                    primary="3. Copy the generated access token"
                    secondary="Token will look like: EAA... (long string)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ArrowForward /></ListItemIcon>
                  <ListItemText 
                    primary="4. Get your Ad Account ID from Meta Ads Manager"
                    secondary="Enter just the numbers, without 'act_' prefix (e.g., 123456789)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ArrowForward /></ListItemIcon>
                  <ListItemText 
                    primary="5. Validate and Save"
                    secondary="Click Validate Account then Save & Sync Campaigns"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Account Status - Improved Version */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info />
              Account Status
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Meta Ads Connection
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: user?.metaAdAccountId && user?.metaAccessToken
                  ? alpha(theme.palette.success.main, 0.1)
                  : alpha(theme.palette.warning.main, 0.1)
              }}>
                {user?.metaAdAccountId && user?.metaAccessToken ? (
                  <>
                    <CheckCircle color="success" sx={{ mr: 2 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="600">
                        ✅ Connected to Meta Ads
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Account ID: {user.metaAdAccountId}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                        Token: {user.metaAccessToken ? `${user.metaAccessToken.substring(0, 20)}...` : 'Not set'}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <>
                    <Warning color="warning" sx={{ mr: 2 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="600">
                        ❌ Not Connected to Meta Ads
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        {!user?.metaAccessToken && !user?.metaAdAccountId && 'No credentials found. '}
                        {!user?.metaAccessToken && user?.metaAdAccountId && 'Token missing. '}
                        {user?.metaAccessToken && !user?.metaAdAccountId && 'Ad Account ID missing. '}
                        Follow the steps to connect your account.
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
              
              {/* Show token info for debugging */}
              {user?.metaAccessToken && (
                <Alert severity="info" sx={{ mt: 1, fontSize: '0.75rem' }}>
                  <Typography variant="caption" fontWeight="bold">
                    Token Status:
                  </Typography>
                  <Typography variant="caption" display="block">
                    Length: {user.metaAccessToken.length} characters
                  </Typography>
                  <Typography variant="caption" display="block">
                    Starts with: {user.metaAccessToken.substring(0, 10)}...
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    Token expires: Check Meta Developer Console
                  </Typography>
                </Alert>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="textSecondary" gutterBottom>
              Account Information
            </Typography>
            
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ '& > div': { mb: 2 } }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Name
                    </Typography>
                    <Typography variant="body2" fontWeight="500">
                      {user?.name}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Email
                    </Typography>
                    <Typography variant="body2" fontWeight="500">
                      {user?.email}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Role
                    </Typography>
                    <Chip
                      label={user?.role || 'client'}
                      color={user?.role === 'admin' ? 'primary' : 'default'}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Company
                    </Typography>
                    <Typography variant="body2" fontWeight="500">
                      {user?.companyName || 'Not specified'}
                    </Typography>
                  </Box>
                  
                  {user?.currency && (
                    <Box>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Currency
                      </Typography>
                      <Typography variant="body2" fontWeight="500">
                        {user.currency}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>

            {user?.metaAdAccountId && user?.metaAccessToken && (
              <>
                <Divider sx={{ my: 3 }} />
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  onClick={async () => {
                    try {
                      setLoading(prev => ({ ...prev, sync: true }));
                      const result = await api.campaigns.syncCampaigns();
                      if (result.success) {
                        setSnackbar({
                          open: true,
                          message: `Synced ${result.total || 0} campaigns`,
                          severity: 'success'
                        });
                      }
                    } catch (error) {
                      setSnackbar({
                        open: true,
                        message: error.message || 'Sync failed',
                        severity: 'error'
                      });
                    } finally {
                      setLoading(prev => ({ ...prev, sync: false }));
                    }
                  }}
                  startIcon={loading.sync ? <CircularProgress size={20} /> : <Sync />}
                  disabled={loading.sync}
                >
                  {loading.sync ? 'Syncing...' : 'Sync Campaigns Now'}
                </Button>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default Settings;