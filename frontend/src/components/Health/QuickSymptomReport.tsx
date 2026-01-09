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
  Typography,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Send,
  Warning,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { healthAPI } from '../../services/api';
import type { Cattle } from '../../types';

interface QuickSymptomReportProps {
  open: boolean;
  cattle: Cattle | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickSymptomReport: React.FC<QuickSymptomReportProps> = ({ 
  open, 
  cattle, 
  onClose, 
  onSuccess 
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    symptoms: '',
    severity: 'moderate',
    additional_notes: '',
    is_emergency: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    if (!cattle || !formData.symptoms.trim()) {
      setError('Please describe the symptoms');
      return;
    }

    if (formData.symptoms.trim().length < 10) {
      setError('Symptom description must be at least 10 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await healthAPI.submitSymptoms({
        cattle_id: cattle.id,
        symptoms: formData.symptoms,
        severity: formData.severity,
        additional_notes: formData.additional_notes,
      });

      setSuccess('Symptoms reported successfully!');
      
      if (onSuccess) {
        onSuccess();
      }

      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err: any) {
      console.error('Quick symptom report error:', err);
      setError('Failed to submit symptoms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      symptoms: '',
      severity: 'moderate',
      additional_notes: '',
      is_emergency: false,
    });
    setError('');
    setSuccess('');
    onClose();
  };

  const handleFullReport = () => {
    handleClose();
    navigate(`/health/submit?cattle=${cattle?.id}`);
  };

  if (!cattle) {
    return null;
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Quick Symptom Report
        <Typography variant="body2" color="text.secondary">
          {cattle.breed} - {cattle.identification_number}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Describe Symptoms"
            value={formData.symptoms}
            onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
            placeholder="Describe what you've observed..."
            helperText="Minimum 10 characters required"
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              label="Severity"
            >
              <MenuItem value="mild">Mild</MenuItem>
              <MenuItem value="moderate">Moderate</MenuItem>
              <MenuItem value="severe">Severe</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Additional Notes (Optional)"
            value={formData.additional_notes}
            onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_emergency}
                onChange={(e) => setFormData({ ...formData, is_emergency: e.target.checked })}
                color="error"
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Warning color="error" fontSize="small" />
                <Typography color="error">
                  Emergency Case
                </Typography>
              </Box>
            }
          />

          {formData.is_emergency && (
            <Alert severity="error" sx={{ mt: 1 }}>
              <Typography variant="body2">
                Emergency cases will notify all available veterinarians immediately
              </Typography>
            </Alert>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              For detailed reports with images and AI analysis, use the{' '}
              <Button size="small" onClick={handleFullReport} sx={{ textTransform: 'none' }}>
                Full Report Form
              </Button>
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleFullReport} disabled={loading}>
          Full Report
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || !formData.symptoms.trim()}
          startIcon={loading ? <CircularProgress size={20} /> : <Send />}
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickSymptomReport;