"""
Views for consultation and veterinarian management.
"""
import math
from decimal import Decimal
from django.shortcuts import get_object_or_404
from django.db.models import Q, Avg, Count
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from geopy.distance import geodesic

from .models import (
    VeterinarianProfile, Consultation, ConsultationMessage, 
    DiseaseAlert, VeterinarianNotification
)
from .serializers import (
    VeterinarianProfileSerializer, ConsultationSerializer,
    ConsultationMessageSerializer, DiseaseAlertSerializer,
    VeterinarianNotificationSerializer
)
from cattle.models import Cattle
from health.models import SymptomEntry


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_veterinarians(request):
    """List all verified veterinarians with optional filtering."""
    try:
        # Get all verified veterinarians
        vets_query = VeterinarianProfile.objects.filter(
            is_verified=True
        ).select_related('user')
        
        # Apply filters
        specialization = request.GET.get('specialization')
        if specialization:
            vets_query = vets_query.filter(
                specializations__contains=[specialization]
            )
        
        availability = request.GET.get('availability')
        if availability == 'available':
            vets_query = vets_query.filter(is_available=True)
        
        rating = request.GET.get('rating')
        if rating:
            vets_query = vets_query.filter(
                average_rating__gte=float(rating)
            )
        
        search = request.GET.get('search')
        if search:
            vets_query = vets_query.filter(
                Q(user__name__icontains=search) |
                Q(specializations__icontains=search) |
                Q(qualification__icontains=search)
            )
        
        # Pagination
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        start = (page - 1) * page_size
        end = start + page_size
        
        total_count = vets_query.count()
        veterinarians = vets_query[start:end]
        
        serializer = VeterinarianProfileSerializer(veterinarians, many=True)
        
        return Response({
            'results': serializer.data,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_veterinarian(request):
    """Register a new veterinarian profile."""
    try:
        # Check if user is already a veterinarian
        if hasattr(request.user, 'veterinarian_profile'):
            return Response(
                {'error': 'User already has a veterinarian profile'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update user role to veterinarian
        request.user.role = 'veterinarian'
        request.user.save()
        
        # Create veterinarian profile
        data = request.data.copy()
        data['user'] = request.user.id
        
        serializer = VeterinarianProfileSerializer(data=data)
        if serializer.is_valid():
            vet_profile = serializer.save()
            return Response(
                VeterinarianProfileSerializer(vet_profile).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def find_nearby_veterinarians(request):
    """Find veterinarians near a given location."""
    try:
        # Get location parameters
        latitude = request.GET.get('latitude')
        longitude = request.GET.get('longitude')
        radius_km = int(request.GET.get('radius', 50))
        specialization = request.GET.get('specialization')
        emergency_only = request.GET.get('emergency_only', 'false').lower() == 'true'
        
        if not latitude or not longitude:
            return Response(
                {'error': 'Latitude and longitude are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_location = (float(latitude), float(longitude))
        
        # Get all available veterinarians
        vets_query = VeterinarianProfile.objects.filter(
            is_available=True,
            is_verified=True
        )
        
        if emergency_only:
            vets_query = vets_query.filter(is_emergency_available=True)
        
        if specialization:
            vets_query = vets_query.filter(
                specializations__contains=[specialization]
            )
        
        nearby_vets = []
        for vet in vets_query:
            if vet.latitude and vet.longitude:
                vet_location = (float(vet.latitude), float(vet.longitude))
                distance = geodesic(user_location, vet_location).kilometers
                
                if distance <= radius_km:
                    vet_data = VeterinarianProfileSerializer(vet).data
                    vet_data['distance_km'] = round(distance, 2)
                    nearby_vets.append(vet_data)
        
        # Sort by distance
        nearby_vets.sort(key=lambda x: x['distance_km'])
        
        return Response({
            'veterinarians': nearby_vets,
            'total_found': len(nearby_vets)
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def book_consultation(request):
    """Book a consultation with a veterinarian."""
    try:
        data = request.data
        
        # Get required objects
        veterinarian = get_object_or_404(
            VeterinarianProfile, 
            id=data.get('veterinarian_id')
        ).user
        cattle = get_object_or_404(Cattle, id=data.get('cattle_id'))
        
        # Verify cattle ownership
        if cattle.owner != request.user:
            return Response(
                {'error': 'You can only book consultations for your own cattle'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Calculate fees
        vet_profile = veterinarian.veterinarian_profile
        consultation_type = data.get('consultation_type', 'chat')
        is_emergency = data.get('is_emergency', False)
        
        fees = vet_profile.get_consultation_fees()
        if is_emergency:
            consultation_fee = fees['emergency'][consultation_type]
            emergency_fee = consultation_fee - fees[consultation_type]
        else:
            consultation_fee = fees[consultation_type]
            emergency_fee = Decimal('0.00')
        
        total_fee = consultation_fee + emergency_fee
        
        # Create consultation
        consultation = Consultation.objects.create(
            cattle_owner=request.user,
            veterinarian=veterinarian,
            cattle=cattle,
            consultation_type=consultation_type,
            priority='emergency' if is_emergency else 'normal',
            scheduled_time=data.get('scheduled_time'),
            case_description=data.get('case_description', ''),
            symptoms_reported=data.get('symptoms_reported', ''),
            ai_predictions=data.get('ai_predictions', []),
            disease_location=data.get('location', {}),
            consultation_fee=consultation_fee,
            emergency_fee=emergency_fee,
            total_fee=total_fee
        )
        
        return Response(
            ConsultationSerializer(consultation).data,
            status=status.HTTP_201_CREATED
        )
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class ConsultationListView(generics.ListAPIView):
    """List consultations for the authenticated user."""
    serializer_class = ConsultationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'veterinarian':
            return Consultation.objects.filter(veterinarian=user)
        else:
            return Consultation.objects.filter(cattle_owner=user)


class ConsultationDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve and update consultation details."""
    serializer_class = ConsultationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'veterinarian':
            return Consultation.objects.filter(veterinarian=user)
        else:
            return Consultation.objects.filter(cattle_owner=user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_consultation(request, consultation_id):
    """Start a consultation."""
    try:
        consultation = get_object_or_404(
            Consultation, 
            id=consultation_id,
            veterinarian=request.user
        )
        
        if consultation.status != 'scheduled':
            return Response(
                {'error': 'Consultation is not in scheduled status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        consultation.start_consultation()
        
        return Response(
            ConsultationSerializer(consultation).data
        )
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def end_consultation(request, consultation_id):
    """End a consultation."""
    try:
        consultation = get_object_or_404(
            Consultation, 
            id=consultation_id,
            veterinarian=request.user
        )
        
        if consultation.status != 'in_progress':
            return Response(
                {'error': 'Consultation is not in progress'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        notes = request.data.get('notes', '')
        diagnosis = request.data.get('diagnosis', '')
        treatment_plan = request.data.get('treatment_plan', '')
        follow_up_required = request.data.get('follow_up_required', False)
        follow_up_date = request.data.get('follow_up_date')
        
        consultation.veterinarian_notes = notes
        consultation.diagnosis = diagnosis
        consultation.treatment_plan = treatment_plan
        consultation.follow_up_required = follow_up_required
        if follow_up_date:
            consultation.follow_up_date = follow_up_date
        
        consultation.end_consultation()
        
        return Response(
            ConsultationSerializer(consultation).data
        )
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_disease_alert(request):
    """Create a disease alert and notify nearby veterinarians."""
    try:
        data = request.data
        
        # Get cattle and symptom entry
        cattle = get_object_or_404(Cattle, id=data.get('cattle_id'))
        symptom_entry = None
        if data.get('symptom_entry_id'):
            symptom_entry = get_object_or_404(
                SymptomEntry, 
                id=data.get('symptom_entry_id')
            )
        
        # Create disease alert
        alert = DiseaseAlert.objects.create(
            alert_type=data.get('alert_type', 'ai_detection'),
            disease_name=data.get('disease_name'),
            severity=data.get('severity', 'medium'),
            location=data.get('location', {}),
            affected_radius_km=data.get('affected_radius_km', 10),
            cattle=cattle,
            symptom_entry=symptom_entry,
            ai_prediction_data=data.get('ai_prediction_data', {})
        )
        
        # Find and notify nearby veterinarians
        notify_nearby_veterinarians(alert)
        
        return Response(
            DiseaseAlertSerializer(alert).data,
            status=status.HTTP_201_CREATED
        )
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def notify_nearby_veterinarians(disease_alert):
    """Notify veterinarians near a disease alert location."""
    try:
        location = disease_alert.location
        if not location.get('latitude') or not location.get('longitude'):
            return
        
        alert_location = (
            float(location['latitude']), 
            float(location['longitude'])
        )
        
        # Get all available veterinarians
        veterinarians = VeterinarianProfile.objects.filter(
            is_available=True,
            is_verified=True
        )
        
        notifications_created = 0
        for vet in veterinarians:
            if vet.latitude and vet.longitude:
                vet_location = (float(vet.latitude), float(vet.longitude))
                distance = geodesic(alert_location, vet_location).kilometers
                
                # Check if vet is within their service radius or alert radius
                max_distance = max(
                    vet.service_radius_km, 
                    disease_alert.affected_radius_km
                )
                
                if distance <= max_distance:
                    # Create notification
                    VeterinarianNotification.objects.create(
                        veterinarian=vet.user,
                        disease_alert=disease_alert,
                        distance_km=Decimal(str(round(distance, 2)))
                    )
                    notifications_created += 1
        
        return notifications_created
        
    except Exception as e:
        print(f"Error notifying veterinarians: {e}")
        return 0


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_veterinarian_notifications(request):
    """Get disease alert notifications for a veterinarian."""
    try:
        if request.user.role != 'veterinarian':
            return Response(
                {'error': 'Only veterinarians can access notifications'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        notifications = VeterinarianNotification.objects.filter(
            veterinarian=request.user
        ).order_by('-sent_at')
        
        # Filter by status if provided
        status_filter = request.GET.get('status')
        if status_filter:
            notifications = notifications.filter(status=status_filter)
        
        serializer = VeterinarianNotificationSerializer(notifications, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def acknowledge_notification(request, notification_id):
    """Acknowledge a disease alert notification."""
    try:
        notification = get_object_or_404(
            VeterinarianNotification,
            id=notification_id,
            veterinarian=request.user
        )
        
        notification.acknowledge()
        
        return Response(
            VeterinarianNotificationSerializer(notification).data
        )
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )