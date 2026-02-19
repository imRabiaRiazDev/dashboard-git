import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Autocomplete,
  Alert,
  Divider
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { META_API_CONFIG } from '../services/metaIntegration';
import { useAuth } from '../context/AuthContext';

const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const CampaignEditModal = ({ open, campaign, onClose, onSave }) => {
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    dailyBudget: '',
    lifetimeBudget: '',
    objective: '',
    audience: {
      ageMin: 18,
      ageMax: 65,
      genders: [1, 2], // 1=Male, 2=Female
      locations: [],
      interests: []
    },
    creatives: {
      primaryText: '',
      headline: '',
      description: '',
      imageUrl: '',
      callToAction: 'LEARN_MORE'
    },
    settings: {
      billingEvent: 'IMPRESSIONS',
      optimizationGoal: 'REACH'
    }
  });

  const { user } = useAuth();

  const [availableInterests] = useState([
    'Technology',
    'Business',
    'Health & Fitness',
    'Food & Drink',
    'Travel',
    'Fashion',
    'Sports',
    'Music',
    'Movies',
    'Gaming'
  ]);

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        dailyBudget: campaign.dailyBudget || '',
        lifetimeBudget: campaign.lifetimeBudget || '',
        objective: campaign.objective || '',
        audience: {
          ageMin: campaign.audience?.ageMin || 18,
          ageMax: campaign.audience?.ageMax || 65,
          genders: campaign.audience?.genders || [1, 2],
          locations: campaign.audience?.locations || [],
          interests: campaign.audience?.interests || []
        },
        creatives: {
          primaryText: campaign.creatives?.primaryText || '',
          headline: campaign.creatives?.headline || '',
          description: campaign.creatives?.description || '',
          imageUrl: campaign.creatives?.imageUrl || '',
          callToAction: campaign.creatives?.callToAction || 'LEARN_MORE'
        },
        settings: {
          billingEvent: campaign.settings?.billingEvent || 'IMPRESSIONS',
          optimizationGoal: campaign.settings?.optimizationGoal || 'REACH'
        }
      });
    }
  }, [campaign]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleChange = (path, value) => {
    if (path.includes('.')) {
      const [parent, child] = path.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [path]: value
      }));
    }
  };

  const handleArrayChange = (path, value, operation = 'add') => {
    const [parent, child] = path.split('.');
    const currentArray = formData[parent][child] || [];
    
    let newArray;
    if (operation === 'add' && !currentArray.includes(value)) {
      newArray = [...currentArray, value];
    } else if (operation === 'remove') {
      newArray = currentArray.filter(item => item !== value);
    } else {
      newArray = currentArray;
    }

    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: newArray
      }
    }));
  };

  const handleLocationAdd = () => {
    const newLocation = { country: '', region: '', city: '' };
    handleChange('audience.locations', [...formData.audience.locations, newLocation]);
  };

  const handleLocationRemove = (index) => {
    const newLocations = formData.audience.locations.filter((_, i) => i !== index);
    handleChange('audience.locations', newLocations);
  };

  const handleLocationChange = (index, field, value) => {
    const newLocations = [...formData.audience.locations];
    newLocations[index] = { ...newLocations[index], [field]: value };
    handleChange('audience.locations', newLocations);
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  if (!campaign) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">Edit Campaign: {campaign.name}</Typography>
            <Typography variant="caption" color="textSecondary">
              ID: {campaign.campaignId}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Sync Information Alert */}
        {user?.metaAdAccountId ? (
          <Alert 
            severity="info" 
            sx={{ mb: 3, borderRadius: 1 }}
            icon={false}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  🔄 Auto-Sync Enabled
                </Typography>
                <Typography variant="body2">
                  Changes made here will automatically update in your Meta Ads account.
                  This includes:
                </Typography>
                <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 0 }}>
                  <li><Typography variant="body2">Campaign Name</Typography></li>
                  <li><Typography variant="body2">Daily Budget</Typography></li>
                  <li><Typography variant="body2">Campaign Status</Typography></li>
                  <li><Typography variant="body2">Audience Settings</Typography></li>
                </Box>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                  Changes will reflect in Meta Ads within 1-2 minutes.
                </Typography>
              </Box>
            </Box>
          </Alert>
        ) : (
          <Alert 
            severity="warning" 
            sx={{ mb: 3, borderRadius: 1 }}
            icon={false}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  ⚠️ Meta Ads Not Connected
                </Typography>
                <Typography variant="body2">
                  Changes will only be saved locally. Connect your Meta Ads account in Settings 
                  to enable auto-sync with Meta Ads.
                </Typography>
              </Box>
            </Box>
          </Alert>
        )}

        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="Basic Info" />
          <Tab label="Audience" />
          <Tab label="Creatives" />
          <Tab label="Settings" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Campaign Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                helperText="Changing name will update in Meta Ads"
                variant="outlined"
                size="medium"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Daily Budget ($)"
                type="number"
                value={formData.dailyBudget}
                onChange={(e) => handleChange('dailyBudget', e.target.value)}
                InputProps={{ startAdornment: '$' }}
                helperText="Budget updates will sync with Meta Ads"
                variant="outlined"
                size="medium"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Lifetime Budget ($)"
                type="number"
                value={formData.lifetimeBudget}
                onChange={(e) => handleChange('lifetimeBudget', e.target.value)}
                InputProps={{ startAdornment: '$' }}
                variant="outlined"
                size="medium"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Objective</InputLabel>
                <Select
                  value={formData.objective}
                  label="Objective"
                  onChange={(e) => handleChange('objective', e.target.value)}
                  variant="outlined"
                  size="medium"
                >
                  {META_API_CONFIG.objectives.map(obj => (
                    <MenuItem key={obj} value={obj}>
                      {obj.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Age Targeting
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Minimum Age"
                type="number"
                value={formData.audience.ageMin}
                onChange={(e) => handleChange('audience.ageMin', parseInt(e.target.value))}
                inputProps={{ min: 13, max: 65 }}
                variant="outlined"
                size="medium"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Maximum Age"
                type="number"
                value={formData.audience.ageMax}
                onChange={(e) => handleChange('audience.ageMax', parseInt(e.target.value))}
                inputProps={{ min: 18, max: 65 }}
                variant="outlined"
                size="medium"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Gender Targeting
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {[
                  { value: 1, label: 'Male' },
                  { value: 2, label: 'Female' }
                ].map(gender => (
                  <Chip
                    key={gender.value}
                    label={gender.label}
                    color={formData.audience.genders.includes(gender.value) ? 'primary' : 'default'}
                    onClick={() => handleArrayChange(
                      'audience.genders',
                      gender.value,
                      formData.audience.genders.includes(gender.value) ? 'remove' : 'add'
                    )}
                    variant={formData.audience.genders.includes(gender.value) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Locations
                </Typography>
                <Button onClick={handleLocationAdd} variant="outlined" size="small">
                  Add Location
                </Button>
              </Box>
              {formData.audience.locations.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No locations added. Click "Add Location" to target specific regions.
                </Alert>
              ) : (
                formData.audience.locations.map((location, index) => (
                  <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Country"
                        value={location.country}
                        onChange={(e) => handleLocationChange(index, 'country', e.target.value)}
                        size="small"
                        placeholder="e.g., United States"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Region/State"
                        value={location.region}
                        onChange={(e) => handleLocationChange(index, 'region', e.target.value)}
                        size="small"
                        placeholder="e.g., California"
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="City"
                        value={location.city}
                        onChange={(e) => handleLocationChange(index, 'city', e.target.value)}
                        size="small"
                        placeholder="e.g., Los Angeles"
                      />
                    </Grid>
                    <Grid item xs={12} sm={1}>
                      <IconButton 
                        onClick={() => handleLocationRemove(index)} 
                        size="small"
                        color="error"
                      >
                        <Close />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))
              )}
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Interests
              </Typography>
              <Autocomplete
                multiple
                options={availableInterests}
                value={formData.audience.interests}
                onChange={(event, newValue) => {
                  handleChange('audience.interests', newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Interests"
                    placeholder="Add interests"
                    helperText="Target users based on their interests"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      key={index}
                    />
                  ))
                }
              />
            </Grid>
          </Grid>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Primary Text"
                multiline
                rows={3}
                value={formData.creatives.primaryText}
                onChange={(e) => handleChange('creatives.primaryText', e.target.value)}
                placeholder="W  hat is your ad about? Tell your story here..."
                helperText="Main ad copy that users will see first"
                variant="outlined"
                size="medium"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Headline"
                value={formData.creatives.headline}
                onChange={(e) => handleChange('creatives.headline', e.target.value)}
                placeholder="Attention-grabbing headline"
                helperText="Short, compelling headline"
                variant="outlined"
                size="medium"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={formData.creatives.description}
                onChange={(e) => handleChange('creatives.description', e.target.value)}
                placeholder="Additional details about your offer"
                helperText="Supporting text for your ad"
                variant="outlined"
                size="medium"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Image URL"
                value={formData.creatives.imageUrl}
                onChange={(e) => handleChange('creatives.imageUrl', e.target.value)}
                placeholder="https://example.com/image.jpg"
                helperText="URL of the image to display in your ad"
                variant="outlined"
                size="medium"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Call to Action</InputLabel>
                <Select
                  value={formData.creatives.callToAction}
                  label="Call to Action"
                  onChange={(e) => handleChange('creatives.callToAction', e.target.value)}
                  variant="outlined"
                  size="medium"
                >
                  <MenuItem value="LEARN_MORE">Learn More</MenuItem>
                  <MenuItem value="SHOP_NOW">Shop Now</MenuItem>
                  <MenuItem value="SIGN_UP">Sign Up</MenuItem>
                  <MenuItem value="DOWNLOAD">Download</MenuItem>
                  <MenuItem value="CONTACT_US">Contact Us</MenuItem>
                  <MenuItem value="BOOK_NOW">Book Now</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {formData.creatives.imageUrl && (
              <Grid item xs={12}>
                <Box sx={{ mt: 2, p: 2, border: '1px dashed #ccc', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Image Preview:
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <img
                      src={formData.creatives.imageUrl}
                      alt="Ad creative preview"
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: 200, 
                        objectFit: 'contain',
                        borderRadius: 4
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Billing Event</InputLabel>
                <Select
                  value={formData.settings.billingEvent}
                  label="Billing Event"
                  onChange={(e) => handleChange('settings.billingEvent', e.target.value)}
                  variant="outlined"
                  size="medium"
                >
                  {META_API_CONFIG.billingEvents.map(event => (
                    <MenuItem key={event} value={event}>
                      {event.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Optimization Goal</InputLabel>
                <Select
                  value={formData.settings.optimizationGoal}
                  label="Optimization Goal"
                  onChange={(e) => handleChange('settings.optimizationGoal', e.target.value)}
                  variant="outlined"
                  size="medium"
                >
                  {META_API_CONFIG.optimizationGoals.map(goal => (
                    <MenuItem key={goal} value={goal}>
                      {goal.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Note:</strong> Some settings changes may require the campaign 
                  to be paused or restarted to take effect in Meta Ads.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          sx={{ mr: 2 }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          sx={{ 
            minWidth: 120,
            background: user?.metaAdAccountId 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
              : undefined
          }}
        >
          {user?.metaAdAccountId ? 'Save & Sync' : 'Save Locally'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CampaignEditModal;