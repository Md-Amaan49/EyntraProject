import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Button,
  Grid,
  Chip,
  Alert,
  Paper,
} from '@mui/material';
import {
  Warning,
  LocalHospital,
  Thermostat,
  Visibility,
  TouchApp,
} from '@mui/icons-material';

interface SymptomData {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'physical' | 'behavioral' | 'visible';
  severity_weight: number;
}

interface SymptomSelectorProps {
  onSymptomsChange: (symptoms: SelectedSymptom[]) => void;
  selectedSymptoms: SelectedSymptom[];
}

interface SelectedSymptom {
  id: string;
  name: string;
  severity: number;
  category: string;
}

const LUMPY_SKIN_SYMPTOMS: SymptomData[] = [
  // Physical Symptoms
  {
    id: 'fever',
    name: 'Fever',
    description: 'High body temperature, hot to touch',
    icon: <Thermostat />,
    category: 'physical',
    severity_weight: 0.8
  },
  {
    id: 'loss_appetite',
    name: 'Loss of Appetite',
    description: 'Not eating or drinking normally',
    icon: <LocalHospital />,
    category: 'behavioral',
    severity_weight: 0.6
  },
  {
    id: 'lethargy',
    name: 'Lethargy/Weakness',
    description: 'Less active, lying down more than usual',
    icon: <LocalHospital />,
    category: 'behavioral',
    severity_weight: 0.7
  },
  
  // Visible Symptoms (Key for LSD)
  {
    id: 'skin_nodules',
    name: 'Skin Nodules/Lumps',
    description: 'Raised bumps or lumps on skin',
    icon: <TouchApp />,
    category: 'visible',
    severity_weight: 0.9
  },
  {
    id: 'skin_lesions',
    name: 'Skin Lesions',
    description: 'Open wounds or sores on skin',
    icon: <Visibility />,
    category: 'visible',
    severity_weight: 0.95
  },
  {
    id: 'swollen_lymph',
    name: 'Swollen Lymph Nodes',
    description: 'Enlarged lymph nodes, especially around neck',
    icon: <TouchApp />,
    category: 'physical',
    severity_weight: 0.8
  },
  {
    id: 'discharge_eyes',
    name: 'Eye/Nasal Discharge',
    description: 'Watery or thick discharge from eyes or nose',
    icon: <Visibility />,
    category: 'visible',
    severity_weight: 0.6
  },
  {
    id: 'difficulty_breathing',
    name: 'Difficulty Breathing',
    description: 'Labored breathing, mouth breathing',
    icon: <Warning />,
    category: 'physical',
    severity_weight: 0.9
  },
  {
    id: 'lameness',
    name: 'Lameness',
    description: 'Difficulty walking, favoring one leg',
    icon: <LocalHospital />,
    category: 'physical',
    severity_weight: 0.7
  },
  {
    id: 'milk_reduction',
    name: 'Reduced Milk Production',
    description: 'Significant decrease in milk yield (for dairy cattle)',
    icon: <LocalHospital />,
    category: 'behavioral',
    severity_weight: 0.6
  }
];

const SymptomSelector: React.FC<SymptomSelectorProps> = ({
  onSymptomsChange,
  selectedSymptoms
}) => {
  const [symptoms, setSymptoms] = useState<SelectedSymptom[]>(selectedSymptoms);

  const handleSymptomToggle = (symptomData: SymptomData) => {
    const existingIndex = symptoms.findIndex(s => s.id === symptomData.id);
    
    if (existingIndex >= 0) {
      // Remove symptom
      const newSymptoms = symptoms.filter(s => s.id !== symptomData.id);
      setSymptoms(newSymptoms);
      onSymptomsChange(newSymptoms);
    } else {
      // Add symptom with default severity
      const newSymptom: SelectedSymptom = {
        id: symptomData.id,
        name: symptomData.name,
        severity: 5, // Default to medium severity
        category: symptomData.category
      };
      const newSymptoms = [...symptoms, newSymptom];
      setSymptoms(newSymptoms);
      onSymptomsChange(newSymptoms);
    }
  };

  const handleSeverityChange = (symptomId: string, severity: number) => {
    const newSymptoms = symptoms.map(s => 
      s.id === symptomId ? { ...s, severity } : s
    );
    setSymptoms(newSymptoms);
    onSymptomsChange(newSymptoms);
  };

  const isSymptomSelected = (symptomId: string) => {
    return symptoms.some(s => s.id === symptomId);
  };

  const getSelectedSymptom = (symptomId: string) => {
    return symptoms.find(s => s.id === symptomId);
  };

  const getSeverityColor = (severity: number) => {
    if (severity <= 3) return 'success';
    if (severity <= 6) return 'warning';
    return 'error';
  };

  const getSeverityLabel = (severity: number) => {
    if (severity <= 3) return 'Mild';
    if (severity <= 6) return 'Moderate';
    return 'Severe';
  };

  const calculateOverallSeverity = () => {
    if (symptoms.length === 0) return 0;
    
    const totalWeight = symptoms.reduce((sum, symptom) => {
      const symptomData = LUMPY_SKIN_SYMPTOMS.find(s => s.id === symptom.id);
      return sum + (symptomData?.severity_weight || 0.5) * (symptom.severity / 10);
    }, 0);
    
    return Math.min(10, totalWeight * 2); // Scale to 0-10
  };

  const overallSeverity = calculateOverallSeverity();

  const groupedSymptoms = {
    visible: LUMPY_SKIN_SYMPTOMS.filter(s => s.category === 'visible'),
    physical: LUMPY_SKIN_SYMPTOMS.filter(s => s.category === 'physical'),
    behavioral: LUMPY_SKIN_SYMPTOMS.filter(s => s.category === 'behavioral'),
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Observed Symptoms
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Check all symptoms you've observed in your cattle. Rate the severity of each symptom.
      </Typography>

      {/* Overall Severity Indicator */}
      {symptoms.length > 0 && (
        <Alert 
          severity={overallSeverity > 7 ? 'error' : overallSeverity > 4 ? 'warning' : 'info'}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2">
            Overall Severity: {getSeverityLabel(overallSeverity)} ({overallSeverity.toFixed(1)}/10)
          </Typography>
          {overallSeverity > 7 && (
            <Typography variant="body2">
              ⚠️ High severity detected. Immediate veterinary consultation recommended.
            </Typography>
          )}
        </Alert>
      )}

      {/* Visible Symptoms (Most Important for LSD) */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" color="error.main" gutterBottom>
            🔍 Visible Symptoms (Critical for Lumpy Skin Disease)
          </Typography>
          <Grid container spacing={2}>
            {groupedSymptoms.visible.map((symptom) => (
              <Grid item xs={12} md={6} key={symptom.id}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    border: isSymptomSelected(symptom.id) ? 2 : 1,
                    borderColor: isSymptomSelected(symptom.id) ? 'primary.main' : 'divider',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleSymptomToggle(symptom)}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    {symptom.icon}
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isSymptomSelected(symptom.id)}
                          onChange={() => handleSymptomToggle(symptom)}
                        />
                      }
                      label={symptom.name}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {symptom.description}
                  </Typography>
                  
                  {isSymptomSelected(symptom.id) && (
                    <Box mt={2}>
                      <Typography variant="body2" gutterBottom>
                        Severity: {getSeverityLabel(getSelectedSymptom(symptom.id)?.severity || 5)}
                      </Typography>
                      <Slider
                        value={getSelectedSymptom(symptom.id)?.severity || 5}
                        onChange={(_, value) => handleSeverityChange(symptom.id, value as number)}
                        min={1}
                        max={10}
                        step={1}
                        marks={[
                          { value: 1, label: 'Mild' },
                          { value: 5, label: 'Moderate' },
                          { value: 10, label: 'Severe' }
                        ]}
                        color={getSeverityColor(getSelectedSymptom(symptom.id)?.severity || 5)}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Physical Symptoms */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" color="warning.main" gutterBottom>
            🌡️ Physical Symptoms
          </Typography>
          <Grid container spacing={2}>
            {groupedSymptoms.physical.map((symptom) => (
              <Grid item xs={12} md={6} key={symptom.id}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    border: isSymptomSelected(symptom.id) ? 2 : 1,
                    borderColor: isSymptomSelected(symptom.id) ? 'primary.main' : 'divider',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleSymptomToggle(symptom)}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    {symptom.icon}
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isSymptomSelected(symptom.id)}
                          onChange={() => handleSymptomToggle(symptom)}
                        />
                      }
                      label={symptom.name}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {symptom.description}
                  </Typography>
                  
                  {isSymptomSelected(symptom.id) && (
                    <Box mt={2}>
                      <Typography variant="body2" gutterBottom>
                        Severity: {getSeverityLabel(getSelectedSymptom(symptom.id)?.severity || 5)}
                      </Typography>
                      <Slider
                        value={getSelectedSymptom(symptom.id)?.severity || 5}
                        onChange={(_, value) => handleSeverityChange(symptom.id, value as number)}
                        min={1}
                        max={10}
                        step={1}
                        marks={[
                          { value: 1, label: 'Mild' },
                          { value: 5, label: 'Moderate' },
                          { value: 10, label: 'Severe' }
                        ]}
                        color={getSeverityColor(getSelectedSymptom(symptom.id)?.severity || 5)}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Behavioral Symptoms */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" color="info.main" gutterBottom>
            🐄 Behavioral Symptoms
          </Typography>
          <Grid container spacing={2}>
            {groupedSymptoms.behavioral.map((symptom) => (
              <Grid item xs={12} md={6} key={symptom.id}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    border: isSymptomSelected(symptom.id) ? 2 : 1,
                    borderColor: isSymptomSelected(symptom.id) ? 'primary.main' : 'divider',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleSymptomToggle(symptom)}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    {symptom.icon}
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isSymptomSelected(symptom.id)}
                          onChange={() => handleSymptomToggle(symptom)}
                        />
                      }
                      label={symptom.name}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {symptom.description}
                  </Typography>
                  
                  {isSymptomSelected(symptom.id) && (
                    <Box mt={2}>
                      <Typography variant="body2" gutterBottom>
                        Severity: {getSeverityLabel(getSelectedSymptom(symptom.id)?.severity || 5)}
                      </Typography>
                      <Slider
                        value={getSelectedSymptom(symptom.id)?.severity || 5}
                        onChange={(_, value) => handleSeverityChange(symptom.id, value as number)}
                        min={1}
                        max={10}
                        step={1}
                        marks={[
                          { value: 1, label: 'Mild' },
                          { value: 5, label: 'Moderate' },
                          { value: 10, label: 'Severe' }
                        ]}
                        color={getSeverityColor(getSelectedSymptom(symptom.id)?.severity || 5)}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Selected Symptoms Summary */}
      {symptoms.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Selected Symptoms Summary
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {symptoms.map((symptom) => (
                <Chip
                  key={symptom.id}
                  label={`${symptom.name} (${getSeverityLabel(symptom.severity)})`}
                  color={getSeverityColor(symptom.severity)}
                  onDelete={() => handleSymptomToggle(LUMPY_SKIN_SYMPTOMS.find(s => s.id === symptom.id)!)}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SymptomSelector;