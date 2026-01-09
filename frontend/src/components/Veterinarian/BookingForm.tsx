import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Payment,
  Warning,
  VideoCall,
  Chat,
  Call,
  ReportProblem,
  CreditCard,
  AccountBalance,
  Phone as PhoneIcon,
} from '@mui/icons-material';
// Date picker imports removed to avoid dependency issues
import { cattleAPI, consultationAPI, veterinarianAPI } from '../../services/api';
import type { Veterinarian, Cattle, BookingData, Consultation } from '../../types';

interface BookingFormProps {
  open: boolean;
  veterinarian: Veterinarian;
  consultationType: 'chat' | 'voice' | 'video';
  cattleId?: string;
  onClose: () => void;
  onSuccess: (consultation: Consultation) => void;
}

const BookingForm: React.FC<BookingFormProps> = ({
  open,
  veterinarian,
  consultationType,
  cattleId,
  onClose,
  onSuccess,
}) => {
  const [cattle, setCattle] = useState<Cattle[]>([]);
  const [formData, setFormData] = useState<Partial<BookingData>>({
    veterinarianId: veterinarian.id,
    cattleId: cattleId || '',
    consultationType,
    scheduledTime: new Date(),
    isEmergency: false,
    caseDescription: '',
    paymentMethod: 'card',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Details, 2: Payment, 3: Confirmation

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (open) {
      loadCattle();
      loadAvailableSlots();
    }
  }, [open]);

  useEffect(() => {
    if (formData.scheduledTime) {
      loadAvailableSlots();
    }
  }, [formData.scheduledTime]);

  const loadAvailableSlots = async () => {
    if (!formData.scheduledTime) return;
    
    try {
      setLoadingSlots(true);
      const date = new Date(formData.scheduledTime).toISOString().split('T')[0];
      const response = await veterinarianAPI.getAvailability(veterinarian.id, date);
      setAvailableSlots(response.data.available_slots || []);
    } catch (err) {
      console.error('Error loading available slots:', err);
      // Continue without slot validation if API fails
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const loadCattle = async () => {
    try {
      const response = await cattleAPI.list();
      let cattleData = response.data;
      
      if (cattleData && typeof cattleData === 'object' && 'results' in cattleData) {
        cattleData = cattleData.results;
      }
      
      setCattle(Array.isArray(cattleData) ? cattleData : []);
    } catch (err) {
      console.error('Error loading cattle:', err);
      setError('Failed to load cattle list');
    }
  };

  const getConsultationFee = () => {
    let baseFee = 0;
    
    switch (consultationType) {
      case 'chat':
        baseFee = veterinarian.consultation_fees.chat || 0;
        break;
      case 'voice':
        baseFee = veterinarian.consultation_fees.voice || 0;
        break;
      case 'video':
        baseFee = veterinarian.consultation_fees.video || 0;
        break;
    }
    
    if (formData.isEmergency) {
      const multiplier = 2; // Default emergency multiplier
      return baseFee * multiplier;
    }
    
    return baseFee;
  };

  const getConsultationIcon = () => {
    switch (consultationType) {
      case 'chat': return <Chat />;
      case 'voice': return <Call />;
      case 'video': return <VideoCall />;
      default: return <Chat />;
    }
  };

  const validateForm = () => {
    if (!formData.cattleId) {
      setError('Please select a cattle');
      return false;
    }
    if (!formData.caseDescription?.trim()) {
      setError('Please describe the case');
      return false;
    }
    if (formData.caseDescription.trim().length < 10) {
      setError('Case description must be at least 10 characters');
      return false;
    }
    if (!formData.scheduledTime) {
      setError('Please select a consultation time');
      return false;
    }
    
    const selectedTime = new Date(formData.scheduledTime);
    const now = new Date();
    
    // Check if time is in the future
    if (selectedTime <= now) {
      setError('Consultation time must be in the future');
      return false;
    }
    
    // Check if time is too far in the future (e.g., more than 30 days)
    const maxFutureDate = new Date();
    maxFutureDate.setDate(maxFutureDate.getDate() + 30);
    if (selectedTime > maxFutureDate) {
      setError('Consultation cannot be scheduled more than 30 days in advance');
      return false;
    }
    
    // Check if time is within working hours (8 AM to 8 PM)
    const hour = selectedTime.getHours();
    if (hour < 8 || hour > 20) {
      setError('Consultations are only available between 8:00 AM and 8:00 PM');
      return false;
    }
    
    // For emergency consultations, allow more flexible timing
    if (!formData.isEmergency) {
      // Check if it's not too soon (at least 1 hour from now for regular consultations)
      const minTime = new Date();
      minTime.setHours(minTime.getHours() + 1);
      if (selectedTime < minTime) {
        setError('Regular consultations must be scheduled at least 1 hour in advance. For immediate consultation, please select Emergency option.');
        return false;
      }
    }
    
    // Check veterinarian availability
    if (!veterinarian.is_available && !formData.isEmergency) {
      setError('This veterinarian is currently unavailable for regular consultations. You may try emergency consultation if urgent.');
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateForm()) {
        setStep(2);
        setError('');
      }
    } else if (step === 2) {
      if (!formData.paymentMethod) {
        setError('Please select a payment method');
        return;
      }
      setStep(3);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const bookingData: any = {
        veterinarian_id: veterinarian.id,
        cattle_id: formData.cattleId!,
        consultation_type: consultationType,
        scheduled_time: new Date(formData.scheduledTime!).toISOString(),
        is_emergency: formData.isEmergency || false,
        case_description: formData.caseDescription!,
        payment_method: formData.paymentMethod!,
        total_fee: getConsultationFee(),
        consultation_fee: consultationType === 'chat' ? veterinarian.consultation_fees.chat :
                         consultationType === 'voice' ? veterinarian.consultation_fees.voice :
                         veterinarian.consultation_fees.video,
        emergency_fee: formData.isEmergency ? getConsultationFee() - (
          consultationType === 'chat' ? veterinarian.consultation_fees.chat :
          consultationType === 'voice' ? veterinarian.consultation_fees.voice :
          veterinarian.consultation_fees.video
        ) : 0,
      };

      const response = await consultationAPI.book(bookingData);
      const consultation = response.data;

      // Show success message
      setStep(4); // Success step
      
      // Auto-close after 3 seconds and call success callback
      setTimeout(() => {
        onSuccess(consultation);
        handleClose();
      }, 3000);
      
    } catch (err: any) {
      console.error('Booking error:', err);
      
      // Handle specific error cases
      if (err.response?.status === 400) {
        if (err.response.data?.error?.includes('payment')) {
          setError('Payment processing failed. Please check your payment details and try again.');
        } else if (err.response.data?.error?.includes('schedule')) {
          setError('The selected time slot is no longer available. Please choose a different time.');
        } else if (err.response.data?.error?.includes('veterinarian')) {
          setError('The veterinarian is currently unavailable. Please try again later or select a different veterinarian.');
        } else {
          setError(err.response.data?.error || 'Invalid booking details. Please check your information and try again.');
        }
      } else if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to book consultations. Please contact support.');
      } else if (err.response?.status === 409) {
        setError('There is a scheduling conflict. Please choose a different time slot.');
      } else if (err.response?.status >= 500) {
        setError('Server error occurred. Please try again in a few minutes.');
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        setError('Network connection error. Please check your internet connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again or contact support if the problem persists.');
      }
      
      // For payment errors, go back to payment step
      if (err.response?.data?.error?.includes('payment')) {
        setStep(2);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      veterinarianId: veterinarian.id,
      cattleId: cattleId || '',
      consultationType,
      scheduledTime: new Date(),
      isEmergency: false,
      caseDescription: '',
      paymentMethod: 'card',
    });
    setError('');
    onClose();
  };

  const selectedCattle = cattle.find(c => c.id === formData.cattleId);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            {getConsultationIcon()}
            <Box>
              <Typography variant="h6">
                Book {consultationType.charAt(0).toUpperCase() + consultationType.slice(1)} Consultation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                with Dr. {veterinarian.user?.name || 'Unknown'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Step 1: Consultation Details */}
          {step === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Consultation Details
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Select Cattle</InputLabel>
                    <Select
                      value={formData.cattleId || ''}
                      onChange={(e) => setFormData({ ...formData, cattleId: e.target.value })}
                      label="Select Cattle"
                    >
                      {cattle.length === 0 ? (
                        <MenuItem disabled>No cattle registered</MenuItem>
                      ) : (
                        cattle.map((animal) => (
                          <MenuItem key={animal.id} value={animal.id}>
                            <Box>
                              <Typography variant="body1">
                                {animal.breed} - {animal.identification_number}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {animal.age} years old • {animal.gender} • Status: {animal.health_status.replace('_', ' ')}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Preferred Consultation Time"
                    type="datetime-local"
                    value={formData.scheduledTime ? formData.scheduledTime.toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      scheduledTime: e.target.value ? new Date(e.target.value) : new Date() 
                    })}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: formData.isEmergency 
                        ? new Date().toISOString().slice(0, 16) // Emergency can be immediate
                        : new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), // Regular: 1 hour from now
                      max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16) // 30 days from now
                    }}
                    helperText={
                      formData.isEmergency 
                        ? "Emergency consultations can start immediately"
                        : "Regular consultations must be scheduled at least 1 hour in advance"
                    }
                    required
                  />
                  {loadingSlots && (
                    <Box display="flex" alignItems="center" gap={1} mt={1}>
                      <CircularProgress size={16} />
                      <Typography variant="caption" color="text.secondary">
                        Checking availability...
                      </Typography>
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Case Description"
                    value={formData.caseDescription || ''}
                    onChange={(e) => setFormData({ ...formData, caseDescription: e.target.value })}
                    placeholder="Describe the symptoms, concerns, or reason for consultation..."
                    helperText="Minimum 10 characters required"
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.isEmergency || false}
                        onChange={(e) => setFormData({ ...formData, isEmergency: e.target.checked })}
                        color="error"
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Warning color="error" fontSize="small" />
                        <Typography color="error" fontWeight="medium">
                          Emergency Consultation
                        </Typography>
                      </Box>
                    }
                  />
                  {formData.isEmergency && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      <Typography variant="body2" fontWeight="medium" gutterBottom>
                        Emergency Consultation - Priority Service
                      </Typography>
                      <Typography variant="body2">
                        • Immediate veterinarian notification<br/>
                        • Priority scheduling (can start within 5-10 minutes)<br/>
                        • Emergency fee: ₹{getConsultationFee()} (includes {((2) * 100 - 100).toFixed(0)}% emergency surcharge)<br/>
                        • Available 24/7 for critical cases
                      </Typography>
                    </Alert>
                  )}
                  
                  {!veterinarian.is_available && !formData.isEmergency && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        This veterinarian is currently unavailable for regular consultations. 
                        You can still book an emergency consultation if this is urgent.
                      </Typography>
                    </Alert>
                  )}
                  
                  {!veterinarian.is_emergency_available && formData.isEmergency && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        This veterinarian is not currently available for emergency consultations. 
                        Please try a different veterinarian or schedule a regular consultation.
                      </Typography>
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Step 2: Payment Method */}
          {step === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Payment Information
              </Typography>

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Consultation Summary
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Veterinarian"
                        secondary={`Dr. ${veterinarian.user?.name || 'Unknown'}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Consultation Type"
                        secondary={consultationType.charAt(0).toUpperCase() + consultationType.slice(1)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Cattle"
                        secondary={selectedCattle ? `${selectedCattle.breed} - ${selectedCattle.identification_number}` : 'Not selected'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Scheduled Time"
                        secondary={formData.scheduledTime ? new Date(formData.scheduledTime).toLocaleString() : 'Not selected'}
                      />
                    </ListItem>
                    {formData.isEmergency && (
                      <ListItem>
                        <ListItemIcon>
                          <ReportProblem color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Emergency Consultation"
                          secondary="Priority scheduling with immediate availability"
                        />
                      </ListItem>
                    )}
                  </List>
                  <Divider sx={{ my: 2 }} />
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                      Total Fee:
                    </Typography>
                    <Typography variant="h6" color="primary">
                      ₹{getConsultationFee()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              <Typography variant="subtitle1" gutterBottom>
                Select Payment Method
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer', 
                      border: formData.paymentMethod === 'card' ? 2 : 1,
                      borderColor: formData.paymentMethod === 'card' ? 'primary.main' : 'divider'
                    }}
                    onClick={() => setFormData({ ...formData, paymentMethod: 'card' })}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <CreditCard color={formData.paymentMethod === 'card' ? 'primary' : 'action'} sx={{ mb: 1 }} />
                      <Typography variant="body2">Credit/Debit Card</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer', 
                      border: formData.paymentMethod === 'upi' ? 2 : 1,
                      borderColor: formData.paymentMethod === 'upi' ? 'primary.main' : 'divider'
                    }}
                    onClick={() => setFormData({ ...formData, paymentMethod: 'upi' })}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <PhoneIcon color={formData.paymentMethod === 'upi' ? 'primary' : 'action'} sx={{ mb: 1 }} />
                      <Typography variant="body2">UPI Payment</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer', 
                      border: formData.paymentMethod === 'netbanking' ? 2 : 1,
                      borderColor: formData.paymentMethod === 'netbanking' ? 'primary.main' : 'divider'
                    }}
                    onClick={() => setFormData({ ...formData, paymentMethod: 'netbanking' })}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <AccountBalance color={formData.paymentMethod === 'netbanking' ? 'primary' : 'action'} sx={{ mb: 1 }} />
                      <Typography variant="body2">Net Banking</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Confirm Booking
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Please review your booking details before confirming. Payment will be processed immediately.
                </Typography>
              </Alert>

              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Booking Summary
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Veterinarian"
                        secondary={`Dr. ${veterinarian.user?.name || 'Unknown'} (${veterinarian.years_experience || 0} years experience)`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Consultation"
                        secondary={`${consultationType.charAt(0).toUpperCase() + consultationType.slice(1)} consultation${formData.isEmergency ? ' (Emergency)' : ''}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Cattle"
                        secondary={selectedCattle ? `${selectedCattle.breed} - ${selectedCattle.identification_number}` : 'Not selected'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Scheduled Time"
                        secondary={formData.scheduledTime ? new Date(formData.scheduledTime).toLocaleString() : 'Not selected'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Payment Method"
                        secondary={formData.paymentMethod?.toUpperCase()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Total Amount"
                        secondary={`₹${getConsultationFee()}`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Box>
          )}
          {/* Step 4: Success */}
          {step === 4 && (
            <Box textAlign="center" py={4}>
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <VideoCall sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Typography variant="h5" gutterBottom color="success.main">
                  Booking Confirmed!
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Your consultation has been successfully booked with Dr. {veterinarian.user?.name || 'Unknown'}.
                </Typography>
              </Box>

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Consultation Details
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Consultation ID"
                        secondary="Will be provided via email and SMS"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Scheduled Time"
                        secondary={formData.scheduledTime ? new Date(formData.scheduledTime).toLocaleString() : 'Not selected'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Type"
                        secondary={`${consultationType.charAt(0).toUpperCase() + consultationType.slice(1)} consultation${formData.isEmergency ? ' (Emergency)' : ''}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Amount Paid"
                        secondary={`₹${getConsultationFee()}`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  You will receive confirmation details via email and SMS. 
                  {formData.isEmergency 
                    ? ' The veterinarian will contact you within 5-10 minutes for emergency consultation.'
                    : ' Please join the consultation at the scheduled time.'
                  }
                </Typography>
              </Alert>

              <Typography variant="body2" color="text.secondary">
                This dialog will close automatically in a few seconds...
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          {step < 4 && (
            <>
              <Button onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              
              {step > 1 && (
                <Button onClick={() => setStep(step - 1)} disabled={loading}>
                  Back
                </Button>
              )}
              
              {step < 3 ? (
                <Button 
                  onClick={handleNext} 
                  variant="contained"
                  disabled={loading}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  variant="contained" 
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <Payment />}
                >
                  {loading ? 'Processing Payment...' : `Pay ₹${getConsultationFee()} & Book`}
                </Button>
              )}
            </>
          )}
          
          {step === 4 && (
            <Button onClick={handleClose} variant="contained">
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
  );
};

export default BookingForm;