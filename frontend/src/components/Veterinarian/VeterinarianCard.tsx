import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Avatar,
  Rating,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Star,
  Schedule,
  LocalHospital,
  School,
  VideoCall,
  Chat,
  ReportProblem,
  Call,
  Info,
} from '@mui/icons-material';
import EmergencyFlag from '../Emergency/EmergencyFlag';
import type { Veterinarian } from '../../types';
import BookingForm from './BookingForm';

interface VeterinarianCardProps {
  veterinarian: Veterinarian;
  onSelect?: (vet: Veterinarian) => void;
  showBookingButton?: boolean;
  cattleId?: string;
  emergencyMode?: boolean;
  onEmergencyBook?: (vet: Veterinarian) => void;
  showDistance?: boolean;
}

const VeterinarianCard: React.FC<VeterinarianCardProps> = ({
  veterinarian,
  onSelect,
  showBookingButton = true,
  emergencyMode = false,
  onEmergencyBook,
  cattleId,
  showDistance = false,
}) => {

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedConsultationType, setSelectedConsultationType] = useState<'chat' | 'voice' | 'video'>('chat');

  const getAvailabilityStatus = () => {
    if (veterinarian.is_available) {
      return { label: 'Available Now', color: 'success' as const };
    } else {
      return { label: 'Unavailable', color: 'error' as const };
    }
  };

  const handleBookConsultation = (type: 'chat' | 'voice' | 'video') => {
    setSelectedConsultationType(type);
    setBookingOpen(true);
  };

  const handleViewProfile = () => {
    setDetailsOpen(true);
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect(veterinarian);
    }
  };

  const availabilityStatus = getAvailabilityStatus();

  return (
    <>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          {/* Header */}
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <LocalHospital />
            </Avatar>
            <Box flexGrow={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6" component="h3">
                  Dr. {veterinarian.user?.name || 'Unknown'}
                </Typography>
                {emergencyMode && (
                  <EmergencyFlag
                    isEmergency={true}
                    severity="high"
                    variant="chip"
                    size="small"
                    customText="EMERGENCY"
                  />
                )}
              </Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Rating value={veterinarian.average_rating || 0} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">
                  {(veterinarian.average_rating || 0).toFixed(1)} ({veterinarian.total_consultations || 0} consultations)
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip 
                  label={availabilityStatus.label} 
                  color={availabilityStatus.color} 
                  size="small" 
                />
                {showDistance && veterinarian.distance_km && (
                  <Chip 
                    label={`${veterinarian.distance_km.toFixed(1)} km away`} 
                    size="small" 
                    variant="outlined"
                    color="info"
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Specializations */}
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              Specializations:
            </Typography>
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {(veterinarian.specializations || []).slice(0, 3).map((spec, index) => (
                <Chip key={index} label={spec} size="small" variant="outlined" />
              ))}
              {(veterinarian.specializations || []).length > 3 && (
                <Chip 
                  label={`+${(veterinarian.specializations || []).length - 3} more`} 
                  size="small" 
                  variant="outlined" 
                  color="primary"
                />
              )}
            </Box>
          </Box>

          {/* Experience */}
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <School fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {veterinarian.years_experience || 0} years of experience
            </Typography>
          </Box>

          {/* Consultation Fees */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Consultation Fees:
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip 
                icon={<Chat />} 
                label={`Chat: ₹${veterinarian.consultation_fees.chat || 0}`} 
                size="small" 
                variant="outlined"
              />
              <Chip 
                icon={<Call />} 
                label={`Voice: ₹${veterinarian.consultation_fees.voice || 0}`} 
                size="small" 
                variant="outlined"
              />
              <Chip 
                icon={<VideoCall />} 
                label={`Video: ₹${veterinarian.consultation_fees.video || 0}`} 
                size="small" 
                variant="outlined"
              />
            </Box>
          </Box>
        </CardContent>

        <Divider />

        <CardActions sx={{ p: 2 }}>
          {emergencyMode && (
            <Button
              size="small"
              variant="contained"
              color="error"
              onClick={() => onEmergencyBook?.(veterinarian)}
              startIcon={<ReportProblem />}
              disabled={!veterinarian.is_available}
              fullWidth
              sx={{
                fontWeight: 'bold',
                mb: 1,
                animation: 'pulse 1.5s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.8 },
                  '100%': { opacity: 1 },
                },
              }}
            >
              Emergency Consultation
            </Button>
          )}
          
          <Button 
            size="small" 
            onClick={handleViewProfile}
            startIcon={<Info />}
          >
            View Profile
          </Button>
          
          {showBookingButton && !emergencyMode && (
            <>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleBookConsultation('chat')}
                startIcon={<Chat />}
                disabled={!veterinarian.is_available}
              >
                Chat
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => handleBookConsultation('video')}
                startIcon={<VideoCall />}
                disabled={!veterinarian.is_available}
              >
                Video Call
              </Button>
            </>
          )}

          {onSelect && (
            <Button
              size="small"
              variant="contained"
              onClick={handleSelect}
              fullWidth
            >
              Select
            </Button>
          )}
        </CardActions>
      </Card>

      {/* Detailed Profile Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <LocalHospital />
            </Avatar>
            <Box>
              <Typography variant="h6">Dr. {veterinarian.user?.name || 'Unknown'}</Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Rating value={veterinarian.average_rating || 0} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">
                  {(veterinarian.average_rating || 0).toFixed(1)} stars
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          <List>
            <ListItem>
              <ListItemIcon>
                <School />
              </ListItemIcon>
              <ListItemText
                primary="Experience"
                secondary={`${veterinarian.years_experience || 0} years in veterinary practice`}
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <LocalHospital />
              </ListItemIcon>
              <ListItemText
                primary="License Number"
                secondary={veterinarian.license_number || 'Not available'}
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Star />
              </ListItemIcon>
              <ListItemText
                primary="Consultations Completed"
                secondary={`${veterinarian.total_consultations || 0} successful consultations`}
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Schedule />
              </ListItemIcon>
              <ListItemText
                primary="Availability"
                secondary={
                  veterinarian.is_available 
                    ? "Available for immediate consultation"
                    : "Currently unavailable"
                }
              />
            </ListItem>

            {showDistance && veterinarian.distance_km && (
              <ListItem>
                <ListItemIcon>
                  <Info />
                </ListItemIcon>
                <ListItemText
                  primary="Distance"
                  secondary={`${veterinarian.distance_km.toFixed(1)} km from your location`}
                />
              </ListItem>
            )}
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" gutterBottom>
            Specializations:
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
            {(veterinarian.specializations || []).map((spec, index) => (
              <Chip key={index} label={spec} size="small" />
            ))}
          </Box>

          <Typography variant="subtitle1" gutterBottom>
            Consultation Options & Fees:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <Chat />
              </ListItemIcon>
              <ListItemText
                primary={`Text Chat - ₹${veterinarian.consultation_fees.chat || 0}`}
                secondary="Real-time messaging with image sharing"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Call />
              </ListItemIcon>
              <ListItemText
                primary={`Voice Call - ₹${veterinarian.consultation_fees.voice || 0}`}
                secondary="Audio consultation for detailed discussion"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <VideoCall />
              </ListItemIcon>
              <ListItemText
                primary={`Video Call - ₹${veterinarian.consultation_fees.video || 0}`}
                secondary="Face-to-face consultation with visual examination"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ReportProblem />
              </ListItemIcon>
              <ListItemText
                primary={`Emergency - ₹${(veterinarian.consultation_fees.video || 0) * 2}`}
                secondary="Priority consultation for urgent cases"
              />
            </ListItem>
          </List>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
          {showBookingButton && veterinarian.is_available && (
            <Button
              variant="contained"
              onClick={() => {
                setDetailsOpen(false);
                handleBookConsultation('video');
              }}
            >
              Book Consultation
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Booking Form Dialog */}
      {bookingOpen && (
        <BookingForm
          open={bookingOpen}
          veterinarian={veterinarian}
          consultationType={selectedConsultationType}
          cattleId={cattleId}
          onClose={() => setBookingOpen(false)}
          onSuccess={() => {
            setBookingOpen(false);
            // Could navigate to consultation or show success message
          }}
        />
      )}
    </>
  );
};

export default VeterinarianCard;