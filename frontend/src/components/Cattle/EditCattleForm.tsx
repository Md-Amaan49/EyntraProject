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
  Grid,
  Typography,
  Divider,
} from '@mui/material';
import { cattleAPI } from '../../services/api';
import ImageUpload from '../Common/ImageUpload';
import type { Cattle, CattleFormData } from '../../types';

interface EditCattleFormProps {
  open: boolean;
  cattle: Cattle | null;
  onClose: () => void;
  onSuccess: (cattle: Cattle) => void;
}

const EditCattleForm: React.FC<EditCattleFormProps> = ({ 
  open, 
  cattle, 
  onClose, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState<CattleFormData>({
    breed: '',
    age: 0,
    identification_number: '',
    gender: 'female',
    weight: undefined,
    metadata: {},
    image: null,
  });

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Pre-populate form when cattle data is available
  useEffect(() => {
    if (cattle && open) {
      setFormData({
        breed: cattle.breed,
        age: cattle.age,
        identification_number: cattle.identification_number,
        gender: cattle.gender,
        weight: cattle.weight,
        metadata: cattle.metadata || {},
        image: null, // Don't pre-populate image file
      });
      setCurrentImageUrl(cattle.image_url || null);
      setImageChanged(false);
      setErrors({});
      setSubmitError('');
    }
  }, [cattle, open]);

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
    
    // Track if image has changed
    if (field === 'image') {
      setImageChanged(true);
    }
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!cattle || !validateForm()) {
      return;
    }

    setLoading(true);
    setSubmitError('');

    try {
      // Prepare update data - only include image if it has changed
      const updateData = { ...formData };
      if (!imageChanged) {
        delete updateData.image;
      }
      
      const response = await cattleAPI.update(cattle.id, updateData);
      const updatedCattle = response.data;
      
      onSuccess(updatedCattle);
      handleClose();
    } catch (error: any) {
      console.error('Error updating cattle:', error);
      
      if (error.response?.data?.error) {
        setSubmitError(error.response.data.error);
      } else if (error.response?.data?.identification_number) {
        setSubmitError('You already have cattle with this identification number.');
      } else if (error.response?.data?.image) {
        setSubmitError(`Image error: ${error.response.data.image[0]}`);
      } else {
        setSubmitError('Failed to update cattle profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    setSubmitError('');
    setImageChanged(false);
    onClose();
  };

  if (!cattle) {
    return null;
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Cattle Details</DialogTitle>
      
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
            Cattle Image
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Update or remove the cattle photo. Leave unchanged if you don't want to modify the image.
          </Typography>

          <ImageUpload
            value={imageChanged ? formData.image : currentImageUrl}
            onChange={(file) => handleInputChange('image', file)}
            onError={(error) => setSubmitError(error)}
            label={currentImageUrl ? "Replace Image" : "Upload Cattle Photo"}
            helperText="JPEG, PNG, WebP formats supported. Max 5MB. Leave unchanged to keep current image."
            disabled={loading}
          />

          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <span><strong>Created:</strong> {new Date(cattle.created_at).toLocaleDateString()}</span>
              <span><strong>Last Updated:</strong> {new Date(cattle.updated_at).toLocaleDateString()}</span>
            </Box>
            <Box>
              <strong>Current Status:</strong> {cattle.health_status.replace('_', ' ').toUpperCase()}
            </Box>
          </Box>
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
          {loading ? 'Updating...' : 'Update Cattle'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditCattleForm;