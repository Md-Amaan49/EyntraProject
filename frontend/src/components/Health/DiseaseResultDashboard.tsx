import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Button,
  Grid,
  Chip,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Warning,
  CheckCircle,
  LocalHospital,
  Phone,
  Share,
  Download,
  Info,
  ReportProblem,
  Home,
  Schedule,
} from '@mui/icons-material';

interface DiseaseResult {
  disease_name: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'healthy' | 'suspected' | 'confirmed';
  symptoms_matched: string[];
  image_analysis?: {
    lesions_detected: boolean;
    nodules_count: number;
    affected_areas: string[];
  };
}

interface TreatmentRecommendation {
  type: 'home_remedy' | 'basic_treatment' | 'vet_consultation' | 'emergency';
  title: string;
  description: string;
  steps: string[];
  duration?: string;
  precautions?: string[];
}

interface DiseaseResultDashboardProps {
  result: DiseaseResult;
  cattleId: string;
  onConnectVet: () => void;
  onShareReport: () => void;
  onDownloadReport: () => void;
}

const LUMPY_SKIN_DISEASE_INFO = {
  name: 'Lumpy Skin Disease (LSD)',
  description: 'Lumpy Skin Disease is a viral infection that affects cattle, causing fever, skin nodules, and reduced milk production. It is caused by the Lumpy Skin Disease Virus (LSDV) and is transmitted by blood-feeding insects.',
  symptoms: [
    'Skin nodules and lumps (2-5 cm diameter)',
    'Fever and loss of appetite',
    'Reduced milk production',
    'Swollen lymph nodes',
    'Eye and nasal discharge',
    'Difficulty breathing in severe cases',
    'Lameness if legs are affected'
  ],
  transmission: [
    'Blood-feeding insects (flies, mosquitoes, ticks)',
    'Direct contact with infected animals',
    'Contaminated equipment and facilities'
  ],
  prevention: [
    'Vaccination (most effective prevention)',
    'Vector control (insect management)',
    'Quarantine new animals',
    'Maintain good hygiene',
    'Regular health monitoring'
  ]
};

