import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  Avatar,
  Divider,
  Grid,
  Alert,
  CircularProgress,
  Button,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Pets,
  Male,
  Female,
  ExpandMore,
  ExpandLess,
  LocalHospital,
  Person,
  Phone,
  LocationOn,
} from '@mui/icons-material';
import { cattleAPI } from '../../services/api';
import { Cattle } from '../../types';

interface CattleInfoPanelProps {
  cattleId: string;
  showOwnerInfo?: boolean;
  compact?: boolean;
}

const CattleInfoPanel: React.FC<CattleInfoPanelProps> = ({ 
  cattleId, 
  showOwnerInfo = true, 
  compact = false 
}) => {
  const [cattle, setCattle] = useState<Cattle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    loadCattleInfo();
  }, [cattleId]);

  const loadCattleInfo = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await cattleAPI.get(cattleId);
      setCattle(response.data);
    } catch (err: any) {
      console.error('Failed to load cattle info:', err);
      setError('Failed to load cattle information');
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'sick':
        return 'error';
      case 'under_treatment':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getHealthStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'sick':
        return 'Sick';
      case 'under_treatment':
        return 'Under Treatment';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 1 }}>
          Loading cattle information...
        </Typography>
      </Box>
    );
  }

  if (error || !cattle) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error || 'Cattle information not available'}
      </Alert>
    );
  }

  return (
    <Card sx={{ mb: 2 }}>
      {/* Cattle Image */}
      {cattle.image_url ? (
        <CardMedia
          component="img"
          height={compact ? "120" : "200"}
          image={cattle.image_url}
          alt={`${cattle.breed} - ${cattle.identification_number}`}
          sx={{ objectFit: 'cover' }}
        />
      ) : (
        <Box
          sx={{
            height: compact ? 120 : 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.100',
            color: 'grey.400',
          }}
        >
          <Pets sx={{ fontSize: compact ? 40 : 60 }} />
        </Box>
      )}

      <CardContent>
        {/* Header with expand/collapse for compact mode */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box>
            <Typography variant={compact ? "subtitle1" : "h6"} component="h3">
              {cattle.breed}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ID: {cattle.identification_number}
              {showOwnerInfo && cattle.owner_name && (
                <> • Owner: {cattle.owner_name}</>
              )}
            </Typography>
          </Box>
          
          {compact && (
            <IconButton
              onClick={() => setExpanded(!expanded)}
              size="small"
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </Box>

        <Collapse in={expanded}>
          {/* Basic Info */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Box display="flex" alignItems="center" gap={1}>
                {cattle.gender === 'male' ? (
                  <Male color="primary" fontSize="small" />
                ) : (
                  <Female color="secondary" fontSize="small" />
                )}
                <Typography variant="body2">
                  {cattle.age} years old
                </Typography>
              </Box>
            </Grid>
            
            {cattle.weight && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Weight: {cattle.weight} kg
                </Typography>
              </Grid>
            )}
          </Grid>

          {/* Health Status */}
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <LocalHospital fontSize="small" color="action" />
            <Chip
              label={getHealthStatusLabel(cattle.health_status)}
              color={getHealthStatusColor(cattle.health_status) as any}
              size="small"
            />
          </Box>

          {/* Owner Information */}
          {showOwnerInfo && cattle.owner_name && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Owner Information
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Person fontSize="small" color="action" />
                  <Typography variant="body2">
                    {cattle.owner_name}
                  </Typography>
                </Box>
                {/* Add more owner details if available */}
              </Box>
            </>
          )}

          {/* Additional Metadata */}
          {cattle.metadata && Object.keys(cattle.metadata).length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Additional Information
                </Typography>
                {Object.entries(cattle.metadata).map(([key, value]) => (
                  <Typography key={key} variant="body2" color="text.secondary">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {String(value)}
                  </Typography>
                ))}
              </Box>
            </>
          )}

          {/* Registration Date */}
          <Typography variant="caption" display="block" color="text.secondary" mt={2}>
            Registered: {new Date(cattle.created_at).toLocaleDateString()}
          </Typography>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default CattleInfoPanel;