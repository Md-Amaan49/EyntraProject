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
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Send,
  Psychology,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cattleAPI, healthAPI, aiAPI } from '../../services/api';
import { Cattle, DiseasePrediction, TreatmentRecommendations } from '../../types';

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
  });
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [predictions, setPredictions] = useState<DiseasePrediction[]>([]);
  const [treatments, setTreatments] = useState<TreatmentRecommendations | null>(null);

  useEffect(() => {
    loadCattle();
  }, []);

  const loadCattle = async () => {
    try {
      const response = await cattleAPI.list();
      setCattle(response.data);
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
    if (images.length + files.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }
    setImages([...images, ...files]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Submit symptoms to backend
      const response = await healthAPI.submitSymptoms({
        ...formData,
        images,
      });

      setSuccess('Symptoms submitted successfully!');
      
      // Get AI predictions
      await getPredictions();
      
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Failed to submit symptoms. Please try again.'
      );
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
          {success}
        </Alert>
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
                    {cattle.map((animal) => (
                      <MenuItem key={animal.id} value={animal.id}>
                        {animal.breed} - {animal.identification_number}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {images.map((image, index) => (
                      <Chip
                        key={index}
                        label={image.name}
                        onDelete={() => removeImage(index)}
                        deleteIcon={<Delete />}
                      />
                    ))}
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
    </Box>
  );
};

export default SymptomSubmissionForm;