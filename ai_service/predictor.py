"""
Disease prediction logic using advanced AI models.
"""
import numpy as np
import base64
from io import BytesIO
from PIL import Image
from datetime import datetime
import json
import os
import logging

from models.multimodal_predictor import MultiModalPredictor
from models.image_classifier import CattleDiseaseImageClassifier
from models.symptom_analyzer import SymptomAnalyzer
from models.roboflow_detector import RoboflowLumpyDetector

logger = logging.getLogger(__name__)


class DiseasePredictor:
    """Main predictor class for disease detection using advanced AI models."""
    
    def __init__(self):
        """Initialize the predictor with advanced models."""
        self.model_version = "2.0.0-roboflow"
        self.loaded_at = datetime.now().isoformat()
        
        # Initialize advanced models
        self.multimodal_predictor = None
        self.image_classifier = None
        self.symptom_analyzer = None
        self.roboflow_detector = None
        
        # Load models if available
        self._load_models()
        
        # Disease database (will be loaded from Django DB in production)
        self.diseases = self._load_disease_database()
    
    def _load_models(self):
        """Load advanced AI models from files."""
        try:
            logger.info("Loading advanced AI models...")
            
            # Initialize Roboflow detector (PRIORITY - your trained model!)
            try:
                self.roboflow_detector = RoboflowLumpyDetector()
                if self.roboflow_detector.is_available():
                    logger.info("✅ Roboflow Lumpy Skin Disease detector loaded successfully!")
                else:
                    logger.warning("⚠️ Roboflow detector initialized but not available (check API key)")
            except Exception as e:
                logger.warning(f"⚠️ Could not load Roboflow detector: {e}")
                self.roboflow_detector = None
            
            # Initialize individual models
            self.image_classifier = CattleDiseaseImageClassifier()
            self.symptom_analyzer = SymptomAnalyzer()
            
            # Initialize multi-modal predictor
            self.multimodal_predictor = MultiModalPredictor()
            
            # Try to load pre-trained models if they exist
            models_dir = os.path.join(os.path.dirname(__file__), 'models', 'trained')
            
            if os.path.exists(models_dir):
                image_model_path = os.path.join(models_dir, 'image_classifier.h5')
                symptom_model_path = os.path.join(models_dir, 'symptom_analyzer.pkl')
                
                if os.path.exists(image_model_path):
                    try:
                        self.image_classifier.load_model(image_model_path)
                        logger.info("Loaded pre-trained image classifier")
                    except Exception as e:
                        logger.warning(f"Could not load image model: {e}")
                
                if os.path.exists(symptom_model_path):
                    try:
                        self.symptom_analyzer.load_model(symptom_model_path)
                        logger.info("Loaded pre-trained symptom analyzer")
                    except Exception as e:
                        logger.warning(f"Could not load symptom model: {e}")
            
            # Set up disease class names
            disease_names = list(self.diseases.keys())
            self.image_classifier.set_class_names(disease_names)
            
            logger.info("Advanced AI models loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            # Fallback to basic models
            self.multimodal_predictor = None
            logger.warning("Using fallback prediction methods")
    
    def _load_disease_database(self):
        """Load disease information from database."""
        # TODO: Load from Django database via API
        # For now, using sample data including Lumpy Skin Disease
        return {
            'lumpy_skin_disease': {
                'name': 'Lumpy Skin Disease',
                'symptoms': ['fever', 'skin nodules', 'lumps', 'lesions', 'swelling', 'loss of appetite'],
                'severity': 'high',
                'description': 'Viral disease causing skin nodules and lesions in cattle'
            },
            'foot_and_mouth': {
                'name': 'Foot and Mouth Disease',
                'symptoms': ['fever', 'blisters', 'lameness', 'salivation'],
                'severity': 'high'
            },
            'mastitis': {
                'name': 'Mastitis',
                'symptoms': ['swollen udder', 'fever', 'reduced milk', 'pain'],
                'severity': 'medium'
            },
            'pneumonia': {
                'name': 'Pneumonia',
                'symptoms': ['cough', 'fever', 'difficulty breathing', 'nasal discharge'],
                'severity': 'high'
            }
        }
    
    def predict(self, symptoms='', images=None, metadata=None):
        """
        Predict disease from symptoms and images using advanced AI models.
        
        Args:
            symptoms: Text description of symptoms
            images: List of base64 encoded images or image URLs
            metadata: Additional cattle metadata
        
        Returns:
            List of disease predictions with confidence scores
        """
        try:
            all_predictions = []
            
            # PRIORITY: Use Roboflow for image analysis if available
            if images and self.roboflow_detector and self.roboflow_detector.is_available():
                logger.info("🔍 Using Roboflow Lumpy Skin Disease detector for image analysis")
                try:
                    for image_data in images:
                        roboflow_preds = self.roboflow_detector.predict_from_base64(
                            image_data,
                            confidence=40  # 40% minimum confidence
                        )
                        
                        # Convert Roboflow format to our system format
                        for pred in roboflow_preds:
                            is_healthy = pred.get('is_healthy', False)
                            disease_name = pred['disease_name']
                            
                            if is_healthy:
                                # Healthy cattle
                                formatted_pred = {
                                    'diseaseName': disease_name,
                                    'confidenceScore': pred['confidence_score'],
                                    'severityLevel': 'none',
                                    'description': f"Cattle classified as healthy by Roboflow AI model",
                                    'commonSymptoms': [],
                                    'riskFactors': [],
                                    'source': 'roboflow',
                                    'reliability': 'high',
                                    'recommendation': 'Cattle appears healthy. Continue regular monitoring and care.',
                                    'evidence': {
                                        'images': ['Healthy classification'],
                                        'symptoms': []
                                    },
                                    'prediction_sources': ['roboflow_image_analysis'],
                                    'is_healthy': True,
                                    'model_info': pred.get('model_info', {})
                                }
                            else:
                                # Disease detected
                                formatted_pred = {
                                    'diseaseName': disease_name,
                                    'confidenceScore': pred['confidence_score'],
                                    'severityLevel': 'high',  # Lumpy Skin Disease is always high severity
                                    'description': f"Detected using Roboflow AI model - {pred['detection_count']} lesion(s) found",
                                    'commonSymptoms': self._get_disease_symptoms(disease_name),
                                    'riskFactors': self._get_risk_factors(disease_name),
                                    'source': 'roboflow',
                                    'reliability': 'high',
                                    'recommendation': self._get_lumpy_recommendation(pred['confidence_score']),
                                    'evidence': {
                                        'images': [f"Lesion {i+1}" for i in range(pred['detection_count'])],
                                        'symptoms': []
                                    },
                                    'prediction_sources': ['roboflow_image_analysis'],
                                    'detection_count': pred['detection_count'],
                                    'bounding_boxes': pred.get('bounding_boxes', []),
                                    'model_info': pred.get('model_info', {})
                                }
                            all_predictions.append(formatted_pred)
                    
                    logger.info(f"✅ Roboflow detected {len(all_predictions)} disease prediction(s)")
                    
                except Exception as e:
                    logger.error(f"❌ Roboflow prediction failed: {e}")
                    # Continue to fallback methods
            
            # Add symptom-based predictions
            if symptoms:
                logger.info("📝 Analyzing symptoms using NLP")
                symptom_predictions = self._predict_from_symptoms(symptoms)
                
                # Convert symptom predictions to our format
                for pred in symptom_predictions:
                    formatted_pred = {
                        'diseaseName': pred['diseaseName'],
                        'confidenceScore': pred['confidenceScore'],
                        'severityLevel': pred['severityLevel'],
                        'description': pred['description'],
                        'commonSymptoms': pred['commonSymptoms'],
                        'riskFactors': pred['riskFactors'],
                        'source': pred['source'],
                        'reliability': 'medium',
                        'recommendation': self._get_recommendation(pred['confidenceScore']),
                        'evidence': {
                            'symptoms': pred.get('commonSymptoms', []),
                            'images': []
                        },
                        'prediction_sources': ['symptom_analysis']
                    }
                    all_predictions.append(formatted_pred)
            
            # If no predictions yet, use fallback
            if not all_predictions:
                logger.info("⚠️ No predictions from Roboflow or symptoms, using fallback")
                return self._fallback_prediction(symptoms, images, metadata)
            
            # Combine and deduplicate predictions
            combined_predictions = self._combine_predictions(all_predictions)
            
            # Sort by confidence
            combined_predictions.sort(key=lambda x: x['confidenceScore'], reverse=True)
            
            return combined_predictions
                
        except Exception as e:
            logger.error(f"Error in prediction: {e}")
            # Use fallback method
            return self._fallback_prediction(symptoms, images, metadata)
    
    def _get_lumpy_recommendation(self, confidence):
        """Get recommendation based on Lumpy Skin Disease detection confidence."""
        if confidence >= 80:
            return (
                "High confidence Lumpy Skin Disease detection. "
                "IMMEDIATE ACTION REQUIRED: Isolate affected cattle, contact veterinarian urgently, "
                "and report to local animal health authorities. This is a notifiable disease."
            )
        elif confidence >= 60:
            return (
                "Moderate confidence Lumpy Skin Disease detection. "
                "Isolate suspected cattle and contact veterinarian for confirmation. "
                "Monitor closely for additional symptoms."
            )
        else:
            return (
                "Possible Lumpy Skin Disease detected. "
                "Veterinary examination recommended for accurate diagnosis."
            )
    
    def _get_recommendation(self, confidence):
        """Get general recommendation based on confidence score."""
        if confidence < 40:
            return 'Low confidence. Veterinary consultation strongly recommended for accurate diagnosis.'
        elif confidence < 60:
            return 'Moderate confidence. Consider veterinary consultation for confirmation.'
        else:
            return 'Good confidence. Monitor symptoms and follow treatment recommendations. Consult veterinarian if symptoms worsen.'
    
    def _predict_from_symptoms(self, symptoms):
        """Predict disease from symptom text using advanced NLP."""
        predictions = []
        
        try:
            if self.symptom_analyzer:
                # Use advanced symptom analyzer
                symptom_predictions = self.symptom_analyzer.predict_diseases(symptoms)
                
                for pred in symptom_predictions:
                    predictions.append({
                        'diseaseName': pred['disease_name'],
                        'confidenceScore': pred['confidence_score'],
                        'severityLevel': self._determine_severity_from_confidence(pred['confidence_score']),
                        'description': f"Advanced symptom analysis using NLP",
                        'commonSymptoms': pred.get('matched_keywords', []),
                        'riskFactors': pred.get('symptom_categories', []),
                        'source': 'advanced_symptom_analysis'
                    })
            else:
                # Fallback to simple keyword matching
                predictions = self._simple_symptom_matching(symptoms)
                
        except Exception as e:
            logger.error(f"Error in symptom prediction: {e}")
            predictions = self._simple_symptom_matching(symptoms)
        
        return predictions
    
    def _simple_symptom_matching(self, symptoms):
        """Simple keyword-based symptom matching as fallback."""
        predictions = []
        symptoms_lower = symptoms.lower()
        
        for disease_key, disease_info in self.diseases.items():
            # Count matching symptoms
            matches = sum(1 for symptom in disease_info['symptoms'] if symptom in symptoms_lower)
            
            if matches > 0:
                confidence = min(95, (matches / len(disease_info['symptoms'])) * 100)
                
                predictions.append({
                    'diseaseName': disease_info['name'],
                    'confidenceScore': round(confidence, 2),
                    'severityLevel': disease_info['severity'],
                    'description': f"Basic symptom keyword matching",
                    'commonSymptoms': disease_info['symptoms'],
                    'riskFactors': ['Based on symptom matching'],
                    'source': 'basic_symptom_analysis'
                })
        
        return predictions
    
    def _predict_from_images(self, images):
        """Predict disease from images using CNN."""
        predictions = []
        
        try:
            if self.image_classifier and images:
                # Use advanced image classifier
                image_predictions = self.image_classifier.predict(images)
                
                for pred in image_predictions:
                    predictions.append({
                        'diseaseName': pred['disease_name'],
                        'confidenceScore': pred['confidence_score'],
                        'severityLevel': self._determine_severity_from_confidence(pred['confidence_score']),
                        'description': f"CNN-based image classification",
                        'commonSymptoms': self._get_disease_symptoms(pred['disease_name']),
                        'riskFactors': self._get_risk_factors(pred['disease_name']),
                        'source': 'cnn_image_analysis',
                        'image_index': pred.get('image_index', 0)
                    })
            else:
                # Fallback to mock prediction
                if len(images) > 0:
                    predictions.append({
                        'diseaseName': 'General Health Concern',
                        'confidenceScore': 45.0,
                        'severityLevel': 'medium',
                        'description': 'Basic image analysis (CNN model not available)',
                        'commonSymptoms': ['visible abnormalities'],
                        'riskFactors': ['Image-based detection'],
                        'source': 'basic_image_analysis'
                    })
                
        except Exception as e:
            logger.error(f"Error in image prediction: {e}")
            # Return empty list on error
            predictions = []
        
        return predictions
    
    def _combine_predictions(self, predictions):
        """Combine predictions from multiple sources."""
        # Group by disease name
        disease_map = {}
        
        for pred in predictions:
            name = pred['diseaseName']
            if name in disease_map:
                # Average confidence scores from multiple sources
                existing = disease_map[name]
                existing['confidenceScore'] = (
                    existing['confidenceScore'] + pred['confidenceScore']
                ) / 2
                existing['sources'] = existing.get('sources', []) + [pred.get('source', 'unknown')]
            else:
                disease_map[name] = pred
        
        return list(disease_map.values())
    
    def get_model_version(self):
        """Get current model version."""
        return self.model_version
    
    def get_loaded_at(self):
        """Get model load timestamp."""
        return self.loaded_at
    
    def get_supported_diseases(self):
        """Get list of diseases the model can detect."""
        return [info['name'] for info in self.diseases.values()]
    
    def get_timestamp(self):
        """Get current timestamp."""
        return datetime.now().isoformat()
    
    def _determine_severity_from_confidence(self, confidence):
        """Determine severity level from confidence score."""
        if confidence >= 80:
            return 'high'
        elif confidence >= 60:
            return 'medium'
        elif confidence >= 40:
            return 'low'
        else:
            return 'very_low'
    
    def _get_disease_symptoms(self, disease_name):
        """Get common symptoms for a disease."""
        disease_key = disease_name.lower().replace(' ', '_')
        if disease_key in self.diseases:
            return self.diseases[disease_key]['symptoms']
        return []
    
    def _get_risk_factors(self, disease_name):
        """Get risk factors for a disease."""
        # Default risk factors based on disease type
        risk_factor_map = {
            'mastitis': ['Poor hygiene', 'Injury', 'Stress', 'Poor milking practices'],
            'foot_and_mouth': ['Contact with infected animals', 'Contaminated feed', 'Poor biosecurity'],
            'respiratory_infection': ['Poor ventilation', 'Overcrowding', 'Stress', 'Weather changes'],
            'digestive_disorder': ['Poor feed quality', 'Sudden diet changes', 'Contaminated water'],
            'lameness': ['Poor hoof care', 'Wet conditions', 'Sharp objects', 'Nutritional deficiency']
        }
        
        disease_key = disease_name.lower().replace(' ', '_')
        for key, factors in risk_factor_map.items():
            if key in disease_key:
                return factors
        
        return ['Environmental factors', 'Stress', 'Poor management']
    
    def _fallback_prediction(self, symptoms, images, metadata):
        """Fallback prediction method when advanced models are not available."""
        predictions = []
        
        # Symptom-based prediction
        if symptoms:
            symptom_predictions = self._simple_symptom_matching(symptoms)
            predictions.extend(symptom_predictions)
        
        # Image-based prediction
        if images:
            image_predictions = self._predict_from_images(images)
            predictions.extend(image_predictions)
        
        # Combine and rank predictions
        predictions = self._combine_predictions(predictions)
        
        # Sort by confidence score
        predictions.sort(key=lambda x: x['confidenceScore'], reverse=True)
        
        # Add veterinarian recommendation for low confidence
        for pred in predictions:
            if pred['confidenceScore'] < 40:
                pred['recommendation'] = 'Confidence is low. We recommend consulting a veterinarian for accurate diagnosis.'
        
        return predictions
    
    def log_feedback(self, feedback_data):
        """Log prediction feedback for model improvement."""
        try:
            feedback_file = 'feedback_log.json'
            
            feedback_entry = {
                'timestamp': datetime.now().isoformat(),
                'model_version': self.model_version,
                **feedback_data
            }
            
            # Append to feedback log
            if os.path.exists(feedback_file):
                with open(feedback_file, 'r') as f:
                    feedback_log = json.load(f)
            else:
                feedback_log = []
            
            feedback_log.append(feedback_entry)
            
            with open(feedback_file, 'w') as f:
                json.dump(feedback_log, f, indent=2)
            
            logger.info(f"Feedback logged: {feedback_data.get('prediction_id')}")
            
        except Exception as e:
            logger.error(f"Error logging feedback: {e}")
    
    def get_model_performance_metrics(self):
        """Get performance metrics for the current models."""
        metrics = {
            'model_version': self.model_version,
            'loaded_at': self.loaded_at,
            'multimodal_available': self.multimodal_predictor is not None,
            'image_classifier_available': self.image_classifier is not None,
            'symptom_analyzer_available': self.symptom_analyzer is not None,
            'supported_diseases': len(self.diseases),
            'disease_list': list(self.diseases.keys())
        }
        
        return metrics
