import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  MobileStepper,
} from '@mui/material';
import {
  CloudUpload,
  PhotoCamera,
  Delete,
  ZoomIn,
  NavigateNext,
  NavigateBefore,
  Assessment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import SymptomSelector from './SymptomSelector';
import DiseaseResultDashboard from './DiseaseResultDashboard';
import { aiAPI } from '../../services/api';

interface SelectedSymptom {
  id: string;
  name: string;
  severity: number;
  category: string;
}

interface UploadedImage {
  file: File;
  preview: string;
  quality_score?: number;
}

interface AnalysisResult {
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

const steps = ['Upload Images', 'Select Symptoms', 'AI Analysis', 'Results & Treatment'];

const EnhancedDiseaseDetection: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [activeStep, setActiveStep] = useState(0);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [symptoms, setSymptoms] = useState<SelectedSymptom[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;

    const newImages: UploadedImage[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        newImages.push({ file, preview });
      }
    });

    setImages(prev => [...prev, ...newImages]);
    setError('');
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const validateImageQuality = async (image: UploadedImage): Promise<number> => {
    // Simple quality check based on file size and dimensions
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const minWidth = 300;
        const minHeight = 300;
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        let score = 100;
        
        if (img.width < minWidth || img.height < minHeight) {
          score -= 30; // Low resolution penalty
        }
        
        if (image.file.size > maxSize) {
          score -= 20; // Large file penalty
        }
        
        if (image.file.size < 50 * 1024) {
          score -= 40; // Too small file penalty
        }
        
        resolve(Math.max(0, score));
      };
      img.src = image.preview;
    });
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      // Validate images before proceeding
      if (images.length === 0) {
        setError('Please upload at least one image');
        return;
      }
      
      setLoading(true);
      try {
        // Validate image quality
        const imagesWithQuality = await Promise.all(
          images.map(async (img) => ({
            ...img,
            quality_score: await validateImageQuality(img)
          }))
        );
        
        setImages(imagesWithQuality);
        
        // Check if any image has very low quality
        const lowQualityImages = imagesWithQuality.filter(img => (img.quality_score || 0) < 50);
        if (lowQualityImages.length > 0) {
          setError(`${lowQualityImages.length} image(s) have low quality. Consider retaking for better results.`);
        }
        
      } catch (err) {
        setError('Error validating images');
      } finally {
        setLoading(false);
      }
    }
    
    if (activeStep === 2) {
      // Perform AI analysis
      await performAnalysis();
      return;
    }
    
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const performAnalysis = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Prepare form data
      const formData = new FormData();
      
      // Add images
      images.forEach((img, index) => {
        formData.append(`image_${index}`, img.file);
      });
      
      // Add symptoms
      formData.append('symptoms', JSON.stringify(symptoms));
      
      // Add analysis type
      formData.append('analysis_type', 'comprehensive');
      formData.append('disease_focus', 'lumpy_skin_disease');
      
      // Call AI API
      const response = await aiAPI.comprehensiveAnalysis(formData);
      
      // Process results
      const result: AnalysisResult = {
        disease_name: response.data.predictions[0]?.diseaseName || 'Unknown',
        confidence: Math.round(response.data.predictions[0]?.confidenceScore * 100) || 0,
        severity: calculateSeverity(response.data.predictions[0]?.confidenceScore || 0, symptoms),
        status: determineStatus(response.data.predictions[0]?.confidenceScore || 0),
        symptoms_matched: symptoms.map(s => s.name),
        image_analysis: {
          lesions_detected: response.data.predictions[0]?.confidenceScore > 0.6,
          nodules_count: Math.floor(Math.random() * 10), // Mock data
          affected_areas: ['skin', 'lymph_nodes'] // Mock data
        }
      };
      
      setAnalysisResult(result);
      setActiveStep(3);
      
    } catch (err: any) {
      setError('Analysis failed. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateSeverity = (confidence: number, symptoms: SelectedSymptom[]): 'low' | 'medium' | 'high' | 'critical' => {
    const avgSymptomSeverity = symptoms.length > 0 
      ? symptoms.reduce((sum, s) => sum + s.severity, 0) / symptoms.length 
      : 0;
    
    const combinedScore = (confidence * 0.6) + (avgSymptomSeverity * 0.4);
    
    if (combinedScore >= 8.5) return 'critical';
    if (combinedScore >= 7) return 'high';
    if (combinedScore >= 4) return 'medium';
    return 'low';
  };

  const determineStatus = (confidence: number): 'healthy' | 'suspected' | 'confirmed' => {
    if (confidence >= 0.8) return 'confirmed';
    if (confidence >= 0.4) return 'suspected';
    return 'healthy';
  };

  const handleConnectVet = () => {
    navigate('/veterinarians');
  };

  const handleShareReport = () => {
    // Implement share functionality
    // TODO: Add share functionality
  };

  const handleDownloadReport = () => {
    // Implement PDF download
    // TODO: Add PDF download functionality
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Upload Cattle Images
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload clear, well-lit images of your cattle. Focus on areas showing symptoms.
            </Typography>

            {/* Upload Buttons */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<CloudUpload />}
                  onClick={handleFileSelect}
                  sx={{ py: 2 }}
                >
                  Upload from Gallery
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<PhotoCamera />}
                  onClick={handleCameraCapture}
                  sx={{ py: 2 }}
                >
                  Take Photo
                </Button>
              </Grid>
            </Grid>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleImageUpload(e.target.files)}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => handleImageUpload(e.target.files)}
            />

            {/* Image Preview Grid */}
            {images.length > 0 && (
              <Grid container spacing={2}>
                {images.map((image, index) => (
                  <Grid item xs={6} sm={4} md={3} key={index}>
                    <Paper sx={{ position: 'relative', p: 1 }}>
                      <img
                        src={image.preview}
                        alt={`Upload ${index + 1}`}
                        style={{
                          width: '100%',
                          height: 150,
                          objectFit: 'cover',
                          borderRadius: 4,
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedImageIndex(index)}
                      />
                      
                      {/* Quality indicator */}
                      {image.quality_score !== undefined && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            bgcolor: image.quality_score >= 70 ? 'success.main' : 
                                   image.quality_score >= 50 ? 'warning.main' : 'error.main',
                            color: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem'
                          }}
                        >
                          {image.quality_score}%
                        </Box>
                      )}
                      
                      {/* Action buttons */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          display: 'flex',
                          gap: 0.5
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => setSelectedImageIndex(index)}
                          sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
                        >
                          <ZoomIn fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => removeImage(index)}
                          sx={{ bgcolor: 'rgba(255,0,0,0.7)', color: 'white' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Image quality tips */}
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Tips for better image quality:</strong>
              </Typography>
              <Typography variant="body2">
                • Use good lighting (natural daylight is best)<br/>
                • Keep the camera steady and focus on affected areas<br/>
                • Take multiple angles if symptoms are visible in different areas<br/>
                • Ensure images are clear and not blurry<br/>
                • Minimum resolution: 300x300 pixels
              </Typography>
            </Alert>
          </Box>
        );

      case 1:
        return (
          <SymptomSelector
            selectedSymptoms={symptoms}
            onSymptomsChange={setSymptoms}
          />
        );

      case 2:
        return (
          <Box textAlign="center" py={4}>
            <Assessment sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Analyzing Images and Symptoms
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Our AI is processing your images and symptom data to provide accurate disease detection.
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Images uploaded: {images.length}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Symptoms selected: {symptoms.length}
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={performAnalysis}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Assessment />}
            >
              {loading ? 'Analyzing...' : 'Start AI Analysis'}
            </Button>
          </Box>
        );

      case 3:
        return analysisResult ? (
          <DiseaseResultDashboard
            result={analysisResult}
            cattleId="current" // You might want to pass actual cattle ID
            onConnectVet={handleConnectVet}
            onShareReport={handleShareReport}
            onDownloadReport={handleDownloadReport}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🤖 AI Disease Detection
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Upload images and select symptoms for comprehensive cattle health analysis
      </Typography>

      {/* Stepper */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Step Content */}
      <Card>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0 || loading}
          startIcon={<NavigateBefore />}
        >
          Back
        </Button>
        
        {activeStep < steps.length - 1 && (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading || (activeStep === 0 && images.length === 0)}
            endIcon={loading ? <CircularProgress size={20} /> : <NavigateNext />}
          >
            {loading ? 'Processing...' : 'Next'}
          </Button>
        )}
      </Box>

      {/* Image Preview Dialog */}
      <Dialog
        open={selectedImageIndex !== null}
        onClose={() => setSelectedImageIndex(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Image Preview {selectedImageIndex !== null ? `(${selectedImageIndex + 1} of ${images.length})` : ''}
        </DialogTitle>
        <DialogContent>
          {selectedImageIndex !== null && (
            <img
              src={images[selectedImageIndex].preview}
              alt="Preview"
              style={{ width: '100%', height: 'auto' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedImageIndex(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedDiseaseDetection;