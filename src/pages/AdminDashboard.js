// AdminDashboard.js - Fully Responsive with Mobile Optimization
import React, { useState, useEffect } from 'react';
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
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Avatar,
  alpha,
  Skeleton,
  Fade,
  Zoom,
  Grow,
  Slide,
  useMediaQuery,
  useTheme,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  People,
  Campaign,
  MonetizationOn,
  Visibility,
  Edit,
  Delete,
  Add,
  ArrowUpward,
  ArrowDownward,
  TrendingFlat,
  MoreVert,
  AccountCircle,
  Business,
  Link,
  LinkOff,
  Email,
  CalendarToday,
  ArrowForward,
  Smartphone,
  DesktopWindows,
  Tablet
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';

// Mobile View Components
const MobileClientCard = ({ client, campaigns, onEdit, onDelete, index }) => {
  const theme = useTheme();
  const clientCampaigns = campaigns.filter(c => c.clientId?._id === client._id);
  const activeCampaigns = clientCampaigns.filter(c => c.status === 'ACTIVE').length;
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit(client);
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete(client._id);
  };

  return (
    <Fade in timeout={300 + (index * 100)}>
      <Card sx={{ 
        mb: 2,
        borderRadius: 3,
        bgcolor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        '&:hover': {
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)',
        },
        transition: 'all 0.3s ease',
      }}>
        <CardContent sx={{ p: 2.5 }}>
          {/* Header with actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                width: 50,
                height: 50,
                fontSize: '1.2rem',
                fontWeight: 600
              }}>
                {client.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="600" sx={{ color: theme.palette.text.primary, mb: 0.5 }}>
                  {client.name}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccountCircle fontSize="inherit" />
                  {client.role}
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{
                color: theme.palette.text.secondary,
              }}
            >
              <MoreVert />
            </IconButton>
          </Box>

          {/* Client Info */}
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Email fontSize="small" sx={{ color: theme.palette.text.secondary, minWidth: 20 }} />
              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                {client.email}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Business fontSize="small" sx={{ color: theme.palette.text.secondary, minWidth: 20 }} />
              <Typography variant="body2">
                {client.companyName || 'No company'}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday fontSize="small" sx={{ color: theme.palette.text.secondary, minWidth: 20 }} />
              <Typography variant="body2" color="textSecondary">
                Joined {formatDate(client.createdAt)}
              </Typography>
            </Box>
          </Stack>

          {/* Stats Row */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            borderRadius: 2,
            p: 1.5,
            mb: 2
          }}>
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>
                Campaigns
              </Typography>
              <Typography variant="h6" fontWeight="600" sx={{ color: theme.palette.primary.main }}>
                {clientCampaigns.length}
              </Typography>
            </Box>
            
            <Divider orientation="vertical" flexItem />
            
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>
                Active
              </Typography>
              <Typography variant="h6" fontWeight="600" sx={{ color: theme.palette.success.main }}>
                {activeCampaigns}
              </Typography>
            </Box>
            
            <Divider orientation="vertical" flexItem />
            
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>
                Status
              </Typography>
              <Chip
                icon={client.metaAdAccountId ? <Link fontSize="small" /> : <LinkOff fontSize="small" />}
                label={client.metaAdAccountId ? 'Connected' : 'Not Connected'}
                color={client.metaAdAccountId ? 'success' : 'warning'}
                size="small"
                sx={{ 
                  height: 24,
                  fontSize: '0.7rem',
                  '& .MuiChip-label': { px: 1 }
                }}
              />
            </Box>
          </Box>

          {/* Action Button */}
          <Button
            fullWidth
            variant="outlined"
            size="small"
            endIcon={<ArrowForward />}
            onClick={() => onEdit(client)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            View Details
          </Button>
        </CardContent>

        {/* Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 150,
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }
          }}
        >
          <MenuItem onClick={handleEdit} dense sx={{ py: 1 }}>
            <Edit fontSize="small" sx={{ mr: 2, color: theme.palette.primary.main }} />
            Edit
          </MenuItem>
          <MenuItem onClick={handleDelete} dense sx={{ py: 1 }}>
            <Delete fontSize="small" sx={{ mr: 2, color: theme.palette.error.main }} />
            Delete
          </MenuItem>
        </Menu>
      </Card>
    </Fade>
  );
};

const MobileCampaignCard = ({ campaign, index }) => {
  const theme = useTheme();
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return theme.palette.success.main;
      case 'PAUSED': return theme.palette.warning.main;
      case 'STOPPED': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };

  const ctr = ((campaign.metrics?.clicks || 0) / (campaign.metrics?.impressions || 1) * 100).toFixed(2);
  const cpc = ((campaign.metrics?.spend || 0) / (campaign.metrics?.clicks || 1)).toFixed(2);

  return (
    <Fade in timeout={300 + (index * 100)}>
      <Card sx={{ 
        mb: 2,
        borderRadius: 3,
        bgcolor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        '&:hover': {
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)',
        },
        transition: 'all 0.3s ease',
      }}>
        <CardContent sx={{ p: 2.5 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ 
                color: theme.palette.text.primary,
                mb: 0.5,
                lineHeight: 1.3
              }}>
                {campaign.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                ID: {campaign.campaignId}
              </Typography>
            </Box>
            <Chip
              label={campaign.status}
              size="small"
              sx={{ 
                bgcolor: alpha(getStatusColor(campaign.status), 0.1),
                color: getStatusColor(campaign.status),
                borderRadius: 2,
                fontWeight: 600,
                height: 24,
                fontSize: '0.7rem',
                '& .MuiChip-label': { px: 1 }
              }}
            />
          </Box>

          {/* Client Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Avatar sx={{ 
              width: 36, 
              height: 36,
              fontSize: '0.875rem',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main
            }}>
              {campaign.clientId?.name?.charAt(0) || 'C'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight="500">
                {campaign.clientId?.name}
              </Typography>
              <Typography variant="caption" color="textSecondary" noWrap>
                {campaign.clientId?.companyName}
              </Typography>
            </Box>
          </Box>

          {/* Metrics Grid */}
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Box sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                borderRadius: 2,
                p: 1.5,
                textAlign: 'center'
              }}>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>
                  Spend
                </Typography>
                <Typography variant="h6" fontWeight="600" sx={{ 
                  fontSize: '1rem',
                  color: theme.palette.primary.main
                }}>
                  {formatCurrency(campaign.metrics?.spend || 0)}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6}>
              <Box sx={{ 
                bgcolor: alpha(theme.palette.info.main, 0.04),
                borderRadius: 2,
                p: 1.5,
                textAlign: 'center'
              }}>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>
                  Impressions
                </Typography>
                <Typography variant="h6" fontWeight="600" sx={{ 
                  fontSize: '1rem',
                  color: theme.palette.info.main
                }}>
                  {(campaign.metrics?.impressions || 0).toLocaleString()}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6}>
              <Box sx={{ 
                bgcolor: alpha(theme.palette.success.main, 0.04),
                borderRadius: 2,
                p: 1.5,
                textAlign: 'center'
              }}>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>
                  CTR
                </Typography>
                <Typography variant="h6" fontWeight="600" sx={{ 
                  fontSize: '1rem',
                  color: ctr > 2 ? theme.palette.success.main : theme.palette.error.main
                }}>
                  {ctr}%
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6}>
              <Box sx={{ 
                bgcolor: alpha(theme.palette.warning.main, 0.04),
                borderRadius: 2,
                p: 1.5,
                textAlign: 'center'
              }}>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>
                  CPC
                </Typography>
                <Typography variant="h6" fontWeight="600" sx={{ 
                  fontSize: '1rem',
                  color: cpc < 1 ? theme.palette.success.main : theme.palette.error.main
                }}>
                  ${cpc}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Footer */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            pt: 1.5,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`
          }}>
            <Typography variant="caption" color="textSecondary">
              Updated {formatDate(campaign.lastSynced)}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Fade>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color, subtitle, loading, index, isMobile }) => {
  const theme = useTheme();
  
  return (
    <Grow in timeout={300 + (index * 100)}>
      <Card sx={{ 
        height: '100%',
        borderRadius: 3,
        bgcolor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          '& .card-icon': {
            transform: 'scale(1.1) rotate(5deg)',
          }
        },
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.7)})`,
        }
      }}>
        <CardContent sx={{ 
          p: isMobile ? 2 : 2.5,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="textSecondary" sx={{ 
                fontSize: isMobile ? '0.7rem' : '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
                mb: 1
              }}>
                {title}
              </Typography>
              {loading ? (
                <Skeleton variant="text" width="60%" height={isMobile ? 32 : 40} />
              ) : (
                <Typography variant={isMobile ? "h5" : "h4"} component="div" sx={{ 
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  mb: 0.5,
                  fontSize: isMobile ? '1.25rem' : { xs: '1.5rem', md: '1.75rem' }
                }}>
                  {value}
                </Typography>
              )}
              {subtitle && !loading && (
                <Typography variant="caption" color="textSecondary" sx={{ 
                  fontSize: isMobile ? '0.65rem' : '0.75rem',
                  display: 'block'
                }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Avatar className="card-icon" sx={{ 
              bgcolor: alpha(color, 0.1), 
              color: color,
              width: isMobile ? 40 : 48,
              height: isMobile ? 40 : 48,
              transition: 'all 0.3s ease',
              ml: 1
            }}>
              {icon}
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    </Grow>
  );
};

// Main Component
const AdminDashboard = () => {
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalCampaigns: 0,
    totalSpend: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    companyName: '',
    role: 'client'
  });
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [clientsResponse, campaignsResponse] = await Promise.all([
        api.admin.getClients(),
        api.admin.getAllCampaigns({ limit: 10 })
      ]);

      setClients(clientsResponse || []);
      setCampaigns(campaignsResponse?.campaigns || []);

      // Calculate stats
      const totalSpend = (campaignsResponse?.campaigns || []).reduce(
        (sum, campaign) => sum + (campaign.metrics?.spend || 0), 0
      );

      setStats({
        totalClients: clientsResponse?.length || 0,
        activeClients: (clientsResponse || []).filter(c => c.metaAdAccountId).length || 0,
        totalCampaigns: campaignsResponse?.total || 0,
        totalSpend
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (client = null) => {
    if (client) {
      setClientForm({
        name: client.name,
        email: client.email,
        companyName: client.companyName,
        role: client.role
      });
      setSelectedClient(client);
    } else {
      setClientForm({
        name: '',
        email: '',
        companyName: '',
        role: 'client'
      });
      setSelectedClient(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedClient(null);
  };

  const handleFormChange = (e) => {
    setClientForm({
      ...clientForm,
      [e.target.name]: e.target.value
    });
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      // In a real app, you would call an API to delete the client
      console.log('Delete client:', clientId);
      // await adminAPI.deleteClient(clientId);
      fetchAdminData();
    }
  };

  const statCards = [
    {
      title: "Total Clients",
      value: stats.totalClients,
      subtitle: `${stats.activeClients} connected`,
      icon: <People />,
      color: theme.palette.primary.main
    },
    {
      title: "Total Campaigns",
      value: stats.totalCampaigns,
      icon: <Campaign />,
      color: theme.palette.secondary.main
    },
    {
      title: "Total Spend",
      value: formatCurrency(stats.totalSpend),
      icon: <MonetizationOn />,
      color: theme.palette.success.main
    },
    {
      title: "Active Campaigns",
      value: campaigns.filter(c => c.status === 'ACTIVE').length,
      icon: <Visibility />,
      color: theme.palette.info.main
    }
  ];

  return (
    <Layout>
      {/* Header Section - Responsive */}
      <Slide direction="down" in timeout={300}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 2,
            mb: 3
          }}>
            <Box>
              <Typography variant={isMobile ? "h5" : "h4"} component="h1" sx={{ 
                fontWeight: 700,
                color: theme.palette.text.primary,
                mb: 0.5,
                textAlign: isMobile ? 'center' : 'left'
              }}>
                Admin Dashboard
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ 
                fontSize: isMobile ? '0.875rem' : '1rem',
                textAlign: isMobile ? 'center' : 'left',
                maxWidth: 600,
                mx: isMobile ? 'auto' : 0
              }}>
                Monitor all client accounts and campaigns
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: isMobile ? 'center' : 'flex-end',
              width: '100%'
            }}>
              <Zoom in timeout={500}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog()}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    borderRadius: 3,
                    px: isMobile ? 2 : 3,
                    py: isMobile ? 1 : 1.5,
                    fontWeight: 600,
                    width: isMobile ? '100%' : 'auto',
                    maxWidth: isMobile ? 300 : 'none'
                  }}
                >
                  Add Client
                </Button>
              </Zoom>
            </Box>
          </Box>

          <Fade in timeout={800}>
            <Alert severity="info" sx={{ 
              borderRadius: 2,
              textAlign: 'center',
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}>
              <Typography variant="body2">
                You are viewing all client accounts and campaigns
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.8 }}>
                Only admins can access this page
              </Typography>
            </Alert>
          </Fade>
        </Box>
      </Slide>

      {/* Stats Cards - Responsive Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={6} sm={6} md={3} key={stat.title} sx={{ 
            display: 'flex',
            justifyContent: 'center'
          }}>
            <Box sx={{ width: '100%', maxWidth: 400 }}>
              <StatCard {...stat} loading={loading} index={index} isMobile={isMobile} />
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Clients Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600,
            color: theme.palette.text.primary,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <People sx={{ color: theme.palette.primary.main }} />
            Clients ({clients.length})
          </Typography>
        </Box>

        {loading ? (
          // Loading skeletons for mobile
          <Box>
            {[1, 2, 3].map((_, index) => (
              <Card key={index} sx={{ mb: 2, borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Skeleton variant="circular" width={50} height={50} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="60%" height={24} />
                      <Skeleton variant="text" width="40%" height={16} />
                    </Box>
                  </Box>
                  <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2, mb: 2 }} />
                  <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 2 }} />
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : isMobile ? (
          // Mobile View - Cards
          <Box>
            {clients.length === 0 ? (
              <Card sx={{ 
                borderRadius: 3,
                textAlign: 'center',
                p: 4,
                bgcolor: alpha(theme.palette.primary.main, 0.03)
              }}>
                <Avatar sx={{ 
                  width: 80, 
                  height: 80, 
                  mx: 'auto', 
                  mb: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main
                }}>
                  <People fontSize="large" />
                </Avatar>
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No clients found
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                  Add your first client to get started
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog()}
                  sx={{ borderRadius: 2 }}
                >
                  Add First Client
                </Button>
              </Card>
            ) : (
              clients.map((client, index) => (
                <MobileClientCard
                  key={client._id}
                  client={client}
                  campaigns={campaigns}
                  onEdit={handleOpenDialog}
                  onDelete={handleDeleteClient}
                  index={index}
                />
              ))
            )}
          </Box>
        ) : (
          // Desktop View - Table
          <Paper sx={{ 
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    '& th': {
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      whiteSpace: 'nowrap'
                    }
                  }}>
                    <TableCell>Client Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Campaigns</TableCell>
                    <TableCell>Joined</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <Avatar sx={{ 
                            width: 80, 
                            height: 80, 
                            mx: 'auto', 
                            mb: 2,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main
                          }}>
                            <People fontSize="large" />
                          </Avatar>
                          <Typography variant="h6" color="textSecondary" gutterBottom>
                            No clients found
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Add your first client to get started
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((client, index) => (
                      <TableRow key={client._id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ 
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                              width: 40,
                              height: 40
                            }}>
                              {client.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="600">
                                {client.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {client.role}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>{client.companyName || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={client.metaAdAccountId ? 'Connected' : 'Not Connected'}
                            color={client.metaAdAccountId ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {campaigns.filter(c => c.clientId?._id === client._id).length}
                        </TableCell>
                        <TableCell>
                          {formatDate(client.createdAt)}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(client)}
                              sx={{ color: theme.palette.primary.main }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClient(client._id)}
                              sx={{ color: theme.palette.error.main }}
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>

      {/* Recent Campaigns Section */}
      <Box>
        <Typography variant="h6" sx={{ 
          fontWeight: 600,
          color: theme.palette.text.primary,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2
        }}>
          <Campaign sx={{ color: theme.palette.secondary.main }} />
          Recent Campaigns ({campaigns.length})
        </Typography>

        {loading ? (
          // Loading skeletons for mobile
          <Box>
            {[1, 2, 3].map((_, index) => (
              <Card key={index} sx={{ mb: 2, borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Skeleton variant="text" width="70%" height={28} />
                    <Skeleton variant="circular" width={60} height={24} />
                  </Box>
                  <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 2, mb: 2 }} />
                  <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    {[1, 2, 3, 4].map((i) => (
                      <Grid item xs={6} key={i}>
                        <Skeleton variant="rectangular" height={70} sx={{ borderRadius: 2 }} />
                      </Grid>
                    ))}
                  </Grid>
                  <Skeleton variant="text" width="40%" height={16} />
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : isMobile ? (
          // Mobile View - Cards
          <Box>
            {campaigns.length === 0 ? (
              <Card sx={{ 
                borderRadius: 3,
                textAlign: 'center',
                p: 4,
                bgcolor: alpha(theme.palette.secondary.main, 0.03)
              }}>
                <Avatar sx={{ 
                  width: 80, 
                  height: 80, 
                  mx: 'auto', 
                  mb: 2,
                  bgcolor: alpha(theme.palette.secondary.main, 0.1),
                  color: theme.palette.secondary.main
                }}>
                  <Campaign fontSize="large" />
                </Avatar>
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No campaigns found
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Campaigns will appear here once clients sync their Meta accounts
                </Typography>
              </Card>
            ) : (
              campaigns.slice(0, 5).map((campaign, index) => (
                <MobileCampaignCard
                  key={campaign._id}
                  campaign={campaign}
                  index={index}
                />
              ))
            )}
          </Box>
        ) : (
          // Desktop View - Table
          <Paper sx={{ 
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ 
                    bgcolor: alpha(theme.palette.secondary.main, 0.04),
                    '& th': {
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      whiteSpace: 'nowrap'
                    }
                  }}>
                    <TableCell>Campaign Name</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Spend</TableCell>
                    <TableCell>Performance</TableCell>
                    <TableCell>Last Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <Avatar sx={{ 
                            width: 80, 
                            height: 80, 
                            mx: 'auto', 
                            mb: 2,
                            bgcolor: alpha(theme.palette.secondary.main, 0.1),
                            color: theme.palette.secondary.main
                          }}>
                            <Campaign fontSize="large" />
                          </Avatar>
                          <Typography variant="h6" color="textSecondary" gutterBottom>
                            No campaigns found
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Campaigns will appear here once clients sync their Meta accounts
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.slice(0, 5).map((campaign, index) => (
                      <TableRow key={campaign._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="600">
                            {campaign.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ID: {campaign.campaignId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ 
                              width: 32, 
                              height: 32,
                              fontSize: '0.875rem',
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main
                            }}>
                              {campaign.clientId?.name?.charAt(0) || 'C'}
                            </Avatar>
                            <Box>
                              <Typography variant="body2">
                                {campaign.clientId?.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {campaign.clientId?.companyName}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={campaign.status}
                            size="small"
                            sx={{ 
                              bgcolor: alpha(
                                campaign.status === 'ACTIVE' ? theme.palette.success.main :
                                campaign.status === 'PAUSED' ? theme.palette.warning.main :
                                theme.palette.error.main, 0.1),
                              color: campaign.status === 'ACTIVE' ? theme.palette.success.main :
                                     campaign.status === 'PAUSED' ? theme.palette.warning.main :
                                     theme.palette.error.main
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {formatCurrency(campaign.metrics?.spend || 0)}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="caption">
                              CTR: {((campaign.metrics?.clicks || 0) / (campaign.metrics?.impressions || 1) * 100).toFixed(2)}%
                            </Typography>
                            <Typography variant="caption">
                              CPC: ${((campaign.metrics?.spend || 0) / (campaign.metrics?.clicks || 1)).toFixed(2)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {formatDate(campaign.lastSynced)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>

      {/* Client Dialog - Responsive */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 3,
            overflow: 'hidden',
            m: isMobile ? 0 : 2,
            height: isMobile ? '100%' : 'auto'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: theme.palette.primary.main,
          color: 'white',
          p: isMobile ? 2 : 3,
          fontWeight: 600,
          fontSize: isMobile ? '1.125rem' : '1.25rem'
        }}>
          {selectedClient ? 'Edit Client' : 'Add New Client'}
          {isMobile && (
            <IconButton
              onClick={handleCloseDialog}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: 'white'
              }}
            >
              <Delete />
            </IconButton>
          )}
        </DialogTitle>
        
        <DialogContent sx={{ p: isMobile ? 2 : 3 }}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              name="name"
              label="Full Name"
              value={clientForm.name}
              onChange={handleFormChange}
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
            <TextField
              fullWidth
              name="email"
              label="Email Address"
              type="email"
              value={clientForm.email}
              onChange={handleFormChange}
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
            <TextField
              fullWidth
              name="companyName"
              label="Company Name"
              value={clientForm.companyName}
              onChange={handleFormChange}
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
            <TextField
              select
              fullWidth
              name="role"
              label="Role"
              value={clientForm.role}
              onChange={handleFormChange}
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
              SelectProps={{
                native: true,
              }}
            >
              <option value="client">Client</option>
              <option value="admin">Admin</option>
            </TextField>
          </Stack>
        </DialogContent>
        
        <DialogActions sx={{ 
          p: isMobile ? 2 : 3,
          pt: 0,
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 1 : 0
        }}>
          <Button 
            onClick={handleCloseDialog}
            variant="outlined"
            fullWidth={isMobile}
            size={isMobile ? "medium" : "small"}
            sx={{ 
              borderRadius: 2,
              order: isMobile ? 2 : 1
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCloseDialog}
            fullWidth={isMobile}
            size={isMobile ? "medium" : "small"}
            sx={{
              bgcolor: theme.palette.primary.main,
              borderRadius: 2,
              order: isMobile ? 1 : 2
            }}
          >
            {selectedClient ? 'Update Client' : 'Create Client'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default AdminDashboard;