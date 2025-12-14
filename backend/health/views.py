"""
Views for health assessment and symptom submission.
"""
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404

from .models import SymptomEntry, HealthImage
from .serializers import (
    SymptomEntrySerializer,
    HealthImageSerializer,
    SymptomSubmissionSerializer,
    TreatmentRecommendationRequestSerializer
)
from .treatment_engine import treatment_engine
from cattle.models import Cattle
from users.permissions import IsOwner


class SymptomEntryListCreateView(generics.ListCreateAPIView):
    """
    List all symptom entries or create a new one.
    
    GET /api/health/symptoms/
    POST /api/health/symptoms/
    """
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = SymptomEntrySerializer
    
    def get_queryset(self):
        """Return symptom entries for user's cattle."""
        user_cattle_ids = Cattle.objects.filter(
            owner=self.request.user
        ).values_list('id', flat=True)
        
        return SymptomEntry.objects.filter(
            cattle_id__in=user_cattle_ids
        ).select_related('cattle', 'created_by').prefetch_related('images')


class SymptomEntryDetailView(generics.RetrieveAPIView):
    """
    Retrieve a specific symptom entry.
    
    GET /api/health/symptoms/{id}/
    """
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = SymptomEntrySerializer
    
    def get_queryset(self):
        """Return symptom entries for user's cattle."""
        user_cattle_ids = Cattle.objects.filter(
            owner=self.request.user
        ).values_list('id', flat=True)
        
        return SymptomEntry.objects.filter(
            cattle_id__in=user_cattle_ids
        ).select_related('cattle', 'created_by').prefetch_related('images')


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOwner])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def submit_symptoms_with_images(request):
    """
    Submit symptoms with multiple images in a single request.
    
    POST /api/health/submit/
    
    Accepts multipart/form-data with:
    - cattle_id: UUID
    - symptoms: string (min 10 chars)
    - severity: mild|moderate|severe
    - additional_notes: string (optional)
    - images: file[] (up to 5 images)
    """
    serializer = SymptomSubmissionSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    validated_data = serializer.validated_data
    cattle = validated_data.pop('cattle')
    images_data = validated_data.pop('images', [])
    
    # Create symptom entry
    symptom_entry = SymptomEntry.objects.create(
        cattle=cattle,
        symptoms=validated_data['symptoms'],
        severity=validated_data.get('severity', 'moderate'),
        additional_notes=validated_data.get('additional_notes', ''),
        created_by=request.user
    )
    
    # Create health images
    created_images = []
    for image_file in images_data:
        health_image = HealthImage.objects.create(
            cattle=cattle,
            symptom_entry=symptom_entry,
            image=image_file,
            uploaded_by=request.user,
            metadata={
                'size': image_file.size,
                'name': image_file.name
            }
        )
        created_images.append(health_image)
    
    # Return complete response
    response_serializer = SymptomEntrySerializer(symptom_entry, context={'request': request})
    
    return Response({
        'message': 'Symptoms and images submitted successfully',
        'symptom_entry': response_serializer.data,
        'images_count': len(created_images)
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOwner])
@parser_classes([MultiPartParser, FormParser])
def upload_health_image(request):
    """
    Upload a single health image.
    
    POST /api/health/images/
    
    Accepts multipart/form-data with:
    - cattle: UUID
    - image: file
    - image_type: lesion|wound|discharge|general
    - symptom_entry: UUID (optional)
    """
    # Verify cattle ownership
    cattle_id = request.data.get('cattle')
    if not cattle_id:
        return Response({
            'error': 'cattle field is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    cattle = get_object_or_404(Cattle, id=cattle_id, owner=request.user)
    
    serializer = HealthImageSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwner])
