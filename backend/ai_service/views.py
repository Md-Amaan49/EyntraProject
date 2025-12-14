"""
Django views for AI prediction service integration.
"""
import base64
import uuid
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.core.files.base import ContentFile

from cattle.models import Cattle
from health.models import SymptomEntry, HealthImage
from health.disease_models import Disease, AIModel
from users.permissions import IsOwner
from .client import ai_client, AIServiceException
from .serializers import (
    DiseasePredictionRequestSerializer,
    DiseasePredictionResponseSerializer,
    AIModelInfoSerializer
)

import logging
logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOwner])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def predict_disease(request):
    """
    Predict disease using AI service.
    
    POST /api/ai/predict/
    Accepts multipart/form-data or JSON with:
    - cattle_id: UUID (required)
    - symptoms: string (required, min 10 chars)
    - images: file[] (optional, up to 5 images)
    - save_assessment: boolean (optional, default True)
    """
    serializer = DiseasePredictionRequestSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    validated_data = serializer.validated_data
    cattle = validated_data['cattle']
    symptoms = validated_data['symptoms']
    images = validated_data.get('images', [])
    save_assessment = validated_data.get('save_assessment', True)
    
    try:
        # Prepare cattle metadata
        cattle_metadata = {
            'breed': cattle.breed,
            'age': cattle.age,
            'gender': cattle.gender,
            'weight': float(cattle.weight) if cattle.weight else None,
            'health_status': cattle.health_status,
            'identification_number': cattle.identification_number
        }
        
        # Convert images to base64 for AI service
        image_data = []
        for image_file in images:
            try:
                image_content = image_file.read()
                image_base64 = base64.b64encode(image_content).decode('utf-8')
                image_data.append(image_base64)
                image_file.seek(0)  # Reset file pointer
            except Exception as e:
                logger.error(f"Error processing image {image_file.name}: {e}")
                continue
        
        # Call AI service
        ai_response = ai_client.predict_disease(
            symptoms=symptoms,
            images=image_data,
            cattle_metadata=cattle_metadata
        )
        
        # Process AI response
        predictions = ai_response.get('predictions', [])
        
        # Save assessment if requested
        symptom_entry = None
        if save_assessment:
            try:
                # Create symptom entry
                symptom_entry = SymptomEntry.objects.create(
                    cattle=cattle,
                    symptoms=symptoms,
                    severity='moderate',  # Default, can be updated based on prediction
                    created_by=request.user
                )
                
                # Save images if provided
                for image_file in images:
                    HealthImage.objects.create(
                        cattle=cattle,
                        symptom_entry=symptom_entry,
                        image=image_file,
                        image_type='general',
                        uploaded_by=request.user,
                        metadata={
                            'size': image_file.size,
                            'name': image_file.name
                        }
                    )
                
                # Update cattle health status if severe prediction
                if predictions:
                    top_prediction = predictions[0]
                    severity = top_prediction.get('severityLevel', 'medium')
                    if severity in ['high', 'critical']:
                        cattle.health_status = 'sick'
                        cattle.save()
                
            except Exception as e:
                logger.error(f"Error saving assessment: {e}")
        
        # Prepare response
        response_data = {
            'success': True,
            'predictions': predictions,
            'model_version': ai_response.get('model_version', 'unknown'),
            'timestamp': ai_response.get('timestamp'),
            'assessment_saved': save_assessment and symptom_entry is not None,
            'symptom_entry_id': str(symptom_entry.id) if symptom_entry else None,
            'disclaimer': (
                "This AI prediction is for informational purposes only and should not replace "
                "professional veterinary diagnosis and treatment. Always consult with a qualified "
                "veterinarian for serious health concerns or before starting any treatment."
            )
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except AIServiceException as e:
        logger.error(f"AI service error: {e}")
        return Response({
            'success': False,
            'error': 'AI_SERVICE_ERROR',
            'message': str(e),
            'fallback_message': 'AI service is currently unavailable. Please try again later or consult a veterinarian directly.'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    except Exception as e:
        logger.error(f"Unexpected error in disease prediction: {e}")
        return Response({
            'success': False,
            'error': 'PREDICTION_ERROR',
            'message': 'An unexpected error occurred during prediction',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_diseases(request):
    """
    List all active diseases that can be detected.
    GET /api/ai/diseases/
    """
    diseases = Disease.objects.filter(is_active=True).order_by('name')
    
    disease_list = []
    for disease in diseases:
        disease_list.append({
            'id': str(disease.id),
            'name': disease.name,
            'scientific_name': disease.scientific_name,
            'description': disease.description,
            'severity': disease.severity,
            'common_symptoms': disease.common_symptoms,
            'confidence_threshold': disease.detection_confidence_threshold,
            'total_training_images': disease.total_training_images
        })
    
    return Response({
        'count': len(disease_list),
        'diseases': disease_list
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_disease_details(request, disease_id):
    """
    Get detailed information about a specific disease.
    GET /api/ai/diseases/{disease_id}/
    """
    disease = get_object_or_404(Disease, id=disease_id, is_active=True)
    
    disease_data = {
        'id': str(disease.id),
        'name': disease.name,
        'scientific_name': disease.scientific_name,
        'description': disease.description,
        'severity': disease.severity,
        'common_symptoms': disease.common_symptoms,
        'traditional_treatments': disease.traditional_treatments,
        'allopathic_treatments': disease.allopathic_treatments,
        'prevention_measures': disease.prevention_measures,
        'care_instructions': disease.care_instructions,
        'confidence_threshold': disease.detection_confidence_threshold,
        'total_training_images': disease.total_training_images,
        'created_at': disease.created_at,
        'updated_at': disease.updated_at
    }
    
    return Response(disease_data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def model_info(request):
    """
    Get information about the currently active AI model.
    GET /api/ai/model/info/
    """
    try:
        # Get AI service model info
        ai_service_info = ai_client.get_model_version()
        
        # Get Django model info
        active_model = AIModel.objects.filter(is_active=True).first()
        
        if active_model:
            model_data = {
                'id': str(active_model.id),
                'version': active_model.version,
                'description': active_model.description,
                'status': active_model.status,
                'accuracy': active_model.accuracy,
                'precision': active_model.precision,
                'recall': active_model.recall,
                'f1_score': active_model.f1_score,
                'training_dataset_count': active_model.training_dataset_count,
                'training_image_count': active_model.training_image_count,
                'diseases': [
                    {
                        'id': str(disease.id),
                        'name': disease.name
                    }
                    for disease in active_model.diseases.all()
                ],
                'created_at': active_model.created_at,
                'deployed_at': active_model.deployed_at,
                'ai_service_info': ai_service_info
            }
            
            return Response({
                'active_model': model_data,
                'message': 'Active AI model loaded successfully.'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'active_model': None,
                'ai_service_info': ai_service_info,
                'message': 'No active AI model found in Django. Using AI service fallback.'
            }, status=status.HTTP_200_OK)
            
    except AIServiceException as e:
        logger.error(f"AI service error getting model info: {e}")
        return Response({
            'active_model': None,
            'error': 'AI service unavailable',
            'message': str(e)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        return Response({
            'error': 'Failed to get model information',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_feedback(request):
    """
    Submit feedback on AI prediction accuracy.
    POST /api/ai/feedback/
    """
    try:
        prediction_id = request.data.get('prediction_id')
        predicted_disease = request.data.get('predicted_disease')
        actual_disease = request.data.get('actual_disease')
        was_correct = request.data.get('was_correct', False)
        
        if not all([prediction_id, predicted_disease, actual_disease]):
            return Response({
                'error': 'Missing required fields: prediction_id, predicted_disease, actual_disease'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Submit to AI service
        ai_response = ai_client.submit_feedback(
            prediction_id=prediction_id,
            predicted_disease=predicted_disease,
            actual_disease=actual_disease,
            was_correct=was_correct
        )
        
        # TODO: Also store feedback in Django database for analytics
        
        return Response({
            'message': 'Feedback submitted successfully',
            'ai_service_response': ai_response
        }, status=status.HTTP_201_CREATED)
        
    except AIServiceException as e:
        logger.error(f"AI service error submitting feedback: {e}")
        return Response({
            'error': 'Failed to submit feedback to AI service',
            'message': str(e)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        return Response({
            'error': 'Failed to submit feedback',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def health_check(request):
    """
    Check health of AI service integration.
    GET /api/ai/health/
    """
    try:
        ai_health = ai_client.health_check()
        
        return Response({
            'django_ai_integration': 'healthy',
            'ai_service': ai_health,
            'timestamp': ai_health.get('timestamp')
        }, status=status.HTTP_200_OK)
        
    except AIServiceException as e:
        return Response({
            'django_ai_integration': 'healthy',
            'ai_service': 'unhealthy',
            'error': str(e)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)