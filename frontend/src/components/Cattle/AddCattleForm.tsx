import React, { useState } from 'react';
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
  Grid,
  Typography,
  Divider,
} from '@mui/material';
import { cattleAPI } from '../../services/api';
import ImageUpload from '../Common/ImageUpload';
import type { CattleFormData, Cattle } from '../../types';

interface AddCattleFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (cattle: Cattle) => void;
}

const AddCattleForm: React.FC<AddCattleFormProps> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CattleFormData>({
    breed: '',
    age: 0,
    identification_number: '',
    gender: 'female',
    weight: undefined,
    metadata: {},
    image: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.breed.trim()) {
      newErrors.breed = 'Breed is required';
    }

    if (!formData.identification_number.trim()) {
      newErrors.identification_number = 'Identification number is required';
    }

    if (formData.age <= 0) {
      newErrors.age = 'Age must be greater than 0';
    }

    if (formData.age > 25) {
      newErrors.age = 'Age must be realistic (max 25 years)';
    }

    if (formData.weight && formData.weight <= 0) {
      newErrors.weight = 'Weight must be greater than 0';
    }

    if (formData.weight && formData.weight > 2000) {
      newErrors.weight = 'Weight must be realistic (max 2000 kg)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CattleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSubmitError('');

    try {
      const response = await cattleAPI.create(formData);
      const newCattle = response.data;
      
      onSuccess(newCattle);
      handleClose();
    } catch (error: any) {
      console.error('Error creating cattle:', error);
      
      if (error.response?.data?.error) {
        setSubmitError(error.response.data.error);
      } else if (error.response?.data?.identification_number) {
        setSubmitError('You already have cattle with this identification number.');
      } else if (error.response?.data?.image) {
        setSubmitError(`Image error: ${error.response.data.image[0]}`);
      } else {
        setSubmitError('Failed to create cattle profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      breed: '',
      age: 0,
      identification_number: '',
      gender: 'female',
      weight: undefined,
      metadata: {},
      image: null,
    });
    setErrors({});
    setSubmitError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Cattle</DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Breed"
                value={formData.breed}
                onChange={(e) => handleInputChange('breed', e.target.value)}
                error={!!errors.breed}
                helperText={errors.breed}
                placeholder="e.g., Holstein, Angus, Jersey"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Identification Number"
                value={formData.identification_number}
                onChange={(e) => handleInputChange('identification_number', e.target.value)}
                error={!!errors.identification_number}
                helperText={errors.identification_number}
                placeholder="e.g., H001, A123"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Age (years)"
                type="number"
                value={formData.age || ''}
                onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                error={!!errors.age}
                helperText={errors.age}
                inputProps={{ min: 0, max: 25 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={formData.gender}
                  label="Gender"
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                >
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="male">Male</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Weight (kg)"
                type="number"
                value={formData.weight || ''}
                onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || undefined)}
                error={!!errors.weight}
                helperText={errors.weight || 'Optional'}
                inputProps={{ min: 0, max: 2000, step: 0.1 }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Cattle Image (Optional)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Adding a photo helps veterinarians identify your cattle during consultations.
          </Typography>

          <ImageUpload
            value={formData.image}
            onChange={(file) => handleInputChange('image', file)}
            onError={(error) => setSubmitError(error)}
            label="Upload Cattle Photo"
            helperText="JPEG, PNG, WebP formats supported. Max 5MB. This is optional."
            disabled={loading}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Adding...' : 'Add Cattle'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddCattleForm;