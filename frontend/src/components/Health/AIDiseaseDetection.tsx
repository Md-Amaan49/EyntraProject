import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Divider,
} from '@mui/material';
import {
  CloudUpload,
  Science,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import axios from 'axios';

interface DiseasePrediction {
  diseaseName: string;
  confidenceScore: number;
  severityLevel: string;
  description: string;
  detection_count?: number;
  recommendation?: string;
  source?: string;
  reliability?: string;
  is_healthy?: boolean;
}

interface AIResponse {
  predictions: DiseasePrediction[];
  raw_roboflow_response?: any;
  model_version: string;
  timestamp: string;
}

const AIDiseaseDetection: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AIResponse | null>(null);
  const [error, setError] = useState('');

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setError('');

      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError("Please upload an image");
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const base64Image = await convertImageToBase64(selectedImage);

      // Call AI service with correct format
      const response = await axios.post("http://localhost:5000/api/ai/predict", {
        symptoms: '',
        images: [base64Image],
        cattle_metadata: {
          breed: 'Unknown',
          age: 0,
        },
      });

      setResults(response.data);
    } catch (err: any) {
      console.error('AI Detection error:', err);
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to analyze image. Make sure the AI service is running on port 5000.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        🤖 AI Disease Detection
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload a cattle image to detect Lumpy Skin Disease using AI
      </Typography>

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upload Image
              </Typography>

              <Box sx={{ mb: 3 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="image-upload"
                  type="file"
                  onChange={handleImageSelect}
                />
                <label htmlFor="image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Choose Image
                  </Button>
                </label>

                {imagePreview && (
                  <Paper
                    elevation={2}
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      bgcolor: 'grey.50',
                    }}
                  >
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        borderRadius: '8px',
                      }}
                    />
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      {selectedImage?.name}
                    </Typography>
                  </Paper>
                )}
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={loading ? <CircularProgress size={20} /> : <Science />}
                onClick={handleAnalyze}
                disabled={loading || !selectedImage}
              >
                {loading ? 'Analyzing...' : 'Analyze with AI'}
              </Button>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Results Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detection Results
              </Typography>

              {!results && !loading && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Science sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    Upload an image and click "Analyze with AI" to see results
                  </Typography>
                </Box>
              )}

              {loading && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress />
                  <Typography sx={{ mt: 2 }}>
                    Analyzing image with Roboflow AI...
                  </Typography>
                </Box>
              )}

              {results && (
                <Box>
                  {results.predictions.length === 0 ? (
                    <Alert severity="info">
                      <Typography variant="body2">
                        No results from AI analysis
                      </Typography>
                    </Alert>
                  ) : (
                    <Box>
                      {/* Intelligent Analysis Card WITH Tips and Guidelines */}
                      {results.predictions.map((prediction, index) => {
                        const className = prediction.diseaseName || 'No Classification';
                        const confidence = prediction.confidenceScore;
                        const isHealthy = prediction.is_healthy !== undefined 
                          ? prediction.is_healthy 
                          : className.toLowerCase().trim() === 'healthy';
                        
                        return (
                          <Paper
                            key={`analysis-${index}`}
                            elevation={4}
                            sx={{
                              p: 4,
                              mb: 3,
                              bgcolor: isHealthy ? '#e8f5e9' : '#ffebee',
                              borderLeft: `6px solid ${isHealthy ? '#4caf50' : '#f44336'}`,
                              borderRadius: 2,
                            }}
                          >
                            {isHealthy ? (
                              // Healthy Case WITH Tips
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                  <CheckCircle sx={{ fontSize: 48, color: '#4caf50', mr: 2 }} />
                                  <Box>
                                    <Typography variant="h4" fontWeight="bold" color="#2e7d32">
                                      ✅ Healthy Cattle
                                    </Typography>
                                    <Typography variant="h6" color="text.secondary">
                                      Confidence: {confidence.toFixed(1)}%
                                    </Typography>
                                  </Box>
                                </Box>
                                
                                <Divider sx={{ my: 2 }} />
                                
                                <Typography variant="h6" fontWeight="bold" color="#2e7d32" gutterBottom>
                                  🎉 Good News!
                                </Typography>
                                <Typography variant="body1" paragraph>
                                  The AI analysis indicates that your cattle appears to be healthy with no signs of disease detected.
                                </Typography>
                                
                                <Typography variant="h6" fontWeight="bold" color="#2e7d32" gutterBottom sx={{ mt: 2 }}>
                                  💡 Recommendations:
                                </Typography>
                                <Box component="ul" sx={{ pl: 2, color: 'text.primary' }}>
                                  <li>
                                    <Typography variant="body2" paragraph>
                                      <strong>Continue Regular Monitoring:</strong> Keep observing your cattle daily for any changes in behavior or appearance
                                    </Typography>
                                  </li>
                                  <li>
                                    <Typography variant="body2" paragraph>
                                      <strong>Maintain Hygiene:</strong> Ensure clean living conditions and proper sanitation
                                    </Typography>
                                  </li>
                                  <li>
                                    <Typography variant="body2" paragraph>
                                      <strong>Vaccination Schedule:</strong> Keep up with regular vaccinations to prevent diseases
                                    </Typography>
                                  </li>
                                  <li>
                                    <Typography variant="body2" paragraph>
                                      <strong>Nutrition:</strong> Provide balanced diet and clean water
                                    </Typography>
                                  </li>
                                  <li>
                                    <Typography variant="body2">
                                      <strong>Preventive Care:</strong> Schedule regular veterinary check-ups
                                    </Typography>
                                  </li>
                                </Box>
                              </Box>
                            ) : (
                              // Disease Detected Case WITH Guidelines
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                  <Warning sx={{ fontSize: 48, color: '#f44336', mr: 2 }} />
                                  <Box>
                                    <Typography variant="h4" fontWeight="bold" color="#c62828">
                                      ⚠️ Disease Detected
                                    </Typography>
                                    <Typography variant="h6" color="text.secondary">
                                      Confidence: {confidence.toFixed(1)}%
                                    </Typography>
                                  </Box>
                                </Box>
                                
                                <Divider sx={{ my: 2 }} />
                                
                                <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: '#fff3e0' }}>
                                  <Typography variant="h5" fontWeight="bold" color="#e65100" gutterBottom>
                                    📋 Disease Detected: {className}
                                  </Typography>
                                  <Typography variant="body1" color="text.secondary">
                                    The AI has identified signs of <strong>{className}</strong> in the analyzed image.
                                  </Typography>
                                </Paper>
                                
                                <Typography variant="h6" fontWeight="bold" color="#c62828" gutterBottom sx={{ mt: 2 }}>
                                  🚨 Immediate Actions Required:
                                </Typography>
                                <Box component="ul" sx={{ pl: 2, color: 'text.primary' }}>
                                  <li>
                                    <Typography variant="body2" paragraph>
                                      <strong>Isolate the Animal:</strong> Separate the affected cattle from the herd immediately to prevent spread
                                    </Typography>
                                  </li>
                                  <li>
                                    <Typography variant="body2" paragraph>
                                      <strong>Contact Veterinarian:</strong> Seek professional veterinary consultation as soon as possible
                                    </Typography>
                                  </li>
                                  <li>
                                    <Typography variant="body2" paragraph>
                                      <strong>Document Symptoms:</strong> Take clear photos and note all visible symptoms for the vet
                                    </Typography>
                                  </li>
                                  <li>
                                    <Typography variant="body2" paragraph>
                                      <strong>Monitor Other Animals:</strong> Check other cattle in the herd for similar symptoms
                                    </Typography>
                                  </li>
                                  <li>
                                    <Typography variant="body2">
                                      <strong>Follow Treatment Protocol:</strong> Administer treatment only as prescribed by a qualified veterinarian
                                    </Typography>
                                  </li>
                                </Box>
                                
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                  <Typography variant="body2">
                                    <strong>Note:</strong> This is an AI-based preliminary assessment. Always consult with a qualified veterinarian for accurate diagnosis and treatment.
                                  </Typography>
                                </Alert>
                              </Box>
                            )}
                          </Paper>
                        );
                      })}

                      {/* Simple Classification Result */}
                      {results.predictions.map((prediction, index) => {
                        const className = prediction.diseaseName || 'No Classification';
                        const isHealthy = prediction.is_healthy !== undefined 
                          ? prediction.is_healthy 
                          : className.toLowerCase().trim() === 'healthy';
                        const bgColor = isHealthy ? '#4caf50' : '#f44336';
                        
                        console.log('=== Roboflow Result ===');
                        console.log('Class Name:', className);
                        console.log('Is Healthy Flag:', prediction.is_healthy);
                        console.log('Computed Is Healthy:', isHealthy);
                        console.log('Background Color:', bgColor);
                        console.log('Confidence:', prediction.confidenceScore);
                        
                        return (
                          <Paper
                            key={index}
                            elevation={3}
                            sx={{
                              p: 4,
                              textAlign: 'center',
                              bgcolor: bgColor,
                              color: 'white',
                              borderRadius: 2,
                              mb: 3,
                            }}
                          >
                            <Typography variant="h3" fontWeight="bold" sx={{ mb: 2 }}>
                              {className}
                            </Typography>
                            <Typography variant="h4" fontWeight="medium">
                              {prediction.confidenceScore.toFixed(1)}%
                            </Typography>
                          </Paper>
                        );
                      })}

                      {/* Raw Roboflow Response */}
                      {results.raw_roboflow_response && (
                        <Paper elevation={3} sx={{ p: 3, bgcolor: '#e3f2fd' }}>
                          <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
                            🤖 Raw Roboflow API Response
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                            This is the exact response from Roboflow - unmodified
                          </Typography>
                          <Box sx={{ 
                            bgcolor: '#fff', 
                            p: 2, 
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            overflow: 'auto',
                            maxHeight: '500px',
                            border: '1px solid #ccc'
                          }}>
                            <pre>{JSON.stringify(results.raw_roboflow_response, null, 2)}</pre>
                          </Box>
                        </Paper>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AIDiseaseDetection;
