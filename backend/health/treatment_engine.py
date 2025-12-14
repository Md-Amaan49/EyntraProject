"""
Treatment recommendation engine for cattle diseases.
"""
import logging
from typing import List, Dict, Any, Optional
from django.db.models import Q
from .disease_models import Disease
from .treatment_models import (
    Treatment, TreatmentRecommendation, TreatmentProtocol, 
    TreatmentCategory, ProtocolStep
)

logger = logging.getLogger(__name__)


class TreatmentRecommendationEngine:
    """Engine for generating treatment recommendations based on disease predictions."""
    
    def __init__(self):
        """Initialize the treatment recommendation engine."""
        self.traditional_weight = 0.4
        self.allopathic_weight = 0.6
        self.effectiveness_weights = {
            'very_high': 1.0,
            'high': 0.8,
            'moderate': 0.6,
            'low': 0.4
        }
    
    def get_recommendations(
        self, 
        disease_predictions: List[Dict[str, Any]], 
        cattle_metadata: Optional[Dict[str, Any]] = None,
        preference: str = 'balanced'
    ) -> Dict[str, Any]:
        """
        Get treatment recommendations for disease predictions.
        
        Args:
            disease_predictions: List of disease predictions with confidence scores
            cattle_metadata: Cattle information (breed, age, gender, etc.)
            preference: Treatment preference ('traditional', 'allopathic', 'balanced')
            
        Returns:
            Dictionary containing treatment recommendations
        """
        try:
            if not disease_predictions:
                return self._get_general_care_recommendations()
            
            # Get the top disease prediction
            top_prediction = disease_predictions[0]
            disease_name = top_prediction.get('diseaseName', '').strip()
            confidence_score = top_prediction.get('confidenceScore', 0)
            severity_level = top_prediction.get('severityLevel', 'medium')
            
            # Find matching disease in database
            disease = self._find_disease_by_name(disease_name)
            
            if disease:
                # Get specific recommendations for the disease
                recommendations = self._get_disease_specific_recommendations(
                    disease, confidence_score, severity_level, cattle_metadata, preference
                )
            else:
                # Fallback to symptom-based recommendations
                recommendations = self._get_symptom_based_recommendations(
                    top_prediction, cattle_metadata, preference
                )
            
            # Add general care and disclaimer
            recommendations.update({
                'general_care': self._get_general_care_recommendations()['general_care'],
                'disclaimer': self._get_treatment_disclaimer(),
                'confidence_note': self._get_confidence_note(confidence_score),
                'veterinary_consultation': self._should_recommend_vet_consultation(
                    confidence_score, severity_level
                )
            })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating treatment recommendations: {e}")
            return self._get_fallback_recommendations()
    
    def _find_disease_by_name(self, disease_name: str) -> Optional[Disease]:
        """Find disease by name with fuzzy matching."""
        if not disease_name:
            return None
        
        try:
            # Exact match first
            disease = Disease.objects.filter(
                name__iexact=disease_name,
                is_active=True
            ).first()
            
            if disease:
                return disease
            
            # Fuzzy matching
            disease = Disease.objects.filter(
                Q(name__icontains=disease_name) |
                Q(scientific_name__icontains=disease_name),
                is_active=True
            ).first()
            
            return disease
            
        except Exception as e:
            logger.error(f"Error finding disease '{disease_name}': {e}")
            return None
    
    def _get_disease_specific_recommendations(
        self, 
        disease: Disease, 
        confidence_score: float, 
        severity_level: str,
        cattle_metadata: Optional[Dict[str, Any]],
        preference: str
    ) -> Dict[str, Any]:
        """Get specific recommendations for a known disease."""
        recommendations = {
            'disease_info': {
                'name': disease.name,
                'scientific_name': disease.scientific_name,
                'description': disease.description,
                'severity': disease.severity
            },
            'traditional': [],
            'allopathic': [],
            'protocols': [],
            'prevention': disease.prevention_measures or '',
            'care_instructions': disease.care_instructions or ''
        }
        
        # Get treatment recommendations
        treatment_recs = TreatmentRecommendation.objects.filter(
            disease=disease
        ).select_related('treatment', 'treatment__category').order_by('priority_order')
        
        # Separate by category and apply filters
        for rec in treatment_recs:
            treatment = rec.treatment
            
            if not treatment.is_active:
                continue
            
            # Apply cattle-specific adjustments
            adjusted_treatment = self._apply_cattle_adjustments(
                treatment, rec, cattle_metadata, severity_level
            )
            
            # Add to appropriate category
            if treatment.is_traditional:
                recommendations['traditional'].append(adjusted_treatment)
            elif treatment.is_allopathic:
                recommendations['allopathic'].append(adjusted_treatment)
        
        # Get treatment protocols
        protocols = TreatmentProtocol.objects.filter(
            disease=disease,
            is_active=True
        ).prefetch_related('steps__treatment')
        
        for protocol in protocols:
            if self._protocol_matches_conditions(protocol, severity_level, cattle_metadata):
                protocol_data = self._format_protocol(protocol)
                recommendations['protocols'].append(protocol_data)
        
        # Apply preference weighting
        recommendations = self._apply_preference_weighting(recommendations, preference)
        
        # Ensure we have both types if available
        recommendations = self._ensure_dual_treatment_types(recommendations, disease)
        
        return recommendations
    
    def _apply_cattle_adjustments(
        self, 
        treatment: Treatment, 
        recommendation: TreatmentRecommendation,
        cattle_metadata: Optional[Dict[str, Any]],
        severity_level: str
    ) -> Dict[str, Any]:
        """Apply cattle-specific adjustments to treatment."""
        adjusted = {
            'name': treatment.name,
            'description': treatment.description,
            'ingredients': treatment.ingredients,
            'dosage': treatment.dosage,
            'administration_method': treatment.get_administration_method_display(),
            'frequency': treatment.frequency,
            'duration': treatment.duration,
            'precautions': treatment.precautions,
            'side_effects': treatment.side_effects,
            'effectiveness': treatment.get_effectiveness_display(),
            'requires_prescription': treatment.requires_prescription,
            'estimated_cost': treatment.estimated_cost,
            'availability': treatment.availability,
            'recommendation_strength': recommendation.get_recommendation_strength_display()
        }
        
        # Add preparation method for traditional treatments
        if treatment.preparation_method:
            adjusted['preparation_method'] = treatment.preparation_method
        
        # Apply severity-specific adjustments
        if recommendation.severity_specific and severity_level in recommendation.severity_specific:
            severity_adj = recommendation.severity_specific[severity_level]
            if 'dosage_adjustment' in severity_adj:
                adjusted['dosage'] = f"{adjusted['dosage']} (Adjusted for {severity_level} severity: {severity_adj['dosage_adjustment']})"
            if 'additional_precautions' in severity_adj:
                adjusted['precautions'] = adjusted['precautions'] + severity_adj['additional_precautions']
        
        # Apply cattle-specific adjustments
        if cattle_metadata:
            # Age adjustments
            age = cattle_metadata.get('age', 0)
            if recommendation.age_specific:
                age_adjustments = self._get_age_adjustments(recommendation.age_specific, age)
                if age_adjustments:
                    adjusted.update(age_adjustments)
            
            # Breed adjustments
            breed = cattle_metadata.get('breed', '').lower()
            if recommendation.breed_specific and breed in recommendation.breed_specific:
                breed_adj = recommendation.breed_specific[breed]
                if 'special_notes' in breed_adj:
                    adjusted['breed_notes'] = breed_adj['special_notes']
        
        # Add special instructions
        if recommendation.special_instructions:
            adjusted['special_instructions'] = recommendation.special_instructions
        
        return adjusted
    
    def _get_age_adjustments(self, age_specific: Dict, age: int) -> Dict[str, Any]:
        """Get age-specific adjustments."""
        adjustments = {}
        
        # Define age categories
        if age <= 6:  # Calf
            category = 'calf'
        elif age <= 24:  # Young adult
            category = 'young_adult'
        elif age <= 96:  # Adult
            category = 'adult'
        else:  # Senior
            category = 'senior'
        
        if category in age_specific:
            age_adj = age_specific[category]
            if 'dosage_modifier' in age_adj:
                adjustments['age_dosage_note'] = f"Dosage for {category}: {age_adj['dosage_modifier']}"
            if 'precautions' in age_adj:
                adjustments['age_precautions'] = age_adj['precautions']
        
        return adjustments
    
    def _protocol_matches_conditions(
        self, 
        protocol: TreatmentProtocol, 
        severity_level: str,
        cattle_metadata: Optional[Dict[str, Any]]
    ) -> bool:
        """Check if protocol matches current conditions."""
        # Check severity range
        if protocol.severity_range and severity_level not in protocol.severity_range:
            return False
        
        # Check age range
        if cattle_metadata and protocol.age_range:
            age = cattle_metadata.get('age', 0)
            min_age = protocol.age_range.get('min', 0)
            max_age = protocol.age_range.get('max', 999)
            if not (min_age <= age <= max_age):
                return False
        
        return True
    
    def _format_protocol(self, protocol: TreatmentProtocol) -> Dict[str, Any]:
        """Format protocol for response."""
        steps = []
        for step in protocol.steps.all().order_by('step_number'):
            steps.append({
                'step_number': step.step_number,
                'step_type': step.get_step_type_display(),
                'treatment': step.treatment.name,
                'instructions': step.instructions,
                'timing': step.timing,
                'duration': step.duration,
                'conditions': step.conditions
            })
        
        return {
            'name': protocol.name,
            'type': protocol.get_protocol_type_display(),
            'description': protocol.description,
            'total_duration': protocol.total_duration,
            'steps': steps,
            'expected_outcomes': protocol.expected_outcomes,
            'success_indicators': protocol.success_indicators,
            'requires_veterinary_supervision': protocol.requires_veterinary_supervision
        }
    
    def _apply_preference_weighting(
        self, 
        recommendations: Dict[str, Any], 
        preference: str
    ) -> Dict[str, Any]:
        """Apply user preference weighting to recommendations."""
        if preference == 'traditional':
            # Prioritize traditional treatments
            recommendations['traditional'] = recommendations['traditional'][:3]
            recommendations['allopathic'] = recommendations['allopathic'][:2]
        elif preference == 'allopathic':
            # Prioritize allopathic treatments
            recommendations['allopathic'] = recommendations['allopathic'][:3]
            recommendations['traditional'] = recommendations['traditional'][:2]
        else:  # balanced
            # Equal representation
            recommendations['traditional'] = recommendations['traditional'][:3]
            recommendations['allopathic'] = recommendations['allopathic'][:3]
        
        return recommendations
    
    def _ensure_dual_treatment_types(
        self, 
        recommendations: Dict[str, Any], 
        disease: Disease
    ) -> Dict[str, Any]:
        """Ensure both traditional and allopathic treatments are provided."""
        # If missing traditional treatments, add from disease data
        if not recommendations['traditional'] and disease.traditional_treatments:
            for treatment_data in disease.traditional_treatments[:2]:
                recommendations['traditional'].append({
                    'name': treatment_data.get('name', 'Traditional Remedy'),
                    'description': treatment_data.get('description', ''),
                    'ingredients': treatment_data.get('ingredients', []),
                    'preparation_method': treatment_data.get('preparation', ''),
                    'dosage': treatment_data.get('dosage', 'As directed'),
                    'frequency': treatment_data.get('frequency', 'As needed'),
                    'duration': treatment_data.get('duration', '5-7 days'),
                    'precautions': treatment_data.get('precautions', []),
                    'source': 'disease_database'
                })
        
        # If missing allopathic treatments, add from disease data
        if not recommendations['allopathic'] and disease.allopathic_treatments:
            for treatment_data in disease.allopathic_treatments[:2]:
                recommendations['allopathic'].append({
                    'name': treatment_data.get('name', 'Veterinary Treatment'),
                    'description': treatment_data.get('description', ''),
                    'medication': treatment_data.get('medication', ''),
                    'dosage': treatment_data.get('dosage', 'As prescribed'),
                    'administration': treatment_data.get('administration', 'As directed'),
                    'frequency': treatment_data.get('frequency', 'As prescribed'),
                    'duration': treatment_data.get('duration', 'As prescribed'),
                    'precautions': treatment_data.get('precautions', []),
                    'requires_prescription': True,
                    'source': 'disease_database'
                })
        
        return recommendations
    
    def _get_symptom_based_recommendations(
        self, 
        prediction: Dict[str, Any], 
        cattle_metadata: Optional[Dict[str, Any]],
        preference: str
    ) -> Dict[str, Any]:
        """Get recommendations based on symptoms when disease is not in database."""
        disease_name = prediction.get('diseaseName', 'Unknown Condition')
        
        # Generate generic recommendations based on disease type
        recommendations = {
            'disease_info': {
                'name': disease_name,
                'description': f"Condition identified as {disease_name} based on symptom analysis",
                'note': 'This condition is not in our treatment database. Recommendations are based on general symptom patterns.'
            },
            'traditional': self._get_generic_traditional_treatments(disease_name),
            'allopathic': self._get_generic_allopathic_treatments(disease_name),
            'protocols': [],
            'prevention': 'Maintain good hygiene, proper nutrition, and regular health monitoring.',
            'care_instructions': 'Provide supportive care and monitor symptoms closely.'
        }
        
        return recommendations
    
    def _get_generic_traditional_treatments(self, disease_name: str) -> List[Dict[str, Any]]:
        """Get generic traditional treatments based on disease type."""
        disease_lower = disease_name.lower()
        
        # Common traditional treatments by condition type
        if any(term in disease_lower for term in ['fever', 'temperature', 'hot']):
            return [{
                'name': 'Cooling Herbal Remedy',
                'ingredients': ['Neem leaves', 'Tulsi leaves', 'Ginger'],
                'preparation_method': 'Boil neem and tulsi leaves in water, add ginger paste',
                'dosage': '500ml of decoction',
                'frequency': 'Twice daily',
                'duration': '3-5 days',
                'precautions': ['Monitor temperature', 'Ensure adequate hydration']
            }]
        
        elif any(term in disease_lower for term in ['respiratory', 'cough', 'breathing']):
            return [{
                'name': 'Respiratory Support Remedy',
                'ingredients': ['Turmeric powder', 'Honey', 'Ginger juice'],
                'preparation_method': 'Mix turmeric powder with honey and ginger juice',
                'dosage': '2 tablespoons',
                'frequency': 'Three times daily',
                'duration': '5-7 days',
                'precautions': ['Keep animal warm', 'Ensure good ventilation']
            }]
        
        elif any(term in disease_lower for term in ['digestive', 'diarrhea', 'stomach']):
            return [{
                'name': 'Digestive Support Remedy',
                'ingredients': ['Fenugreek seeds', 'Cumin seeds', 'Rock salt'],
                'preparation_method': 'Grind fenugreek and cumin seeds, mix with rock salt',
                'dosage': '1 tablespoon in warm water',
                'frequency': 'Twice daily',
                'duration': '3-5 days',
                'precautions': ['Ensure clean water supply', 'Monitor hydration']
            }]
        
        else:
            return [{
                'name': 'General Herbal Support',
                'ingredients': ['Neem leaves', 'Turmeric powder', 'Jaggery'],
                'preparation_method': 'Mix neem paste with turmeric and jaggery',
                'dosage': 'As per animal size',
                'frequency': 'Once daily',
                'duration': '5-7 days',
                'precautions': ['Monitor for allergic reactions', 'Maintain hygiene']
            }]
    
    def _get_generic_allopathic_treatments(self, disease_name: str) -> List[Dict[str, Any]]:
        """Get generic allopathic treatments based on disease type."""
        return [{
            'name': 'Veterinary Consultation Required',
            'description': f'Professional veterinary assessment needed for {disease_name}',
            'medication': 'To be prescribed by qualified veterinarian',
            'dosage': 'As per veterinary prescription',
            'administration': 'As directed by veterinarian',
            'frequency': 'As prescribed',
            'duration': 'As prescribed',
            'precautions': [
                'Consult qualified veterinarian immediately',
                'Follow prescription instructions exactly',
                'Complete full course of treatment'
            ],
            'requires_prescription': True,
            'note': 'Specific medication will depend on veterinary diagnosis'
        }]
    
    def _get_general_care_recommendations(self) -> Dict[str, Any]:
        """Get general care recommendations."""
        return {
            'general_care': [
                'Ensure clean and dry environment',
                'Provide fresh water and quality feed',
                'Monitor temperature and appetite regularly',
                'Isolate affected cattle if necessary',
                'Maintain proper hygiene and sanitation',
                'Keep detailed records of symptoms and treatments',
                'Ensure adequate rest and minimal stress',
                'Monitor for improvement or worsening of symptoms'
            ]
        }
    
    def _get_treatment_disclaimer(self) -> str:
        """Get treatment disclaimer."""
        return (
            "These treatment recommendations are for informational purposes only and should not "
            "replace professional veterinary diagnosis and treatment. Always consult with a qualified "
            "veterinarian before starting any treatment, especially for serious conditions. Monitor "
            "the animal closely during treatment and seek immediate veterinary care if symptoms worsen."
        )
    
    def _get_confidence_note(self, confidence_score: float) -> str:
        """Get confidence-based note."""
        if confidence_score < 40:
            return (
                "Low confidence in disease identification. These are general recommendations. "
                "Veterinary consultation is strongly recommended for accurate diagnosis and treatment."
            )
        elif confidence_score < 60:
            return (
                "Moderate confidence in disease identification. Consider veterinary consultation "
                "to confirm diagnosis before starting treatment."
            )
        else:
            return (
                "Good confidence in disease identification. Follow treatment recommendations "
                "and monitor progress. Consult veterinarian if symptoms worsen."
            )
    
    def _should_recommend_vet_consultation(
        self, 
        confidence_score: float, 
        severity_level: str
    ) -> Dict[str, Any]:
        """Determine if veterinary consultation should be recommended."""
        urgency = 'routine'
        reason = []
        
        if confidence_score < 40:
            urgency = 'urgent'
            reason.append('Low confidence in disease identification')
        
        if severity_level in ['high', 'critical']:
            urgency = 'urgent'
            reason.append('High severity condition detected')
        
        if severity_level == 'critical':
            urgency = 'emergency'
            reason.append('Critical condition requiring immediate attention')
        
        return {
            'recommended': urgency != 'routine',
            'urgency': urgency,
            'reasons': reason,
            'message': self._get_vet_consultation_message(urgency, reason)
        }
    
    def _get_vet_consultation_message(self, urgency: str, reasons: List[str]) -> str:
        """Get veterinary consultation message."""
        if urgency == 'emergency':
            return (
                "EMERGENCY: Seek immediate veterinary attention. This condition requires "
                "professional medical intervention without delay."
            )
        elif urgency == 'urgent':
            return (
                "URGENT: Consult a veterinarian as soon as possible. " + 
                " ".join(reasons) + ". Professional diagnosis and treatment are recommended."
            )
        else:
            return (
                "Consider scheduling a veterinary consultation for professional confirmation "
                "of diagnosis and treatment plan."
            )
    
    def _get_fallback_recommendations(self) -> Dict[str, Any]:
        """Get fallback recommendations when system fails."""
        return {
            'error': 'Unable to generate specific treatment recommendations',
            'traditional': [{
                'name': 'General Supportive Care',
                'ingredients': ['Clean water', 'Quality feed', 'Rest'],
                'preparation_method': 'Provide supportive care',
                'dosage': 'As needed',
                'frequency': 'Continuous',
                'duration': 'Until recovery',
                'precautions': ['Monitor closely', 'Seek veterinary help if worsening']
            }],
            'allopathic': [{
                'name': 'Veterinary Consultation',
                'description': 'Professional veterinary assessment required',
                'medication': 'As prescribed by veterinarian',
                'dosage': 'As prescribed',
                'administration': 'As directed',
                'requires_prescription': True
            }],
            'general_care': self._get_general_care_recommendations()['general_care'],
            'disclaimer': self._get_treatment_disclaimer(),
            'veterinary_consultation': {
                'recommended': True,
                'urgency': 'urgent',
                'reasons': ['System error in recommendation generation'],
                'message': 'Unable to provide specific recommendations. Consult veterinarian immediately.'
            }
        }


# Global treatment engine instance
treatment_engine = TreatmentRecommendationEngine()