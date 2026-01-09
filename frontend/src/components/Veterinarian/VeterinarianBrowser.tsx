import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Chip,
  InputAdornment,
  Pagination,
  Slider,
  Switch,
  FormControlLabel,
  Paper,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Search,
  FilterList,
  LocalHospital,
  Warning,
  LocationOn,
  ReportProblem,
  AccessTime,
  Clear,
  Verified,
} from '@mui/icons-material';
import EmergencyConfirmationDialog from '../Emergency/EmergencyConfirmationDialog';
import { veterinarianAPI } from '../../services/api';
import type { Veterinarian, VeterinarianFilters } from '../../types';
import VeterinarianCard from './VeterinarianCard';

interface VeterinarianBrowserProps {
  onSelectVeterinarian?: (vet: Veterinarian) => void;
  showBookingButton?: boolean;
  cattleId?: string;
}

const VeterinarianBrowser: React.FC<VeterinarianBrowserProps> = ({
  onSelectVeterinarian,
  showBookingButton = true,
  cattleId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<VeterinarianFilters>({
    availability: 'all',
    maxDistance: 50,
    emergencyOnly: false,
    minRating: 0,
    maxFee: 1000,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [selectedVetForEmergency, setSelectedVetForEmergency] = useState<Veterinarian | null>(null);
  
  // Location state
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  // Available specializations
  const specializations = [
    { value: 'general', label: 'General Practice' },
    { value: 'surgery', label: 'Surgery' },
    { value: 'reproduction', label: 'Reproduction' },
    { value: 'nutrition', label: 'Nutrition' },
    { value: 'emergency', label: 'Emergency Care' },
    { value: 'preventive', label: 'Preventive Medicine' },
    { value: 'infectious', label: 'Infectious Diseases' },
    { value: 'dairy', label: 'Dairy Cattle' },
    { value: 'beef', label: 'Beef Cattle' },
  ];

  useEffect(() => {
    // Get user's location
    getUserLocation();
    // Load veterinarians with initial data
    loadVeterinarians();
  }, []);

  useEffect(() => {
    // Reload when filters change (with debounce)
    const timeoutId = setTimeout(() => {
      loadVeterinarians();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [filters, page, userLocation]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError('');
          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('Unable to get your location. Showing all veterinarians.');
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  };

  const loadVeterinarians = async () => {
    try {
      setLoading(true);
      setError('');

      const params: any = {
        page,
        search: searchQuery || undefined,
      };
      
      // Add location parameters if available
      if (userLocation) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
        params.radius = filters.maxDistance;
      }
      
      // Add other filters
      if (filters.specialization) {
        params.specialization = filters.specialization;
      }
      if (filters.emergencyOnly) {
        params.emergency_only = true;
      }
      if (filters.availability === 'available') {
        params.available_only = true;
      }

      let response;
      
      // Use appropriate API endpoint based on whether we have location
      if (userLocation) {
        response = await veterinarianAPI.findNearby(params);
      } else {
        response = await veterinarianAPI.list(params);
      }

      let data = response.data;

      // Handle different response formats
      if (data && typeof data === 'object') {
        if ('veterinarians' in data) {
          setVeterinarians(data.veterinarians || []);
          setTotalPages(Math.ceil((data.total_found || 0) / 10));
        } else if ('results' in data) {
          setVeterinarians(data.results || []);
          setTotalPages(Math.ceil((data.count || 0) / (data.page_size || 10)));
        } else {
          setVeterinarians(Array.isArray(data) ? data : []);
          setTotalPages(1);
        }
      } else {
        setVeterinarians(Array.isArray(data) ? data : []);
        setTotalPages(1);
      }
      
      // Apply client-side filters for better UX
      let filteredVets = veterinarians.filter((vet) => {
        // Rating filter
        if (filters.minRating > 0 && (vet.average_rating || 0) < filters.minRating) {
          return false;
        }
        
        // Fee filter - check minimum consultation fee
        const fees = [
          vet.consultation_fees.chat || 0,
          vet.consultation_fees.voice || 0,
          vet.consultation_fees.video || 0
        ].filter(fee => fee > 0);
        
        const minFee = fees.length > 0 ? Math.min(...fees) : 0;
        if (minFee > filters.maxFee) {
          return false;
        }
        
        return true;
      });
      
      // Sort by distance if available, then by rating
      filteredVets.sort((a, b) => {
        if (a.distance_km && b.distance_km) {
          return a.distance_km - b.distance_km;
        }
        return (b.average_rating || 0) - (a.average_rating || 0);
      });
      
      setVeterinarians(filteredVets);
      
    } catch (err: any) {
      console.error('Error loading veterinarians:', err);
      
      // Provide more specific error messages
      if (err.response?.status === 404) {
        setError('No veterinarians found in your area. Try expanding your search radius.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to load veterinarians. Please check your connection and try again.');
      }
      
      setVeterinarians([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadVeterinarians();
  };

  const handleFilterChange = (field: keyof VeterinarianFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ 
      availability: 'all',
      maxDistance: 50,
      emergencyOnly: false,
      minRating: 0,
      maxFee: 1000,
    });
    setSearchQuery('');
    setPage(1);
  };

  const getLocationStatusMessage = () => {
    if (locationLoading) {
      return { type: 'info', message: 'Getting your location...' };
    }
    if (locationError) {
      return { type: 'warning', message: locationError };
    }
    if (userLocation) {
      return { type: 'success', message: 'Using your current location for nearby search' };
    }
    return null;
  };

  const locationStatus = getLocationStatusMessage();

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">
            Find Veterinarians
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Connect with qualified veterinarians in your area for professional cattle care
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="error"
          size="large"
          startIcon={<Warning />}
          onClick={() => setEmergencyMode(!emergencyMode)}
          sx={{
            fontWeight: 'bold',
            animation: emergencyMode ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.8 },
              '100%': { opacity: 1 },
            },
          }}
        >
          {emergencyMode ? 'Exit Emergency Mode' : 'Emergency Consultation'}
        </Button>
      </Box>

      {locationStatus && (
        <Alert 
          severity={locationStatus.type as any} 
          sx={{ mb: 2 }}
          action={
            locationError && (
              <Button color="inherit" size="small" onClick={getUserLocation}>
                Retry
              </Button>
            )
          }
        >
          {locationStatus.message}
        </Alert>
      )}

      {emergencyMode && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning />
            <Typography fontWeight="bold">
              EMERGENCY MODE ACTIVE
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 1 }}>
            You are in emergency consultation mode. Available veterinarians will be prioritized for immediate response.
            Emergency fees apply.
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search Bar */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search by name or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Location Filter */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Location"
              placeholder={userLocation ? 'Using current location' : 'Enter city or area'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Badge 
                      color={userLocation ? 'success' : 'default'} 
                      variant="dot"
                    >
                      <LocationOn />
                    </Badge>
                  </InputAdornment>
                ),
              }}
              disabled={locationLoading}
            />
          </Grid>

          {/* Specialization Filter */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Specialization</InputLabel>
              <Select
                value={filters.specialization || ''}
                onChange={(e) => handleFilterChange('specialization', e.target.value || undefined)}
                label="Specialization"
              >
                <MenuItem value="">All Specializations</MenuItem>
                {specializations.map((spec) => (
                  <MenuItem key={spec.value} value={spec.value}>
                    {spec.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Search Button */}
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleSearch}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <Search />}
              sx={{ height: 56 }}
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </Grid>
        </Grid>
        
        {/* Advanced Filters */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
            Advanced Filters
          </Typography>
          
          <Grid container spacing={2}>
            {/* Distance Slider */}
            <Grid item xs={12} md={3}>
              <Typography variant="body2" gutterBottom>
                Max Distance: {filters.maxDistance} km
              </Typography>
              <Slider
                value={filters.maxDistance}
                onChange={(_, value) => handleFilterChange('maxDistance', value)}
                min={5}
                max={200}
                step={5}
                marks={[
                  { value: 5, label: '5km' },
                  { value: 50, label: '50km' },
                  { value: 200, label: '200km' },
                ]}
                disabled={!userLocation}
              />
            </Grid>
            
            {/* Rating Filter */}
            <Grid item xs={12} md={3}>
              <Typography variant="body2" gutterBottom>
                Min Rating: {filters.minRating} stars
              </Typography>
              <Slider
                value={filters.minRating}
                onChange={(_, value) => handleFilterChange('minRating', value)}
                min={0}
                max={5}
                step={0.5}
                marks={[
                  { value: 0, label: 'Any' },
                  { value: 3, label: '3★' },
                  { value: 5, label: '5★' },
                ]}
              />
            </Grid>
            
            {/* Fee Filter */}
            <Grid item xs={12} md={3}>
              <Typography variant="body2" gutterBottom>
                Max Fee: ₹{filters.maxFee}
              </Typography>
              <Slider
                value={filters.maxFee}
                onChange={(_, value) => handleFilterChange('maxFee', value)}
                min={100}
                max={2000}
                step={50}
                marks={[
                  { value: 100, label: '₹100' },
                  { value: 500, label: '₹500' },
                  { value: 2000, label: '₹2000' },
                ]}
              />
            </Grid>
            
            {/* Toggle Filters */}
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.emergencyOnly}
                    onChange={(e) => handleFilterChange('emergencyOnly', e.target.checked)}
                  />
                }
                label={
                  <Box display="flex" alignItems="center">
                    <ReportProblem sx={{ mr: 0.5, fontSize: 16 }} />
                    Emergency Available
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.availability === 'available'}
                    onChange={(e) => handleFilterChange('availability', e.target.checked ? 'available' : 'all')}
                  />
                }
                label={
                  <Box display="flex" alignItems="center">
                    <AccessTime sx={{ mr: 0.5, fontSize: 16 }} />
                    Available Today
                  </Box>
                }
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={clearFilters}
              size="small"
            >
              Clear Filters
            </Button>
            <Chip
              label={`${veterinarians.length} veterinarian${veterinarians.length !== 1 ? 's' : ''} found`}
              color="primary"
              variant="outlined"
            />
            {userLocation && (
              <Chip
                label={`Within ${filters.maxDistance}km`}
                color="success"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        </Box>
      </Paper>

      {/* Results */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Finding veterinarians...</Typography>
        </Box>
      ) : veterinarians.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <LocalHospital sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No veterinarians found
          </Typography>
          <Typography color="text.secondary" paragraph>
            {searchQuery || filters.specialization || filters.emergencyOnly
              ? 'Try adjusting your search criteria or expanding your search radius.'
              : 'No veterinarians are currently available in your area.'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => {
                clearFilters();
                setSearchQuery('');
              }}
            >
              Reset Search
            </Button>
            {!userLocation && (
              <Button
                variant="contained"
                onClick={getUserLocation}
                startIcon={<LocationOn />}
              >
                Enable Location
              </Button>
            )}
          </Box>
        </Paper>
      ) : (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {veterinarians.length} Veterinarian{veterinarians.length !== 1 ? 's' : ''} Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Page {page} of {totalPages}
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {veterinarians.map((vet) => (
              <Grid item xs={12} md={6} lg={4} key={vet.id}>
                <VeterinarianCard
                  veterinarian={vet}
                  onSelect={onSelectVeterinarian}
                  showBookingButton={showBookingButton}
                  cattleId={cattleId}
                  emergencyMode={emergencyMode}
                  onEmergencyBook={(veterinarian) => {
                    setSelectedVetForEmergency(veterinarian);
                    setEmergencyDialogOpen(true);
                  }}
                  showDistance={!!userLocation}
                />
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}

      {/* Emergency Confirmation Dialog */}
      <EmergencyConfirmationDialog
        open={emergencyDialogOpen}
        onClose={() => {
          setEmergencyDialogOpen(false);
          setSelectedVetForEmergency(null);
        }}
        onConfirm={() => {
          // Handle emergency booking confirmation
          if (selectedVetForEmergency) {
            // Navigate to emergency booking form or start immediate consultation
            alert(`Emergency consultation with Dr. ${selectedVetForEmergency.user?.name || 'Unknown'} confirmed!`);
          }
          setEmergencyDialogOpen(false);
          setSelectedVetForEmergency(null);
        }}
        emergencyType="consultation"
        emergencyFee={selectedVetForEmergency?.consultation_fees.video ? selectedVetForEmergency.consultation_fees.video * 2 : 400}
        estimatedResponseTime="5-10 minutes"
        veterinarianName={selectedVetForEmergency?.user?.name || 'Unknown'}
      />
    </Box>
  );
};

export default VeterinarianBrowser;