import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Button,
  Avatar,
} from '@mui/material';
import {
  MoreVert,
  Edit,
  LocalHospital,
  History,
  Male,
  Female,
  Pets,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Cattle } from '../../types';
import EditCattleForm from './EditCattleForm';
import QuickSymptomReport from '../Health/QuickSymptomReport';

interface CattleCardProps {
  cattle: Cattle;
  onUpdate?: () => void;
}

const CattleCard: React.FC<CattleCardProps> = ({ cattle, onUpdate }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [quickReportOpen, setQuickReportOpen] = useState(false);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
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

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Cattle Image */}
      {cattle.image_url ? (
        <CardMedia
          component="img"
          height="200"
          image={cattle.image_url}
          alt={`${cattle.breed} - ${cattle.identification_number}`}
          sx={{ objectFit: 'cover' }}
        />
      ) : (
        <Box
          sx={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.100',
            color: 'grey.400',
          }}
        >
          <Pets sx={{ fontSize: 60 }} />
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" component="h3" gutterBottom>
              {cattle.breed}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ID: {cattle.identification_number}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleMenuClick}>
            <MoreVert />
          </IconButton>
        </Box>

        <Box display="flex" alignItems="center" gap={1} mb={2}>
          {cattle.gender === 'male' ? (
            <Male color="primary" fontSize="small" />
          ) : (
            <Female color="secondary" fontSize="small" />
          )}
          <Typography variant="body2">
            {cattle.age} years old
          </Typography>
          {cattle.weight && (
            <Typography variant="body2" color="text.secondary">
              • {cattle.weight} kg
            </Typography>
          )}
        </Box>

        <Chip
          label={getHealthStatusLabel(cattle.health_status)}
          color={getHealthStatusColor(cattle.health_status) as any}
          size="small"
        />

        <Typography variant="caption" display="block" color="text.secondary" mt={2}>
          Added {new Date(cattle.created_at).toLocaleDateString()}
        </Typography>
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            setEditDialogOpen(true);
            handleMenuClose();
          }}
        >
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            setQuickReportOpen(true);
            handleMenuClose();
          }}
        >
          <LocalHospital fontSize="small" sx={{ mr: 1 }} />
          Quick Report
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigate(`/health/submit?cattle=${cattle.id}`);
            handleMenuClose();
          }}
        >
          <LocalHospital fontSize="small" sx={{ mr: 1 }} />
          Full Report
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigate(`/health/history/${cattle.id}`);
            handleMenuClose();
          }}
        >
          <History fontSize="small" sx={{ mr: 1 }} />
          Health History
        </MenuItem>
      </Menu>

      <EditCattleForm
        open={editDialogOpen}
        cattle={cattle}
        onClose={() => setEditDialogOpen(false)}
        onSuccess={(updatedCattle) => {
          setEditDialogOpen(false);
          if (onUpdate) {
            onUpdate();
          }
        }}
      />

      <QuickSymptomReport
        open={quickReportOpen}
        cattle={cattle}
        onClose={() => setQuickReportOpen(false)}
        onSuccess={() => {
          if (onUpdate) {
            onUpdate();
          }
        }}
      />
    </Card>
  );
};

export default CattleCard;