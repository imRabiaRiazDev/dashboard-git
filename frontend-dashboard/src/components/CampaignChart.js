// CampaignChart.js - Modernized with better visualization
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Grid,
  useTheme,
  alpha
} from '@mui/material';

// Enhanced chart component with better styling
const ModernChart = ({ data, type }) => {
  const theme = useTheme();
  
  if (!data || data.length === 0) {
    return (
      <Box sx={{ 
        height: 300, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: theme.palette.text.secondary
      }}>
        <Typography variant="h6" color="textSecondary" sx={{ mb: 1 }}>
          No data available
        </Typography>
        <Typography variant="caption">
          Sync your campaigns to see performance data
        </Typography>
      </Box>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const colors = [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.info.main];
  
  return (
    <Box sx={{ height: 300, position: 'relative' }}>
      {/* Grid lines */}
      <Box sx={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        zIndex: 0
      }}>
        {[0, 25, 50, 75, 100].map((percent) => (
          <Box
            key={percent}
            sx={{
              borderBottom: '1px dashed',
              borderColor: alpha(theme.palette.divider, 0.3),
              width: '100%',
              position: 'relative',
              '&::after': {
                content: `"${percent}%"`,
                position: 'absolute',
                right: -30,
                top: -8,
                fontSize: '0.75rem',
                color: theme.palette.text.secondary
              }
            }}
          />
        ))}
      </Box>
      
      {/* Bars */}
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'flex-end', 
        gap: 2, 
        p: 3,
        position: 'relative',
        zIndex: 1
      }}>
        {data.map((item, index) => (
          <Box
            key={index}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%'
            }}
          >
            <Box
              sx={{
                width: '70%',
                height: `${(item.value / maxValue) * 100}%`,
                bgcolor: `linear-gradient(180deg, ${colors[index % colors.length]} 0%, ${alpha(colors[index % colors.length], 0.7)} 100%)`,
                background: `linear-gradient(180deg, ${colors[index % colors.length]} 0%, ${alpha(colors[index % colors.length], 0.7)} 100%)`,
                borderRadius: '8px 8px 0 0',
                position: 'relative',
                transition: 'height 0.5s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: `0 10px 25px -5px ${alpha(colors[index % colors.length], 0.4)}`
                }
              }}
            >
              <Box sx={{
                position: 'absolute',
                top: -30,
                left: '50%',
                transform: 'translateX(-50%)',
                bgcolor: colors[index % colors.length],
                color: 'white',
                px: 1.5,
                py: 0.5,
                borderRadius: 4,
                fontSize: '0.75rem',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}>
                {item.value.toLocaleString()}
              </Box>
            </Box>
            <Typography 
              variant="caption" 
              sx={{ 
                mt: 1, 
                fontWeight: 600,
                color: theme.palette.text.primary,
                fontSize: '0.8rem'
              }}
            >
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const CampaignChart = () => {
  const [chartType, setChartType] = useState('bar');
  const [timeRange, setTimeRange] = useState('7d');
  const [performanceData, setPerformanceData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    fetchChartData();
  }, [timeRange]);

  const fetchChartData = async () => {
    try {
      // Mock data for now
      const mockPerformanceData = [
        { label: 'Mon', value: 4200 },
        { label: 'Tue', value: 3800 },
        { label: 'Wed', value: 3200 },
        { label: 'Thu', value: 4100 },
        { label: 'Fri', value: 2900 },
        { label: 'Sat', value: 3500 },
        { label: 'Sun', value: 4800 }
      ];
      
      const mockStatusData = [
        { label: 'Active', value: 65, color: '#10b981' },
        { label: 'Paused', value: 20, color: '#f59e0b' },
        { label: 'Stopped', value: 15, color: '#ef4444' }
      ];
      
      setPerformanceData(mockPerformanceData);
      setStatusData(mockStatusData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        width: '100%', 
        height: 400, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Typography>Loading chart data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 3,
        gap: 2
      }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
            Campaign Performance
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Daily impressions and engagement metrics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={(e, newValue) => newValue && setTimeRange(newValue)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                borderRadius: 2,
                borderColor: theme.palette.divider,
                px: 2,
                '&.Mui-selected': {
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark
                  }
                }
              }
            }}
          >
            <ToggleButton value="7d">7D</ToggleButton>
            <ToggleButton value="30d">30D</ToggleButton>
            <ToggleButton value="90d">90D</ToggleButton>
          </ToggleButtonGroup>
          
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={(e, newValue) => newValue && setChartType(newValue)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                borderRadius: 2,
                borderColor: theme.palette.divider,
                px: 2,
                '&.Mui-selected': {
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark
                  }
                }
              }
            }}
          >
            <ToggleButton value="line">Line</ToggleButton>
            <ToggleButton value="bar">Bar</ToggleButton>
            <ToggleButton value="area">Area</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ 
            p: 3, 
            height: '100%',
            minHeight: 350,
            borderRadius: 3,
            bgcolor: 'white',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <ModernChart data={performanceData} type={chartType} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ 
            p: 3, 
            height: '100%',
            minHeight: 350,
            borderRadius: 3,
            bgcolor: 'white',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#1e293b' }}>
              Campaign Status
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 3, display: 'block' }}>
              Distribution of campaign statuses
            </Typography>
            <Box sx={{ mt: 3 }}>
              {statusData.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      bgcolor: item.color,
                      borderRadius: '50%',
                      mr: 2,
                      boxShadow: `0 2px 4px ${alpha(item.color, 0.3)}`
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b' }}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {item.value} campaigns
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="600" sx={{ color: '#1e293b' }}>
                    {item.value}%
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CampaignChart;