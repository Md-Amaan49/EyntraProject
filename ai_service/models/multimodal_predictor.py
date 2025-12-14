"""
Multi-modal disease prediction combining symptoms and images.
"""
import numpy as np
from sklearn.ensemble import VotingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
import logging

from .image_classifier import CattleDiseaseImageClassifier
from .symptom_analyzer import SymptomAnalyzer

logger = logging.getLogger(__name__)


class MultiModalPredictor:
    """
    Multi-modal predictor that combines symptom analysis and image classification
    for more accurate disease prediction.
    """
    
    def __init__(self, image_model_path=None, symptom_model_path=None):
        """
        Initialize the multi-modal predictor.
        
        Args:
            image_model_path: Path to trained image classification model
            symptom_model_path: Path to trained symptom analysis model
        """
        self.image_classifier = CattleDiseaseImageClassifier(image_model_path)
        self.symptom_analyzer = SymptomAnalyzer(symptom_model_path)
        self.fusion_model = None
        self.scaler = StandardScaler()
        
        # Initialize fusion model
        self._initialize_fusion_model()
    
    def _initialize_fusion_model(self):
        """Initialize the model fusion component."""
        # Ensemble of different algorithms for robust prediction
        self.fusion_model = VotingClassifier([
            ('rf', RandomForestClassifier(n_estimators=100, random_state=42)),
            ('lr', LogisticRegression(random_state=42, max_iter=1000))
        ], voting='soft')
    
    def predict(self, symptoms=None, images=None, cattle_metadata=None):
        """
        Predict diseases using multi-modal approach.
        
        Args:
            symptoms: Text description of symptoms
            images: List of image data (base64 or PIL Images)
            cattle_metadata: Additional cattle information
            
        Returns:
            Combined predictions with confidence scores
        """
        predictions = []
        
        # Get symptom-based predictions
        symptom_predictions = []
        if symptoms:
            try:
                symptom_predictions = self.symptom_analyzer.predict_diseases(symptoms)
                logger.info(f"Generated {len(symptom_predictions)} symptom-based predictions")
            except Exception as e:
                logger.error(f"Error in symptom analysis: {e}")
        
        # Get image-based predictions
        image_predictions = []
        if images:
            try:
                image_predictions = self.image_classifier.predict(images)
                logger.info(f"Generated {len(image_predictions)} image-based predictions")
            except Exception as e:
                logger.error(f"Error in image analysis: {e}")
        
        # Combine predictions using fusion strategy
        combined_predictions = self._fuse_predictions(
            symptom_predictions, 
            image_predictions, 
            cattle_metadata
        )
        
        # Apply cattle-specific adjustments
        if cattle_metadata:
            combined_predictions = self._apply_cattle_context(
                combined_predictions, 
                cattle_metadata
            )
        
        # Calculate confidence and severity
        for pred in combined_predictions:
            pred.update(self._calculate_prediction_metrics(pred, symptoms, images))
        
        # Sort by confidence and return top predictions
        combined_predictions.sort(key=lambda x: x['confidence_score'], reverse=True)
        
        return combined_predictions[:5]  # Return top 5 predictions
    
    def _fuse_predictions(self, symptom_preds, image_preds, metadata):
        """
        Fuse predictions from different modalities.
        
        Args:
            symptom_preds: Predictions from symptom analysis
            image_preds: Predictions from image analysis
            metadata: Cattle metadata
            
        Returns:
            Fused predictions
        """
        # Create a unified prediction map
        disease_map = {}
        
        # Process symptom predictions
        for pred in symptom_preds:
            disease_name = pred['disease_name']
            if disease_name not in disease_map:
                disease_map[disease_name] = {
                    'disease_name': disease_name,
                    'symptom_confidence': pred['confidence_score'],
                    'image_confidence': 0.0,
                    'symptom_evidence': pred.get('matched_keywords', []),
                    'image_evidence': [],
                    'prediction_sources': ['symptom_analysis']
                }
            else:
                # Average if multiple symptom predictions for same disease
                existing = disease_map[disease_name]
                existing['symptom_confidence'] = (
                    existing['symptom_confidence'] + pred['confidence_score']
                ) / 2
        
        # Process image predictions
        for pred in image_preds:
            disease_name = pred['disease_name']
            if disease_name not in disease_map:
                disease_map[disease_name] = {
                    'disease_name': disease_name,
                    'symptom_confidence': 0.0,
                    'image_confidence': pred['confidence_score'],
                    'symptom_evidence': [],
                    'image_evidence': [f"Image_{pred.get('image_index', 0)}"],
                    'prediction_sources': ['image_analysis']
                }
            else:
                # Combine with existing symptom prediction
                existing = disease_map[disease_name]
                existing['image_confidence'] = pred['confidence_score']
                existing['image_evidence'].append(f"Image_{pred.get('image_index', 0)}")
                if 'image_analysis' not in existing['prediction_sources']:
                    existing['prediction_sources'].append('image_analysis')
        
        # Calculate combined confidence scores
        fused_predictions = []
        for disease_name, pred_data in disease_map.items():
            combined_confidence = self._calculate_combined_confidence(
                pred_data['symptom_confidence'],
                pred_data['image_confidence'],
                pred_data['prediction_sources']
            )
            
            fused_pred = {
                'disease_name': disease_name,
                'confidence_score': combined_confidence,
                'symptom_confidence': pred_data['symptom_confidence'],
                'image_confidence': pred_data['image_confidence'],
                'evidence': {
                    'symptoms': pred_data['symptom_evidence'],
                    'images': pred_data['image_evidence']
                },
                'prediction_sources': pred_data['prediction_sources'],
                'fusion_method': 'weighted_average'
            }
            
            fused_predictions.append(fused_pred)
        
        return fused_predictions
    
    def _calculate_combined_confidence(self, symptom_conf, image_conf, sources):
        """
        Calculate combined confidence from multiple modalities.
        
        Args:
            symptom_conf: Confidence from symptom analysis
            image_conf: Confidence from image analysis
            sources: List of prediction sources
            
        Returns:
            Combined confidence score
        """
        # Weights for different modalities
        symptom_weight = 0.6
        image_weight = 0.4
        
        # Adjust weights based on available sources
        if 'symptom_analysis' in sources and 'image_analysis' in sources:
            # Both modalities available - use weighted average
            combined = (symptom_conf * symptom_weight + image_conf * image_weight)
            
            # Boost confidence when both modalities agree
            if abs(symptom_conf - image_conf) < 20:  # Within 20% agreement
                agreement_boost = 1.1
            else:
                agreement_boost = 1.0
            
            combined *= agreement_boost
            
        elif 'symptom_analysis' in sources:
            # Only symptom analysis available
            combined = symptom_conf * 0.8  # Slight penalty for single modality
            
        elif 'image_analysis' in sources:
            # Only image analysis available
            combined = image_conf * 0.7  # Higher penalty for image-only
            
        else:
            combined = 0.0
        
        # Ensure confidence is between 0 and 100
        return min(max(combined, 0.0), 100.0)
    
    def _apply_cattle_context(self, predictions, metadata):
        """
        Apply cattle-specific context to adjust predictions.
        
        Args:
            predictions: List of disease predictions
            metadata: Cattle metadata (breed, age, etc.)
            
        Returns:
            Context-adjusted predictions
        """
        breed = metadata.get('breed', '').lower()
        age = metadata.get('age', 0)
        gender = metadata.get('gender', '').lower()
        
        # Breed-specific disease susceptibilities
        breed_susceptibilities = {
            'holstein': {
                'mastitis': 1.2,
                'milk_fever': 1.3,
                'ketosis': 1.1
            },
            'jersey': {
                'mastitis': 1.1,
                'milk_fever': 1.4,
                'displaced_abomasum': 0.8
            },
            'angus': {
                'respiratory_infection': 0.9,
                'foot_rot': 1.1
            },
            'brahman': {
                'heat_stress': 0.7,
                'tick_fever': 1.3
            }
        }
        
        # Age-specific adjustments
        age_adjustments = {
            'calf_diseases': {'max_age': 6, 'multiplier': 1.5},
            'adult_diseases': {'min_age': 24, 'multiplier': 1.2},
            'geriatric_diseases': {'min_age': 96, 'multiplier': 1.3}
        }
        
        # Gender-specific adjustments
        gender_adjustments = {
            'female': {
                'mastitis': 1.0,  # Only females can get mastitis
                'milk_fever': 1.0,
                'reproductive_disorders': 1.0
            },
            'male': {
                'mastitis': 0.0,  # Males cannot get mastitis
                'milk_fever': 0.0,
                'urinary_blockage': 1.2
            }
        }
        
        # Apply adjustments
        for pred in predictions:
            disease_name = pred['disease_name'].lower().replace(' ', '_')
            original_confidence = pred['confidence_score']
            
            # Breed adjustment
            if breed in breed_susceptibilities:
                breed_factors = breed_susceptibilities[breed]
                for disease_pattern, factor in breed_factors.items():
                    if disease_pattern in disease_name:
                        pred['confidence_score'] *= factor
                        pred['breed_adjustment'] = factor
                        break
            
            # Age adjustment
            for age_category, age_info in age_adjustments.items():
                if 'min_age' in age_info and age >= age_info['min_age']:
                    if age_category.replace('_diseases', '') in disease_name:
                        pred['confidence_score'] *= age_info['multiplier']
                        pred['age_adjustment'] = age_info['multiplier']
                elif 'max_age' in age_info and age <= age_info['max_age']:
                    if age_category.replace('_diseases', '') in disease_name:
                        pred['confidence_score'] *= age_info['multiplier']
                        pred['age_adjustment'] = age_info['multiplier']
            
            # Gender adjustment
            if gender in gender_adjustments:
                gender_factors = gender_adjustments[gender]
                for disease_pattern, factor in gender_factors.items():
                    if disease_pattern in disease_name:
                        pred['confidence_score'] *= factor
                        pred['gender_adjustment'] = factor
                        break
            
            # Ensure confidence stays within bounds
            pred['confidence_score'] = min(max(pred['confidence_score'], 0.0), 100.0)
            
            # Track if adjustments were made
            if pred['confidence_score'] != original_confidence:
                pred['context_adjusted'] = True
                pred['original_confidence'] = original_confidence
        
        return predictions
    
    def _calculate_prediction_metrics(self, prediction, symptoms, images):
        """
        Calculate additional metrics for the prediction.
        
        Args:
            prediction: Disease prediction
            symptoms: Original symptom text
            images: Original images
            
        Returns:
            Dictionary of additional metrics
        """
        metrics = {}
        
        # Calculate severity level
        severity_score = prediction['confidence_score'] / 100.0
        
        # Adjust severity based on evidence strength
        evidence_count = (
            len(prediction.get('evidence', {}).get('symptoms', [])) +
            len(prediction.get('evidence', {}).get('images', []))
        )
        
        if evidence_count >= 3:
            severity_multiplier = 1.2
        elif evidence_count >= 2:
            severity_multiplier = 1.1
        else:
            severity_multiplier = 1.0
        
        severity_score *= severity_multiplier
        
        # Determine severity level
        if severity_score >= 0.8:
            metrics['severity_level'] = 'critical'
        elif severity_score >= 0.6:
            metrics['severity_level'] = 'high'
        elif severity_score >= 0.4:
            metrics['severity_level'] = 'medium'
        else:
            metrics['severity_level'] = 'low'
        
        # Calculate prediction reliability
        source_count = len(prediction.get('prediction_sources', []))
        if source_count >= 2:
            metrics['reliability'] = 'high'
        elif source_count == 1:
            metrics['reliability'] = 'medium'
        else:
            metrics['reliability'] = 'low'
        
        # Add recommendation based on confidence
        if prediction['confidence_score'] < 40:
            metrics['recommendation'] = (
                'Low confidence prediction. Strongly recommend consulting '
                'a veterinarian for accurate diagnosis.'
            )
        elif prediction['confidence_score'] < 60:
            metrics['recommendation'] = (
                'Moderate confidence prediction. Consider veterinary '
                'consultation for confirmation.'
            )
        else:
            metrics['recommendation'] = (
                'Good confidence prediction. Monitor symptoms and follow '
                'treatment recommendations. Consult veterinarian if symptoms worsen.'
            )
        
        return metrics
    
    def get_prediction_explanation(self, prediction):
        """
        Generate human-readable explanation for a prediction.
        
        Args:
            prediction: Disease prediction dictionary
            
        Returns:
            Explanation string
        """
        disease_name = prediction['disease_name']
        confidence = prediction['confidence_score']
        sources = prediction.get('prediction_sources', [])
        evidence = prediction.get('evidence', {})
        
        explanation = f"Predicted {disease_name} with {confidence:.1f}% confidence.\n\n"
        
        # Explain evidence
        if 'symptom_analysis' in sources and evidence.get('symptoms'):
            symptoms_str = ', '.join(evidence['symptoms'])
            explanation += f"Symptom evidence: {symptoms_str}\n"
        
        if 'image_analysis' in sources and evidence.get('images'):
            images_str = ', '.join(evidence['images'])
            explanation += f"Image evidence: {images_str}\n"
        
        # Explain confidence level
        if confidence >= 70:
            explanation += "\nHigh confidence prediction based on strong evidence match."
        elif confidence >= 50:
            explanation += "\nModerate confidence prediction. Additional symptoms or veterinary consultation recommended."
        else:
            explanation += "\nLow confidence prediction. Veterinary consultation strongly recommended."
        
        # Add context adjustments if any
        if prediction.get('context_adjusted'):
            explanation += f"\n\nPrediction adjusted based on cattle characteristics:"
            if 'breed_adjustment' in prediction:
                explanation += f"\n- Breed susceptibility factor: {prediction['breed_adjustment']:.1f}"
            if 'age_adjustment' in prediction:
                explanation += f"\n- Age factor: {prediction['age_adjustment']:.1f}"
            if 'gender_adjustment' in prediction:
                explanation += f"\n- Gender factor: {prediction['gender_adjustment']:.1f}"
        
        return explanation
    
    def batch_predict(self, batch_data):
        """
        Process multiple predictions in batch.
        
        Args:
            batch_data: List of prediction requests
            
        Returns:
            List of prediction results
        """
        results = []
        
        for i, data in enumerate(batch_data):
            try:
                symptoms = data.get('symptoms')
                images = data.get('images', [])
                metadata = data.get('cattle_metadata', {})
                
                predictions = self.predict(symptoms, images, metadata)
                
                results.append({
                    'index': i,
                    'success': True,
                    'predictions': predictions
                })
                
            except Exception as e:
                logger.error(f"Error processing batch item {i}: {e}")
                results.append({
                    'index': i,
                    'success': False,
                    'error': str(e)
                })
        
        return results