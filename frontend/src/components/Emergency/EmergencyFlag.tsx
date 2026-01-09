import React from 'react';
import {
  Box,
  Chip,
  Alert,
  Typography,
  Paper,
} from '@mui/material';
import {
  ReportProblem,
  Warning,
  LocalHospital,
} from '@mui/icons-material';

interface EmergencyFlagProps {
  isEmergency: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  variant?: 'chip' | 'alert' | 'banner';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showText?: boolean;
  customText?: string;
}

const EmergencyFlag: React.FC<EmergencyFlagProps> = ({
  isEmergency,
  severity = 'high',
  variant = 'chip',
  size = 'medium',
  showIcon = true,
  showText = true,
  customText,
}) => {
  if (!isEmergency) return null;

  const getEmergencyColor = () => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'error';
    }
  };

  const getEmergencyIcon = () => {
    switch (severity) {
      case 'critical':
        return <ReportProblem />;
      case 'high':
        return <ReportProblem />;
      case 'medium':
        return <Warning />;
      case 'low':
        return <LocalHospital />;
      default:
        return <ReportProblem />;
    }
  };

  const getEmergencyText = () => {
    if (customText) return customText;
    
    switch (severity) {
      case 'critical':
        return 'CRITICAL EMERGENCY';
      case 'high':
        return 'EMERGENCY';
      case 'medium':
        return 'URGENT';
      case 'low':
        return 'Priority';
      default:
        return 'EMERGENCY';
    }
  };

  const getSizeProps = () => {
    switch (size) {
      case 'small':
        return { fontSize: '0.75rem', padding: '2px 6px' };
      case 'large':
        return { fontSize: '1rem', padding: '8px 16px' };
      default:
        return { fontSize: '0.875rem', padding: '4px 12px' };
    }
  };

  if (variant === 'chip') {
    return (
      <Chip
        icon={showIcon ? getEmergencyIcon() : undefined}
        label={showText ? getEmergencyText() : ''}
        color={getEmergencyColor() as any}
        size={size === 'large' ? 'medium' : 'small'}
        sx={{
          fontWeight: 'bold',
          animation: severity === 'critical' ? 'pulse 1.5s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.7 },
            '100%': { opacity: 1 },
          },
        }}
      />
    );
  }

  if (variant === 'alert') {
    return (
      <Alert
        severity={getEmergencyColor() as any}
        icon={showIcon ? getEmergencyIcon() : false}
        sx={{
          fontWeight: 'bold',
          animation: severity === 'critical' ? 'pulse 1.5s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.8 },
            '100%': { opacity: 1 },
          },
        }}
      >
        {showText && getEmergencyText()}
      </Alert>
    );
  }

  if (variant === 'banner') {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 2,
          bgcolor: severity === 'critical' ? 'error.main' : 'warning.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          animation: severity === 'critical' ? 'pulse 1.5s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.8 },
            '100%': { opacity: 1 },
          },
        }}
      >
        {showIcon && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {getEmergencyIcon()}
          </Box>
        )}
        {showText && (
          <Typography
            variant={size === 'large' ? 'h6' : size === 'small' ? 'body2' : 'body1'}
            fontWeight="bold"
          >
            {getEmergencyText()}
          </Typography>
        )}
      </Paper>
    );
  }

  return null;
};

export default EmergencyFlag;