def cattle_health_history(request, cattle_id):
    """
    Get complete health history for a cattle including symptoms and images.
    
    GET /api/health/cattle/{cattle_id}/history/
    """
    # Verify cattle ownership
    cattle = get_object_or_404(Cattle, id=cattle_id, owner=request.user)
    
    # Get all symptom entries
    symptom_entries = SymptomEntry.objects.filter(
        cattle=cattle
    ).select_related('created_by').prefetch_related('images')
    
    # Get all images
    all_images = HealthImage.objects.filter(cattle=cattle).select_related('uploaded_by')
    
    return Response({
        'cattle': {
            'id': str(cattle.id),
            'identification_number': cattle.identification_number,
            'breed': cattle.breed,
            'health_status': cattle.health_status
        },
        'symptom_entries': SymptomEntrySerializer(
            symptom_entries,
            many=True,
            context={'request': request}
        ).data,
        'total_images': all_images.count(),
        'total_symptom_entries': symptom_entries.count()
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwner])
def health_images_list(request):
    """
    List all health images for user's cattle.
    
    GET /api/health/images/
    """
    user_cattle_ids = Cattle.objects.filter(
        owner=request.user
    ).values_list('id', flat=True)
    
    images = HealthImage.objects.filter(
        cattle_id__in=user_cattle_ids
    ).select_related('cattle', 'uploaded_by', 'symptom_entry')
    
    serializer = HealthImageSerializer(
        images,
        many=True,
        context={'request': request}
    )
    
    return Response({
        'count': images.count(),
        'images': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_treatment_recommendations(request):
    """
    Get treatment recommendations based on disease predictions.
    
    POST /api/health/treatments/recommend/
    
    Expects JSON with:
    - disease_predictions: List of disease predictions from AI
    - cattle_metadata: Optional cattle information (breed, age, etc.)
    - preference: Optional treatment preference ('traditional', 'allopathic', 'balanced')
    """
    serializer = TreatmentRecommendationRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    validated_data = serializer.validated_data
    disease_predictions = validated_data['disease_predictions']
    cattle_metadata = validated_data.get('cattle_metadata', {})
    preference = validated_data.get('preference', 'balanced')
    
    try:
        # Get treatment recommendations from engine
        recommendations = treatment_engine.get_recommendations(
            disease_predictions=disease_predictions,
            cattle_metadata=cattle_metadata,
            preference=preference
        )
        
        return Response({
            'success': True,
            'recommendations': recommendations,
            'request_info': {
                'preference': preference,
                'cattle_metadata': cattle_metadata,
                'predictions_count': len(disease_predictions)
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': 'Failed to generate treatment recommendations',
            'message': str(e),
            'fallback_recommendations': treatment_engine._get_fallback_recommendations()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOwner])
def get_cattle_specific_treatments(request, cattle_id):
    """
    Get treatment recommendations for a specific cattle based on AI predictions.
    
    POST /api/health/cattle/{cattle_id}/treatments/
    
    Expects JSON with:
    - disease_predictions: List of disease predictions from AI
    - preference: Optional treatment preference ('traditional', 'allopathic', 'balanced')
    """
    # Verify cattle ownership
    cattle = get_object_or_404(Cattle, id=cattle_id, owner=request.user)
    
    serializer = TreatmentRecommendationRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    validated_data = serializer.validated_data
    disease_predictions = validated_data['disease_predictions']
    preference = validated_data.get('preference', 'balanced')
    
    # Build cattle metadata from the cattle object
    cattle_metadata = {
        'breed': cattle.breed,
        'age': cattle.age,
        'gender': cattle.gender,
        'weight': float(cattle.weight) if cattle.weight else None,
        'health_status': cattle.health_status,
        'identification_number': cattle.identification_number
    }
    
    # Add any additional metadata from the cattle object
    if cattle.metadata:
        cattle_metadata.update(cattle.metadata)
    
    try:
        # Get treatment recommendations from engine
        recommendations = treatment_engine.get_recommendations(
            disease_predictions=disease_predictions,
            cattle_metadata=cattle_metadata,
            preference=preference
        )
        
        return Response({
            'success': True,
            'cattle_info': {
                'id': str(cattle.id),
                'identification_number': cattle.identification_number,
                'breed': cattle.breed,
                'age': cattle.age,
                'health_status': cattle.health_status
            },
            'recommendations': recommendations,
            'request_info': {
                'preference': preference,
                'predictions_count': len(disease_predictions)
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': 'Failed to generate treatment recommendations',
            'message': str(e),
            'cattle_info': {
                'id': str(cattle.id),
                'identification_number': cattle.identification_number
            },
            'fallback_recommendations': treatment_engine._get_fallback_recommendations()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
