import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Checkbox,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ReportProblem,
  Warning,
  AccessTime,
  MonetizationOn,
  LocalHospital,
  Phone,
} from '@mui/icons-material';
import EmergencyFlag from './EmergencyFlag';

interface EmergencyConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  emergencyType?: 'consultation' | 'symptom_report' | 'general';
  emergencyFee?: number;
  estimatedResponseTime?: string;
  veterinarianName?: string;
}

const EmergencyConfirmationDialog: React.FC<EmergencyConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  emergencyType = 'consultation',
  emergencyFee = 200,
  estimatedResponseTime = '5-10 minutes',
  veterinarianName,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [understoodFees, setUnderstoodFees] = useState(false);

  const handleConfirm = () => {
    if (acknowledged && understoodFees) {
      onConfirm();
      // Reset state for next time
      setAcknowledged(false);
      setUnderstoodFees(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setAcknowledged(false);
    setUnderstoodFees(false);
  };

  const getEmergencyTitle = () => {
    switch (emergencyType) {
      case 'consultation':
        return 'Emergency Veterinary Consultation';
      case 'symptom_report':
        return 'Emergency Symptom Report';
      default:
        return 'Emergency Request';
    }
  };

  const getEmergencyDescription = () => {
    switch (emergencyType) {
      case 'consultation':
        return 'You are requesting an emergency veterinary consultation. This will prioritize your case and connect you with an available veterinarian immediately.';
      case 'symptom_report':
        return 'You are submitting an emergency symptom report. This will be flagged as high priority and reviewed immediately by our veterinary team.';
      default:
        return 'You are making an emergency request that will be prioritized for immediate attention.';
    }
  };

  const emergencyProcedures = [
    {
      icon: <AccessTime />,
      title: 'Immediate Priority',
      description: `Your request will be processed within ${estimatedResponseTime}`,
    },
    {
      icon: <LocalHospital />,
      title: 'Veterinary Response',
      description: veterinarianName 
        ? `Dr. ${veterinarianName} will handle your case`
        : 'Next available veterinarian will be assigned',
    },
    {
      icon: <Phone />,
      title: 'Direct Contact',
      description: 'You may receive a direct call for urgent clarification',
    },
    {
      icon: <MonetizationOn />,
      title: 'Emergency Fee',
      description: `Additional emergency fee of ₹${emergencyFee} applies`,
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          border: '2px solid',
          borderColor: 'error.main',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <ReportProblem color="error" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" color="error" fontWeight="bold">
              {getEmergencyTitle()}
            </Typography>
            <EmergencyFlag
              isEmergency={true}
              severity="critical"
              variant="chip"
              size="small"
            />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight="medium">
            ⚠️ EMERGENCY CONSULTATION NOTICE
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {getEmergencyDescription()}
          </Typography>
        </Alert>

        <Typography variant="h6" gutterBottom>
          Emergency Procedure:
        </Typography>

        <List>
          {emergencyProcedures.map((procedure, index) => (
            <ListItem key={index} sx={{ py: 1 }}>
              <ListItemIcon>
                {procedure.icon}
              </ListItemIcon>
              <ListItemText
                primary={procedure.title}
                secondary={procedure.description}
              />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Important:</strong> Emergency consultations are for urgent health issues that require immediate veterinary attention. 
            Non-emergency cases may be redirected to regular consultation slots.
          </Typography>
        </Alert>

        <Box sx={{ mt: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                color="error"
              />
            }
            label={
              <Typography variant="body2">
                I acknowledge this is a genuine emergency requiring immediate veterinary attention
              </Typography>
            }
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={understoodFees}
                onChange={(e) => setUnderstoodFees(e.target.checked)}
                color="error"
              />
            }
            label={
              <Typography variant="body2">
                I understand the emergency fee of ₹{emergencyFee} will be charged in addition to consultation fees
              </Typography>
            }
          />
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            By proceeding, you confirm that this is a genuine emergency. Misuse of emergency services may result in account restrictions.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          size="large"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          size="large"
          disabled={!acknowledged || !understoodFees}
          startIcon={<ReportProblem />}
          sx={{
            fontWeight: 'bold',
            minWidth: 200,
          }}
        >
          Confirm Emergency Request
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmergencyConfirmationDialog;