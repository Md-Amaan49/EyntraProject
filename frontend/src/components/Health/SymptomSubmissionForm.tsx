import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Paper,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Send,
  Psychology,
  Warning,
  LocalHospital,
  CheckCircle,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cattleAPI, healthAPI, aiAPI, consultationAPI } from '../../services/api';
import { Cattle, DiseasePrediction, TreatmentRecommendations } from '../../types';
import EmergencyFlag from '../Emergency/EmergencyFlag';
import EmergencyConfirmationDialog from '../Emergency/EmergencyConfirmationDialog';

const SymptomSubmissionForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCattleId = searchParams.get('cattle');

  const [cattle, setCattle] = useState<Cattle[]>([]);
  const [formData, setFormData] = useState({
    cattle_id: preselectedCattleId || '',
    symptoms: '',
    severity: 'moderate',
    additional_notes: '',
    is_emergency: false,
  });
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [predictions, setPredictions] = useState<DiseasePrediction[]>([]);
  const [treatments, setTreatments] = useState<TreatmentRecommendations | null>(null);
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [notificationResult, setNotificationResult] = useState<any>(null);
  const [showVetNotification, setShowVetNotification] = useState(false);

  useEffect(() => {
    loadCattle();
  }, []);

  const loadCattle = async () => {
    try {
      const response = await cattleAPI.list();
      let cattleData = response.data;
      
      // Handle paginated response
      if (cattleData && typeof cattleData === 'object' && 'results' in cattleData) {
        cattleData = cattleData.results;
      }
      
      setCattle(Array.isArray(cattleData) ? cattleData : []);
    } catch (err) {
      setError('Failed to load cattle list');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate number of files
    if (images.length + files.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not a valid image file`);
        return;
      }
      if (file.size > maxSize) {
        setError(`${file.name} is too large (max 10MB)`);
        return;
      }
      validFiles.push(file);
    }

    setImages([...images, ...validFiles]);
    setError(''); // Clear any previous errors
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!formData.cattle_id) {
      setError('Please select a cattle');
      return false;
    }
    if (!formData.symptoms.trim()) {
      setError('Please describe the symptoms');
      return false;
    }
    if (formData.symptoms.trim().length < 10) {
      setError('Symptom description must be at least 10 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get selected cattle for location information
      const selectedCattle = cattle.find(c => c.id === formData.cattle_id);
      
      // Get AI predictions first if we have symptoms
      let aiPredictions: DiseasePrediction[] = [];
      if (formData.symptoms.trim()) {
        try {
          setPredicting(true);
          
          // Convert images to base64 for AI service
          const imagePromises = images.map(image => {
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(image);
            });
          });
          const imageBase64 = await Promise.all(imagePromises);

          // Get AI predictions
          const aiResponse = await aiAPI.predict({
            symptoms: formData.symptoms,
            images: imageBase64,
            cattle_metadata: selectedCattle ? {
              breed: selectedCattle.breed,
              age: selectedCattle.age,
              gender: selectedCattle.gender,
              weight: selectedCattle.weight,
            } : undefined,
          });

          aiPredictions = aiResponse.data.predictions || [];
          setPredictions(aiPredictions);
        } catch (aiErr) {
          console.error('AI prediction error:', aiErr);
          // Continue without AI predictions
        } finally {
          setPredicting(false);
        }
      }

      // Submit symptom report with veterinary notification
      const symptomReportData = {
        cattle_id: formData.cattle_id,
        symptoms: formData.symptoms,
        severity: formData.severity,
        is_emergency: formData.is_emergency,
        ai_predictions: aiPredictions,
        location: {
          // Use cattle owner's location or default coordinates
          latitude: 12.9716, // Default to Bangalore coordinates
          longitude: 77.5946,
          address: 'Location not specified'
        }
      };

      const response = await consultationAPI.submitSymptomReport(symptomReportData);
      
      setNotificationResult(response.data);
      setShowVetNotification(true);
      setSuccess('Symptoms submitted successfully! Veterinarians have been notified.');
      
      // Get treatment recommendations if we have predictions
      if (aiPredictions.length > 0) {
        try {
          const treatmentResponse = await healthAPI.getTreatmentRecommendations({
            disease_predictions: aiPredictions,
            cattle_metadata: selectedCattle ? {
              breed: selectedCattle.breed,
              age: selectedCattle.age,
              gender: selectedCattle.gender,
              weight: selectedCattle.weight,
            } : undefined,
            preference: 'balanced',
          });

          setTreatments(treatmentResponse.data.recommendations);
        } catch (treatmentErr) {
          console.error('Treatment recommendation error:', treatmentErr);
        }
      }
      
    } catch (err: any) {
      console.error('Symptom submission error:', err);
      
      if (err.response?.data?.symptoms) {
        setError('Symptom description is too short (minimum 10 characters)');
      } else if (err.response?.data?.cattle_id) {
        setError('Please select a valid cattle');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to submit symptoms. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPredictions = async () => {
    if (!formData.symptoms.trim()) return;

    setPredicting(true);
    try {
      // Get selected cattle metadata
      const selectedCattle = cattle.find(c => c.id === formData.cattle_id);
      const cattleMetadata = selectedCattle ? {
        breed: selectedCattle.breed,
        age: selectedCattle.age,
        gender: selectedCattle.gender,
        weight: selectedCattle.weight,
      } : undefined;

      // Convert images to base64 for AI service
      const imagePromises = images.map(image => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(image);
        });
      });
      const imageBase64 = await Promise.all(imagePromises);

      // Get AI predictions
      const aiResponse = await aiAPI.predict({
        symptoms: formData.symptoms,
        images: imageBase64,
        cattle_metadata: cattleMetadata,
      });

      setPredictions(aiResponse.data.predictions || []);

      // Get treatment recommendations
      if (aiResponse.data.predictions?.length > 0) {
        const treatmentResponse = await healthAPI.getTreatmentRecommendations({
          disease_predictions: aiResponse.data.predictions,
          cattle_metadata: cattleMetadata,
          preference: 'balanced',
        });

        setTreatments(treatmentResponse.data.recommendations);
      }

    } catch (err: any) {
      console.error('Prediction error:', err);
      // Don't show error for AI predictions as it's optional
      setError('Symptoms submitted, but AI analysis is currently unavailable.');
    } finally {
      setPredicting(false);
    }
  };

  const selectedCattle = cattle.find(c => c.id === formData.cattle_id);

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Report Cattle Symptoms
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography>{success}</Typography>
            <Box display="flex" gap={1}>
              <Button 
                size="small" 
                onClick={() => {
                  setFormData({
                    cattle_id: '',
                    symptoms: '',
                    severity: 'moderate',
                    additional_notes: '',
                    is_emergency: false,
                  });
                  setImages([]);
                  setPredictions([]);
                  setTreatments(null);
                  setNotificationResult(null);
                  setShowVetNotification(false);
                  setSuccess('');
                }}
              >
                Report Another
              </Button>
              <Button 
                size="small" 
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </Button>
            </Box>
          </Box>
        </Alert>
      )}

      {/* Veterinary Notification Result */}
      {showVetNotification && notificationResult && (
        <Card sx={{ mb: 3, border: '2px solid', borderColor: 'success.main' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <LocalHospital color="success" />
              <Typography variant="h6" color="success.main">
                Veterinarians Notified Successfully
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Case Priority
                  </Typography>
                  <Chip 
                    label={notificationResult.consultation_request?.priority?.toUpperCase() || 'NORMAL'}
                    color={
                      notificationResult.consultation_request?.priority === 'emergency' ? 'error' :
                      notificationResult.consultation_request?.priority === 'urgent' ? 'warning' : 'success'
                    }
                    icon={notificationResult.consultation_request?.priority === 'emergency' ? <Warning /> : <CheckCircle />}
                  />
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, bgcolor: 'info.50' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Request Status
                  </Typography>
                  <Typography variant="body2">
                    {notificationResult.consultation_request?.status === 'pending' ? 
                      'Waiting for veterinarian response' : 
                      notificationResult.consultation_request?.status
                    }
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {formData.is_emergency ? 
                  'Emergency veterinarians have been notified and will respond as soon as possible. You may receive a call or message shortly.' :
                  'Nearby veterinarians have been notified of your case. You will be contacted when a veterinarian accepts your consultation request.'
                }
              </Typography>
            </Alert>

            <Box display="flex" gap={2} mt={2}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/consultations')}
              >
                View My Requests
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/veterinarians')}
              >
                Find Veterinarians
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Select Cattle</InputLabel>
                  <Select
                    name="cattle_id"
                    value={formData.cattle_id}
                    onChange={(e) => setFormData({ ...formData, cattle_id: e.target.value })}
                    label="Select Cattle"
                  >
                    {cattle.length === 0 ? (
                      <MenuItem disabled>
                        No cattle registered. Please add cattle first.
                      </MenuItem>
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
                
                {cattle.length === 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      You need to register cattle before reporting symptoms.{' '}
                      <Button 
                        size="small" 
                        onClick={() => navigate('/dashboard')}
                        sx={{ textTransform: 'none' }}
                      >
                        Go to Dashboard to Add Cattle
                      </Button>
                    </Typography>
                  </Alert>
                )}
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Describe Symptoms"
                  name="symptoms"
                  value={formData.symptoms}
                  onChange={handleChange}
                  required
                  helperText="Describe what you've observed (minimum 10 characters)"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    name="severity"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    label="Severity"
                  >
                    <MenuItem value="mild">Mild</MenuItem>
                    <MenuItem value="moderate">Moderate</MenuItem>
                    <MenuItem value="severe">Severe</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.is_emergency}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEmergencyDialogOpen(true);
                        } else {
                          setFormData({ ...formData, is_emergency: false });
                        }
                      }}
                      color="error"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Warning color="error" fontSize="small" />
                      <Typography color="error" fontWeight="medium">
                        Mark as Emergency
                      </Typography>
                    </Box>
                  }
                />
                {formData.is_emergency && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      Emergency case - This will notify all available veterinarians immediately
                    </Typography>
                  </Alert>
                )}
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Additional Notes (Optional)"
                  name="additional_notes"
                  value={formData.additional_notes}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Upload Images (Optional, max 5)
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  disabled={images.length >= 5}
                  sx={{ mb: 2 }}
                >
                  Upload Images
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </Button>

                {images.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {images.length} image{images.length > 1 ? 's' : ''} selected
                    </Typography>
                    <Box display="flex" gap={2} flexWrap="wrap">
                      {images.map((image, index) => (
                        <Box key={index} sx={{ position: 'relative' }}>
                          <Paper 
                            sx={{ 
                              p: 1, 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              maxWidth: 200 
                            }}
                          >
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`Preview ${index + 1}`}
                              style={{
                                width: 40,
                                height: 40,
                                objectFit: 'cover',
                                borderRadius: 4,
                              }}
                            />
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography variant="caption" noWrap>
                                {image.name}
                              </Typography>
                              <Typography variant="caption" display="block" color="text.secondary">
                                {(image.size / 1024 / 1024).toFixed(1)} MB
                              </Typography>
                            </Box>
                            <Button
                              size="small"
                              onClick={() => removeImage(index)}
                              sx={{ minWidth: 'auto', p: 0.5 }}
                            >
                              <Delete fontSize="small" />
                            </Button>
                          </Paper>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" gap={2}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <Send />}
                    disabled={loading || !formData.cattle_id || !formData.symptoms.trim()}
                  >
                    {loading ? 'Submitting...' : 'Submit Symptoms'}
                  </Button>
                  
                  {formData.symptoms.trim() && (
                    <Button
                      variant="outlined"
                      startIcon={predicting ? <CircularProgress size={20} /> : <Psychology />}
                      onClick={getPredictions}
                      disabled={predicting}
                    >
                      {predicting ? 'Analyzing...' : 'Get AI Analysis'}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* AI Predictions */}
      {predictions.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AI Disease Predictions
            </Typography>
            {predictions.map((prediction, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {prediction.diseaseName}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {prediction.description}
                </Typography>
                <Box display="flex" gap={1} alignItems="center">
                  <Chip
                    label={`${prediction.confidenceScore.toFixed(1)}% confidence`}
                    color={prediction.confidenceScore > 70 ? 'success' : prediction.confidenceScore > 40 ? 'warning' : 'error'}
                    size="small"
                  />
                  <Chip
                    label={prediction.severityLevel}
                    color={prediction.severityLevel === 'high' || prediction.severityLevel === 'critical' ? 'error' : 'warning'}
                    size="small"
                  />
                </Box>
              </Paper>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Treatment Recommendations */}
      {treatments && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Treatment Recommendations
            </Typography>
            
            {treatments.veterinary_consultation.recommended && (
              <Alert 
                severity={treatments.veterinary_consultation.urgency === 'emergency' ? 'error' : 'warning'} 
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle2">
                  Veterinary Consultation Recommended ({treatments.veterinary_consultation.urgency})
                </Typography>
                <Typography variant="body2">
                  {treatments.veterinary_consultation.message}
                </Typography>
              </Alert>
            )}

            <Grid container spacing={3}>
              {treatments.traditional.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Traditional Treatments
                  </Typography>
                  {treatments.traditional.map((treatment, index) => (
                    <Paper key={index} sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {treatment.name}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        {treatment.description}
                      </Typography>
                      <Typography variant="caption" display="block">
                        <strong>Dosage:</strong> {treatment.dosage}
                      </Typography>
                      <Typography variant="caption" display="block">
                        <strong>Duration:</strong> {treatment.duration}
                      </Typography>
                    </Paper>
                  ))}
                </Grid>
              )}

              {treatments.allopathic.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Modern Treatments
                  </Typography>
                  {treatments.allopathic.map((treatment, index) => (
                    <Paper key={index} sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {treatment.name}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        {treatment.description}
                      </Typography>
                      <Typography variant="caption" display="block">
                        <strong>Dosage:</strong> {treatment.dosage}
                      </Typography>
                      <Typography variant="caption" display="block">
                        <strong>Duration:</strong> {treatment.duration}
                      </Typography>
                      {treatment.requires_prescription && (
                        <Chip label="Prescription Required" color="warning" size="small" sx={{ mt: 1 }} />
                      )}
                    </Paper>
                  ))}
                </Grid>
              )}
            </Grid>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {treatments.disclaimer}
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Emergency Confirmation Dialog */}
      <Dialog open={emergencyDialogOpen} onClose={() => setEmergencyDialogOpen(false)}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="error" />
            <Typography variant="h6" color="error">
              Mark as Emergency Case
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            By marking this as an emergency case:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <li>All available veterinarians will be notified immediately</li>
            <li>Your case will be prioritized in the consultation queue</li>
            <li>Emergency consultation fees will apply</li>
            <li>You may be able to start a consultation immediately</li>
          </Box>
          <Alert severity="warning">
            <Typography variant="body2">
              Only mark as emergency if your cattle requires immediate veterinary attention 
              (e.g., severe injury, difficulty breathing, inability to stand, etc.)
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmergencyDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              setFormData({ ...formData, is_emergency: true });
              setEmergencyDialogOpen(false);
            }}
            color="error"
            variant="contained"
          >
            Confirm Emergency
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SymptomSubmissionForm;