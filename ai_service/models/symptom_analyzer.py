"""
Advanced symptom analysis using NLP and machine learning.
"""
import numpy as np
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
import pickle
import logging

logger = logging.getLogger(__name__)


class SymptomAnalyzer:
    """Advanced symptom analysis for disease prediction."""
    
    def __init__(self, model_path=None):
        """
        Initialize the symptom analyzer.
        
        Args:
            model_path: Path to pre-trained model file
        """
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2),
            lowercase=True
        )
        self.classifier = None
        self.disease_symptoms_db = {}
        self.symptom_keywords = self._load_symptom_keywords()
        
        if model_path:
            self.load_model(model_path)
        else:
            self.classifier = LogisticRegression(random_state=42)
    
    def _load_symptom_keywords(self):
        """Load comprehensive symptom keywords and their weights."""
        return {
            # Fever and temperature
            'fever': {'weight': 0.9, 'category': 'systemic', 'severity': 'high'},
            'temperature': {'weight': 0.8, 'category': 'systemic', 'severity': 'medium'},
            'hot': {'weight': 0.6, 'category': 'systemic', 'severity': 'medium'},
            'warm': {'weight': 0.4, 'category': 'systemic', 'severity': 'low'},
            'hyperthermia': {'weight': 0.9, 'category': 'systemic', 'severity': 'high'},
            
            # Appetite and feeding
            'appetite': {'weight': 0.7, 'category': 'digestive', 'severity': 'medium'},
            'eating': {'weight': 0.6, 'category': 'digestive', 'severity': 'medium'},
            'food': {'weight': 0.5, 'category': 'digestive', 'severity': 'low'},
            'anorexia': {'weight': 0.8, 'category': 'digestive', 'severity': 'high'},
            'refusing': {'weight': 0.7, 'category': 'digestive', 'severity': 'medium'},
            
            # Respiratory symptoms
            'cough': {'weight': 0.8, 'category': 'respiratory', 'severity': 'high'},
            'breathing': {'weight': 0.7, 'category': 'respiratory', 'severity': 'medium'},
            'breath': {'weight': 0.6, 'category': 'respiratory', 'severity': 'medium'},
            'dyspnea': {'weight': 0.9, 'category': 'respiratory', 'severity': 'high'},
            'wheezing': {'weight': 0.8, 'category': 'respiratory', 'severity': 'high'},
            'tachypnea': {'weight': 0.8, 'category': 'respiratory', 'severity': 'high'},
            
            # Discharge and secretions
            'discharge': {'weight': 0.8, 'category': 'secretion', 'severity': 'high'},
            'runny': {'weight': 0.6, 'category': 'secretion', 'severity': 'medium'},
            'nose': {'weight': 0.5, 'category': 'secretion', 'severity': 'low'},
            'nasal': {'weight': 0.6, 'category': 'secretion', 'severity': 'medium'},
            'mucus': {'weight': 0.7, 'category': 'secretion', 'severity': 'medium'},
            
            # Eye symptoms
            'eye': {'weight': 0.5, 'category': 'ocular', 'severity': 'low'},
            'eyes': {'weight': 0.5, 'category': 'ocular', 'severity': 'low'},
            'conjunctivitis': {'weight': 0.8, 'category': 'ocular', 'severity': 'high'},
            'lacrimation': {'weight': 0.7, 'category': 'ocular', 'severity': 'medium'},
            'tearing': {'weight': 0.6, 'category': 'ocular', 'severity': 'medium'},
            
            # Skin and lesions
            'blister': {'weight': 0.9, 'category': 'dermatological', 'severity': 'high'},
            'sore': {'weight': 0.7, 'category': 'dermatological', 'severity': 'medium'},
            'wound': {'weight': 0.7, 'category': 'dermatological', 'severity': 'medium'},
            'lesion': {'weight': 0.8, 'category': 'dermatological', 'severity': 'high'},
            'rash': {'weight': 0.6, 'category': 'dermatological', 'severity': 'medium'},
            'ulcer': {'weight': 0.8, 'category': 'dermatological', 'severity': 'high'},
            
            # Locomotion
            'lame': {'weight': 0.8, 'category': 'locomotor', 'severity': 'high'},
            'limp': {'weight': 0.7, 'category': 'locomotor', 'severity': 'medium'},
            'walk': {'weight': 0.6, 'category': 'locomotor', 'severity': 'medium'},
            'lameness': {'weight': 0.8, 'category': 'locomotor', 'severity': 'high'},
            'gait': {'weight': 0.6, 'category': 'locomotor', 'severity': 'medium'},
            
            # Digestive symptoms
            'diarrhea': {'weight': 0.8, 'category': 'digestive', 'severity': 'high'},
            'loose': {'weight': 0.6, 'category': 'digestive', 'severity': 'medium'},
            'stool': {'weight': 0.5, 'category': 'digestive', 'severity': 'low'},
            'vomit': {'weight': 0.8, 'category': 'digestive', 'severity': 'high'},
            'regurgitation': {'weight': 0.7, 'category': 'digestive', 'severity': 'medium'},
            
            # Salivation
            'saliva': {'weight': 0.7, 'category': 'oral', 'severity': 'medium'},
            'drool': {'weight': 0.6, 'category': 'oral', 'severity': 'medium'},
            'salivation': {'weight': 0.7, 'category': 'oral', 'severity': 'medium'},
            'hypersalivation': {'weight': 0.8, 'category': 'oral', 'severity': 'high'},
            
            # Swelling and inflammation
            'swollen': {'weight': 0.7, 'category': 'inflammatory', 'severity': 'medium'},
            'swelling': {'weight': 0.7, 'category': 'inflammatory', 'severity': 'medium'},
            'inflammation': {'weight': 0.8, 'category': 'inflammatory', 'severity': 'high'},
            'edema': {'weight': 0.8, 'category': 'inflammatory', 'severity': 'high'},
            
            # Pain and discomfort
            'pain': {'weight': 0.6, 'category': 'pain', 'severity': 'medium'},
            'painful': {'weight': 0.6, 'category': 'pain', 'severity': 'medium'},
            'discomfort': {'weight': 0.5, 'category': 'pain', 'severity': 'low'},
            'tender': {'weight': 0.6, 'category': 'pain', 'severity': 'medium'},
            
            # General condition
            'weak': {'weight': 0.6, 'category': 'general', 'severity': 'medium'},
            'tired': {'weight': 0.5, 'category': 'general', 'severity': 'low'},
            'lethargy': {'weight': 0.7, 'category': 'general', 'severity': 'medium'},
            'depression': {'weight': 0.6, 'category': 'general', 'severity': 'medium'},
            'listless': {'weight': 0.6, 'category': 'general', 'severity': 'medium'},
            
            # Milk production (for dairy cattle)
            'milk': {'weight': 0.6, 'category': 'production', 'severity': 'medium'},
            'production': {'weight': 0.5, 'category': 'production', 'severity': 'low'},
            'udder': {'weight': 0.7, 'category': 'mammary', 'severity': 'medium'},
            'mastitis': {'weight': 0.9, 'category': 'mammary', 'severity': 'high'},
        }
    
    def preprocess_symptoms(self, symptoms_text):
        """
        Preprocess symptom text for analysis.
        
        Args:
            symptoms_text: Raw symptom description
            
        Returns:
            Cleaned and processed text
        """
        # Convert to lowercase
        text = symptoms_text.lower()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove special characters but keep medical terms
        text = re.sub(r'[^\w\s\-]', ' ', text)
        
        # Handle common abbreviations
        abbreviations = {
            'temp': 'temperature',
            'resp': 'respiratory',
            'gi': 'gastrointestinal',
            'uri': 'upper respiratory infection',
            'lri': 'lower respiratory infection'
        }
        
        for abbr, full in abbreviations.items():
            text = text.replace(abbr, full)
        
        return text
    
    def extract_symptom_features(self, symptoms_text):
        """
        Extract features from symptom text.
        
        Args:
            symptoms_text: Symptom description
            
        Returns:
            Dictionary of extracted features
        """
        processed_text = self.preprocess_symptoms(symptoms_text)
        words = processed_text.split()
        
        features = {
            'text_length': len(symptoms_text),
            'word_count': len(words),
            'symptom_categories': {},
            'severity_indicators': [],
            'temporal_indicators': [],
            'keyword_matches': {},
            'symptom_score': 0.0
        }
        
        # Analyze each word
        for word in words:
            if word in self.symptom_keywords:
                keyword_info = self.symptom_keywords[word]
                category = keyword_info['category']
                weight = keyword_info['weight']
                severity = keyword_info['severity']
                
                # Update category counts
                if category not in features['symptom_categories']:
                    features['symptom_categories'][category] = 0
                features['symptom_categories'][category] += weight
                
                # Track keyword matches
                features['keyword_matches'][word] = weight
                
                # Update overall symptom score
                features['symptom_score'] += weight
                
                # Track severity indicators
                if severity == 'high':
                    features['severity_indicators'].append(word)
        
        # Detect temporal indicators
        temporal_patterns = [
            r'(\d+)\s*(day|days|hour|hours|week|weeks)',
            r'(yesterday|today|recently|sudden|gradual)',
            r'(acute|chronic|persistent|intermittent)'
        ]
        
        for pattern in temporal_patterns:
            matches = re.findall(pattern, processed_text, re.IGNORECASE)
            features['temporal_indicators'].extend(matches)
        
        # Detect severity modifiers
        severity_modifiers = {
            'severe': 1.5,
            'mild': 0.7,
            'moderate': 1.0,
            'extreme': 1.8,
            'slight': 0.5,
            'intense': 1.6,
            'acute': 1.4,
            'chronic': 1.2
        }
        
        severity_multiplier = 1.0
        for modifier, multiplier in severity_modifiers.items():
            if modifier in processed_text:
                severity_multiplier = max(severity_multiplier, multiplier)
        
        features['symptom_score'] *= severity_multiplier
        features['severity_multiplier'] = severity_multiplier
        
        return features
    
    def predict_diseases(self, symptoms_text, top_k=5):
        """
        Predict diseases based on symptom analysis.
        
        Args:
            symptoms_text: Symptom description
            top_k: Number of top predictions to return
            
        Returns:
            List of disease predictions with confidence scores
        """
        features = self.extract_symptom_features(symptoms_text)
        
        # Rule-based prediction using symptom patterns
        predictions = self._rule_based_prediction(features)
        
        # If we have a trained classifier, use it too
        if self.classifier and hasattr(self.classifier, 'predict_proba'):
            ml_predictions = self._ml_based_prediction(symptoms_text)
            predictions.extend(ml_predictions)
        
        # Combine and rank predictions
        predictions = self._combine_predictions(predictions)
        
        # Sort by confidence and return top k
        predictions.sort(key=lambda x: x['confidence_score'], reverse=True)
        
        return predictions[:top_k]
    
    def _rule_based_prediction(self, features):
        """Rule-based disease prediction using symptom patterns."""
        predictions = []
        
        # Define disease patterns
        disease_patterns = {
            'foot_and_mouth_disease': {
                'required_categories': ['dermatological', 'oral'],
                'keywords': ['blister', 'sore', 'mouth', 'foot', 'lame', 'fever', 'saliva'],
                'base_confidence': 0.8,
                'severity_bonus': 0.2
            },
            'mastitis': {
                'required_categories': ['mammary', 'inflammatory'],
                'keywords': ['milk', 'udder', 'swollen', 'hot', 'pain', 'discharge'],
                'base_confidence': 0.7,
                'severity_bonus': 0.15
            },
            'respiratory_infection': {
                'required_categories': ['respiratory'],
                'keywords': ['cough', 'breathing', 'nose', 'discharge', 'fever'],
                'base_confidence': 0.6,
                'severity_bonus': 0.2
            },
            'digestive_disorder': {
                'required_categories': ['digestive'],
                'keywords': ['diarrhea', 'appetite', 'weak', 'stool', 'vomit'],
                'base_confidence': 0.5,
                'severity_bonus': 0.1
            },
            'lameness': {
                'required_categories': ['locomotor'],
                'keywords': ['lame', 'limp', 'walk', 'gait', 'pain'],
                'base_confidence': 0.6,
                'severity_bonus': 0.1
            },
            'conjunctivitis': {
                'required_categories': ['ocular'],
                'keywords': ['eye', 'discharge', 'tearing', 'swollen'],
                'base_confidence': 0.5,
                'severity_bonus': 0.1
            }
        }
        
        for disease_name, pattern in disease_patterns.items():
            # Check if required categories are present
            category_match = any(
                cat in features['symptom_categories'] 
                for cat in pattern['required_categories']
            )
            
            if not category_match:
                continue
            
            # Calculate keyword match score
            keyword_matches = 0
            total_weight = 0
            
            for keyword in pattern['keywords']:
                if keyword in features['keyword_matches']:
                    keyword_matches += 1
                    total_weight += features['keyword_matches'][keyword]
            
            if keyword_matches == 0:
                continue
            
            # Calculate confidence score
            keyword_ratio = keyword_matches / len(pattern['keywords'])
            weight_score = min(total_weight / 3.0, 1.0)  # Normalize
            
            confidence = pattern['base_confidence'] * (keyword_ratio * 0.6 + weight_score * 0.4)
            
            # Apply severity bonus
            if features['severity_indicators']:
                confidence += pattern['severity_bonus']
            
            # Apply severity multiplier
            confidence *= features.get('severity_multiplier', 1.0)
            
            # Ensure confidence is between 0 and 1
            confidence = min(max(confidence, 0.0), 1.0)
            
            if confidence > 0.2:  # Only include if confidence > 20%
                predictions.append({
                    'disease_name': disease_name.replace('_', ' ').title(),
                    'confidence_score': confidence * 100,  # Convert to percentage
                    'prediction_method': 'symptom_analysis',
                    'matched_keywords': [k for k in pattern['keywords'] if k in features['keyword_matches']],
                    'symptom_categories': list(features['symptom_categories'].keys())
                })
        
        return predictions
    
    def _ml_based_prediction(self, symptoms_text):
        """Machine learning based prediction (placeholder for trained model)."""
        # This would use a trained classifier
        # For now, return empty list
        return []
    
    def _combine_predictions(self, predictions):
        """Combine predictions from different methods."""
        # Group by disease name
        disease_map = {}
        
        for pred in predictions:
            name = pred['disease_name']
            if name in disease_map:
                # Average confidence scores from multiple methods
                existing = disease_map[name]
                existing['confidence_score'] = (
                    existing['confidence_score'] + pred['confidence_score']
                ) / 2
                
                # Combine matched keywords
                if 'matched_keywords' in pred:
                    existing_keywords = existing.get('matched_keywords', [])
                    new_keywords = pred['matched_keywords']
                    existing['matched_keywords'] = list(set(existing_keywords + new_keywords))
            else:
                disease_map[name] = pred
        
        return list(disease_map.values())
    
    def calculate_symptom_severity(self, symptoms_text):
        """
        Calculate overall symptom severity score.
        
        Args:
            symptoms_text: Symptom description
            
        Returns:
            Severity score and level
        """
        features = self.extract_symptom_features(symptoms_text)
        
        # Base severity from symptom score
        base_severity = min(features['symptom_score'] / 5.0, 1.0)
        
        # Severity indicators bonus
        severity_bonus = len(features['severity_indicators']) * 0.1
        
        # Severity multiplier
        multiplier = features.get('severity_multiplier', 1.0)
        
        # Calculate final severity
        severity_score = (base_severity + severity_bonus) * multiplier
        severity_score = min(max(severity_score, 0.0), 1.0)
        
        # Determine severity level
        if severity_score >= 0.8:
            level = 'critical'
        elif severity_score >= 0.6:
            level = 'high'
        elif severity_score >= 0.4:
            level = 'medium'
        else:
            level = 'low'
        
        return {
            'severity_score': severity_score,
            'severity_level': level,
            'contributing_factors': {
                'base_score': base_severity,
                'severity_indicators': features['severity_indicators'],
                'multiplier': multiplier
            }
        }
    
    def load_model(self, model_path):
        """Load a pre-trained symptom analysis model."""
        try:
            with open(model_path, 'rb') as f:
                model_data = pickle.load(f)
                self.classifier = model_data['classifier']
                self.vectorizer = model_data['vectorizer']
            logger.info(f"Loaded symptom analysis model from {model_path}")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise ValueError(f"Failed to load model from {model_path}")
    
    def save_model(self, model_path):
        """Save the current model."""
        try:
            model_data = {
                'classifier': self.classifier,
                'vectorizer': self.vectorizer
            }
            with open(model_path, 'wb') as f:
                pickle.dump(model_data, f)
            logger.info(f"Model saved to {model_path}")
        except Exception as e:
            logger.error(f"Error saving model: {e}")
            raise ValueError(f"Failed to save model to {model_path}")


