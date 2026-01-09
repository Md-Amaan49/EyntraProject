import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Timeline,
  Assessment,
  GetApp,
  FilterList,
  ArrowBack,
} from '@mui/icons-material';
import { cattleAPI } from '../../services/api';
import { Cattle, HealthFilters as HealthFiltersType } from '../../types';
import HealthTimeline from './HealthTimeline';
import HealthAnalytics from './HealthAnalytics';
import HealthExport from './HealthExport';
import HealthFilters from './HealthFilters';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`health-tabpanel-${index}`}
      aria-labelledby={`health-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const HealthHistoryPage: React.FC = () => {
  const { cattleId } = useParams<{ cattleId: string }>();
  const navigate = useNavigate();
  const [cattle, setCattle] = useState<Cattle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState<HealthFiltersType>({
    dateRange: {
      start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      end: new Date(),
    },
    eventTypes: [],
    severity: [],
  });

  useEffect(() => {
    if (cattleId) {
      loadCattleData();
    }
  }, [cattleId]);

  const loadCattleData = async () => {
    if (!cattleId) return;

    try {
      setLoading(true);
      setError('');
      
      const response = await cattleAPI.get(cattleId);
      setCattle(response.data);
    } catch (err: any) {
      console.error('Failed to load cattle data:', err);
      setError('Failed to load cattle information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFiltersChange = (newFilters: HealthFiltersType) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    // Filters are automatically applied through the filters prop
    // This could trigger a refresh or analytics update if needed
  };

  const handleClearFilters = () => {
    setFilters({
      dateRange: {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      eventTypes: [],
      severity: [],
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !cattle) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error || 'Cattle not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body1"
          onClick={() => navigate('/dashboard')}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <ArrowBack fontSize="small" />
          Dashboard
        </Link>
        <Typography color="text.primary">
          Health History - {cattle.identification_number}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Health History
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {cattle.identification_number} • {cattle.breed} • {cattle.gender} • {cattle.age} years old
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Current Status: {cattle.health_status.replace('_', ' ').toUpperCase()}
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <HealthFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onApplyFilters={handleApplyFilters}
          onClearFilters={handleClearFilters}
        />
      </Box>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="health history tabs">
            <Tab
              icon={<Timeline />}
              label="Timeline"
              id="health-tab-0"
              aria-controls="health-tabpanel-0"
            />
            <Tab
              icon={<Assessment />}
              label="Analytics"
              id="health-tab-1"
              aria-controls="health-tabpanel-1"
            />
            <Tab
              icon={<GetApp />}
              label="Export"
              id="health-tab-2"
              aria-controls="health-tabpanel-2"
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <HealthTimeline cattleId={cattle.id} filters={filters} />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <HealthAnalytics />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <HealthExport cattle={cattle} />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default HealthHistoryPage;