const DiseaseResultDashboard: React.FC<DiseaseResultDashboardProps> = ({
  result,
  cattleId,
  onConnectVet,
  onShareReport,
  onDownloadReport
}) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'info';
    }
  };

  const getStatusIcon = () => {
    switch (result.status) {
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'suspected':
        return <Warning color="warning" />;
      case 'confirmed':
        return <ReportProblem color="error" />;
      default:
        return <Info color="info" />;
    }
  };

  const getTreatmentRecommendations = (): TreatmentRecommendation[] => {
    const recommendations: TreatmentRecommendation[] = [];

    if (result.status === 'healthy') {
      recommendations.push({
        type: 'home_remedy',
        title: 'Preventive Care',
        description: 'Continue regular health monitoring and preventive measures',
        steps: [
          'Monitor cattle daily for any changes',
          'Maintain good hygiene and sanitation',
          'Ensure proper nutrition and clean water',
          'Schedule regular vaccinations',
          'Control insects and vectors'
        ]
      });
    } else {
      // Home remedies for mild cases
      if (result.severity === 'low' || result.severity === 'medium') {
        recommendations.push({
          type: 'home_remedy',
          title: 'Immediate Home Care',
          description: 'Basic care measures you can implement immediately',
          steps: [
            'Isolate the affected animal from healthy cattle',
            'Clean affected areas with antiseptic solution',
            'Apply neem oil or turmeric paste on skin lesions',
            'Provide plenty of clean water and nutritious feed',
            'Keep the animal in a clean, dry, well-ventilated area',
            'Monitor temperature twice daily'
          ],
          duration: 'Continue until symptoms improve',
          precautions: [
            'Wear gloves when handling the animal',
            'Disinfect equipment after use',
            'Do not share equipment with healthy animals'
          ]
        });

        recommendations.push({
          type: 'basic_treatment',
          title: 'Basic Treatment Protocol',
          description: 'Additional supportive care measures',
          steps: [
            'Give paracetamol (500mg) for fever if available',
            'Apply fly repellent around affected areas',
            'Provide vitamin supplements if available',
            'Ensure adequate shade and ventilation',
            'Clean wounds with betadine solution daily'
          ],
          duration: '5-7 days or until improvement',
          precautions: [
            'Monitor for worsening symptoms',
            'Contact vet if no improvement in 3 days'
          ]
        });
      }

      // Vet consultation for moderate to severe cases
      if (result.severity === 'medium' || result.severity === 'high') {
        recommendations.push({
          type: 'vet_consultation',
          title: 'Veterinary Consultation Recommended',
          description: 'Professional veterinary care is advised for proper diagnosis and treatment',
          steps: [
            'Contact a veterinarian immediately',
            'Prepare detailed symptom history',
            'Take clear photos of affected areas',
            'Isolate the animal until vet visit',
            'Follow vet prescribed treatment plan'
          ]
        });
      }

      // Emergency care for critical cases
      if (result.severity === 'critical' || result.confidence > 85) {
        recommendations.push({
          type: 'emergency',
          title: '🚨 EMERGENCY - Immediate Veterinary Care Required',
          description: 'This case requires immediate professional attention',
          steps: [
            'Contact emergency veterinary services NOW',
            'Do not delay - this is time-sensitive',
            'Keep animal isolated and comfortable',
            'Monitor breathing and vital signs',
            'Prepare for possible hospitalization'
          ]
        });
      }
    }

    return recommendations;
  };

  const treatmentRecommendations = getTreatmentRecommendations();
  const isEmergency = result.severity === 'critical' || result.confidence > 85;

  return (
    <Box>
      {/* Header with Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              {getStatusIcon()}
              <Typography variant="h5">
                Disease Analysis Result
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <IconButton onClick={onShareReport} color="primary">
                <Share />
              </IconButton>
              <IconButton onClick={onDownloadReport} color="primary">
                <Download />
              </IconButton>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                {result.disease_name}
              </Typography>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Confidence Score
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <LinearProgress
                    variant="determinate"
                    value={result.confidence}
                    color={getConfidenceColor(result.confidence)}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="h6" color={`${getConfidenceColor(result.confidence)}.main`}>
                    {result.confidence}%
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box display="flex" gap={2} mb={2}>
                <Chip
                  label={`Severity: ${result.severity.toUpperCase()}`}
                  color={getSeverityColor(result.severity)}
                  size="medium"
                />
                <Chip
                  label={`Status: ${result.status.toUpperCase()}`}
                  color={result.status === 'healthy' ? 'success' : 'warning'}
                  size="medium"
                />
              </Box>
              
              {result.symptoms_matched.length > 0 && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Symptoms Matched: {result.symptoms_matched.length}
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {result.symptoms_matched.map((symptom, index) => (
                      <Chip key={index} label={symptom} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Emergency Alert */}
      {isEmergency && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            🚨 EMERGENCY SITUATION DETECTED
          </Typography>
          <Typography>
            High confidence detection of serious condition. Immediate veterinary consultation is strongly recommended.
          </Typography>
          <Button
            variant="contained"
            color="error"
            startIcon={<Phone />}
            onClick={onConnectVet}
            sx={{ mt: 2 }}
          >
            Connect to Emergency Vet NOW
          </Button>
        </Alert>
      )}

      {/* Disease Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 About {LUMPY_SKIN_DISEASE_INFO.name}
          </Typography>
          <Typography variant="body1" paragraph>
            {LUMPY_SKIN_DISEASE_INFO.description}
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom color="error.main">
                Common Symptoms:
              </Typography>
              <List dense>
                {LUMPY_SKIN_DISEASE_INFO.symptoms.map((symptom, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <Warning fontSize="small" color="warning" />
                    </ListItemIcon>
                    <ListItemText primary={symptom} />
                  </ListItem>
                ))}
              </List>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom color="warning.main">
                How it Spreads:
              </Typography>
              <List dense>
                {LUMPY_SKIN_DISEASE_INFO.transmission.map((method, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <Info fontSize="small" color="info" />
                    </ListItemIcon>
                    <ListItemText primary={method} />
                  </ListItem>
                ))}
              </List>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom color="success.main">
                Prevention:
              </Typography>
              <List dense>
                {LUMPY_SKIN_DISEASE_INFO.prevention.map((prevention, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <CheckCircle fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText primary={prevention} />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Treatment Recommendations */}
      <Typography variant="h6" gutterBottom>
        🩺 Treatment Recommendations
      </Typography>
      
      {treatmentRecommendations.map((treatment, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              {treatment.type === 'emergency' && <ReportProblem color="error" />}
              {treatment.type === 'vet_consultation' && <LocalHospital color="warning" />}
              {treatment.type === 'home_remedy' && <Home color="success" />}
              {treatment.type === 'basic_treatment' && <Schedule color="info" />}
              
              <Typography variant="h6" color={
                treatment.type === 'emergency' ? 'error.main' :
                treatment.type === 'vet_consultation' ? 'warning.main' :
                treatment.type === 'home_remedy' ? 'success.main' : 'info.main'
              }>
                {treatment.title}
              </Typography>
            </Box>

            <Typography variant="body1" paragraph>
              {treatment.description}
            </Typography>

            <Typography variant="subtitle2" gutterBottom>
              Steps to Follow:
            </Typography>
            <List>
              {treatment.steps.map((step, stepIndex) => (
                <ListItem key={stepIndex}>
                  <ListItemIcon>
                    <Typography variant="body2" color="primary">
                      {stepIndex + 1}.
                    </Typography>
                  </ListItemIcon>
                  <ListItemText primary={step} />
                </ListItem>
              ))}
            </List>

            {treatment.duration && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Duration:</strong> {treatment.duration}
                </Typography>
              </Alert>
            )}

            {treatment.precautions && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Important Precautions:</strong>
                </Typography>
                {treatment.precautions.map((precaution, pIndex) => (
                  <Typography key={pIndex} variant="body2">
                    • {precaution}
                  </Typography>
                ))}
              </Alert>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Action Buttons */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Next Steps
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<Phone />}
              onClick={onConnectVet}
              color={isEmergency ? 'error' : 'primary'}
            >
              {isEmergency ? 'Emergency Vet' : 'Connect to Vet'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Share />}
              onClick={onShareReport}
            >
              Share Report
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Download />}
              onClick={onDownloadReport}
            >
              Download PDF
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Schedule />}
              onClick={() => window.location.href = `/cattle/${cattleId}/history`}
            >
              View History
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Disclaimer */}
      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>⚠️ Important Disclaimer:</strong> This AI-assisted analysis is for informational purposes only and should not replace professional veterinary diagnosis. Always consult with a qualified veterinarian for accurate diagnosis and treatment. In case of emergency or severe symptoms, seek immediate veterinary care.
        </Typography>
      </Alert>
    </Box>
  );
};

export default DiseaseResultDashboard;