class SymptomNormalizer:
    """Utility class for normalizing symptom descriptions."""
    
    @staticmethod
    def normalize_medical_terms(text):
        """Normalize medical terminology."""
        medical_synonyms = {
            'pyrexia': 'fever',
            'hyperthermia': 'fever',
            'anorexia': 'loss of appetite',
            'dyspnea': 'difficulty breathing',
            'tachypnea': 'rapid breathing',
            'bradypnea': 'slow breathing',
            'lacrimation': 'tearing',
            'rhinorrhea': 'runny nose',
            'epistaxis': 'nosebleed',
            'hemoptysis': 'coughing blood',
            'melena': 'black stool',
            'hematuria': 'blood in urine',
            'polyuria': 'excessive urination',
            'oliguria': 'reduced urination',
            'polydipsia': 'excessive drinking',
            'adipsia': 'lack of thirst'
        }
        
        normalized_text = text.lower()
        for medical_term, common_term in medical_synonyms.items():
            normalized_text = normalized_text.replace(medical_term, common_term)
        
        return normalized_text
    
    @staticmethod
    def extract_temporal_information(text):
        """Extract temporal information from symptom descriptions."""
        temporal_patterns = {
            'duration': r'(?:for|since|over|about)\s+(\d+)\s*(day|days|hour|hours|week|weeks|month|months)',
            'onset': r'(sudden|gradual|slow|rapid|immediate|progressive)',
            'frequency': r'(once|twice|several times|frequently|rarely|occasionally)\s*(?:a|per)?\s*(day|hour|week)',
            'timing': r'(morning|afternoon|evening|night|dawn|dusk)'
        }
        
        temporal_info = {}
        for category, pattern in temporal_patterns.items():
            matches = re.findall(pattern, text.lower(), re.IGNORECASE)
            if matches:
                temporal_info[category] = matches
        
        return temporal_info