"""
Views for consultation and veterinarian management.
"""
import math
import uuid
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
    DiseaseAlert, VeterinarianNotification, SymptomReport,
    ConsultationRequest, VeterinarianResponse, VeterinarianNotificationRequest,
    VeterinarianPatient, PatientNote, VeterinarianDashboardStats,
    FollowUpSchedule
)
from .serializers import (
    VeterinarianProfileSerializer, ConsultationSerializer,
    ConsultationMessageSerializer, DiseaseAlertSerializer,
    VeterinarianNotificationSerializer, SymptomReportSerializer,
    ConsultationRequestSerializer, VeterinarianResponseSerializer,
    VeterinarianNotificationRequestSerializer, VeterinarianPatientSerializer,
    PatientNoteSerializer, VeterinarianDashboardStatsSerializer,
    FollowUpScheduleSerializer, ConsultationRequestListSerializer,
    PatientListSerializer
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


# Symptom Reporting and Veterinary Notification Views

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_symptom_report(request):
    """Submit a symptom report and notify nearby veterinarians."""
    try:
        data = request.data
        
        # Get cattle
        cattle = get_object_or_404(Cattle, id=data.get('cattle_id'))
        
        # Verify cattle ownership
        if cattle.owner != request.user:
            return Response(
                {'error': 'You can only report symptoms for your own cattle'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create symptom report
        serializer = SymptomReportSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            symptom_report = serializer.save()
            
            # Create consultation request and notify veterinarians
            consultation_request = create_consultation_request_from_symptom_report(symptom_report)
            
            # Update symptom report status
            symptom_report.status = 'notified'
            symptom_report.save()
            
            return Response({
                'symptom_report': SymptomReportSerializer(symptom_report).data,
                'consultation_request': ConsultationRequestSerializer(consultation_request).data,
                'message': 'Symptom report submitted and veterinarians notified'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def create_consultation_request_from_symptom_report(symptom_report):
    """Create consultation request and notify nearby veterinarians."""
    from datetime import timedelta
    
    # Determine priority based on severity and emergency flag
    if symptom_report.is_emergency:
        priority = 'emergency'
        expires_hours = 2  # Emergency requests expire in 2 hours
    elif symptom_report.severity == 'severe':
        priority = 'urgent'
        expires_hours = 6  # Urgent requests expire in 6 hours
    else:
        priority = 'normal'
        expires_hours = 24  # Normal requests expire in 24 hours
    
    # Create consultation request
    consultation_request = ConsultationRequest.objects.create(
        symptom_report=symptom_report,
        cattle=symptom_report.cattle,
        cattle_owner=symptom_report.cattle_owner,
        priority=priority,
        expires_at=timezone.now() + timedelta(hours=expires_hours)
    )
    
    # Find and notify nearby veterinarians
    notified_vets = notify_nearby_veterinarians_for_consultation(consultation_request)
    
    # Update requested veterinarians list
    consultation_request.requested_veterinarians = [str(vet_id) for vet_id in notified_vets]
    consultation_request.save()
    
    return consultation_request


def notify_nearby_veterinarians_for_consultation(consultation_request, expanded_radius=False):
    """Notify veterinarians near a consultation request location."""
    try:
        location = consultation_request.symptom_report.location
        if not location.get('latitude') or not location.get('longitude'):
            return []
        
        request_location = (
            float(location['latitude']), 
            float(location['longitude'])
        )
        
        # Get available veterinarians based on priority
        vets_query = VeterinarianProfile.objects.filter(
            is_verified=True
        )
        
        if consultation_request.priority == 'emergency':
            # For emergency cases, only notify emergency-available vets
            vets_query = vets_query.filter(
                is_emergency_available=True
            )
        else:
            # For normal/urgent cases, notify available vets
            vets_query = vets_query.filter(is_available=True)
        
        # Exclude veterinarians who have already been notified
        already_notified = consultation_request.requested_veterinarians
        if already_notified:
            vets_query = vets_query.exclude(
                user__id__in=[uuid.UUID(vet_id) for vet_id in already_notified]
            )
        
        notified_vets = []
        initial_radius = 100 if expanded_radius else 50  # Use larger radius if expanding
        max_radius = 200 if expanded_radius else 100     # Maximum search radius
        
        for radius in [initial_radius, max_radius]:
            if notified_vets and not expanded_radius:  # If we found vets in the first radius, don't expand (unless explicitly expanding)
                break
                
            for vet in vets_query:
                if vet.latitude and vet.longitude:
                    vet_location = (float(vet.latitude), float(vet.longitude))
                    distance = geodesic(request_location, vet_location).kilometers
                    
                    if distance <= radius:
                        # Create notification request
                        notification_channels = ['app']  # Default to app notification
                        if consultation_request.priority == 'emergency':
                            notification_channels.extend(['sms', 'email'])
                        
                        VeterinarianNotificationRequest.objects.create(
                            veterinarian=vet.user,
                            consultation_request=consultation_request,
                            notification_channels=notification_channels,
                            distance_km=Decimal(str(round(distance, 2)))
                        )
                        notified_vets.append(vet.user.id)
        
        return notified_vets
        
    except Exception as e:
        print(f"Error notifying veterinarians for consultation: {e}")
        return []


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_consultation_requests(request):
    """Get consultation requests for a veterinarian."""
    try:
        if request.user.role != 'veterinarian':
            return Response(
                {'error': 'Only veterinarians can access consultation requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get notification requests for this veterinarian
        notification_requests = VeterinarianNotificationRequest.objects.filter(
            veterinarian=request.user
        ).select_related('consultation_request__symptom_report__cattle')
        
        # Filter by status if provided
        status_filter = request.GET.get('status', 'pending')
        if status_filter:
            notification_requests = notification_requests.filter(
                consultation_request__status=status_filter
            )
        
        # Add distance information to consultation requests
        consultation_requests = []
        for notification in notification_requests:
            request_data = ConsultationRequestListSerializer(
                notification.consultation_request
            ).data
            request_data['distance_km'] = notification.distance_km
            request_data['notification_id'] = notification.id
            consultation_requests.append(request_data)
        
        # Sort by priority and creation time
        priority_order = {'emergency': 0, 'urgent': 1, 'normal': 2}
        consultation_requests.sort(
            key=lambda x: (priority_order.get(x['priority'], 3), x['created_at'])
        )
        
        return Response({
            'consultation_requests': consultation_requests,
            'total_count': len(consultation_requests)
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_consultation_request(request, request_id):
    """Respond to a consultation request (accept, decline, or request info)."""
    try:
        if request.user.role != 'veterinarian':
            return Response(
                {'error': 'Only veterinarians can respond to consultation requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        consultation_request = get_object_or_404(
            ConsultationRequest,
            id=request_id
        )
        
        # Check if request is still pending and not expired
        if consultation_request.status != 'pending':
            return Response(
                {'error': 'Consultation request is no longer pending'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if consultation_request.is_expired():
            consultation_request.status = 'expired'
            consultation_request.save()
            return Response(
                {'error': 'Consultation request has expired'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        action = request.data.get('action')
        message = request.data.get('message', '')
        
        if action not in ['accept', 'decline', 'request_info']:
            return Response(
                {'error': 'Invalid action. Must be accept, decline, or request_info'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate response time
        notification = VeterinarianNotificationRequest.objects.filter(
            veterinarian=request.user,
            consultation_request=consultation_request
        ).first()
        
        response_time = 0
        if notification:
            response_time = int((timezone.now() - notification.sent_at).total_seconds())
            notification.mark_as_responded()
        
        # Create veterinarian response
        vet_response = VeterinarianResponse.objects.create(
            veterinarian=request.user,
            consultation_request=consultation_request,
            action=action,
            message=message,
            response_time=response_time
        )
        
        # Handle different actions
        if action == 'accept':
            # Check if someone else already accepted
            if consultation_request.status == 'pending':
                success = consultation_request.accept_by_veterinarian(request.user)
                if success:
                    # Add cattle to veterinarian's patient list
                    patient, created = VeterinarianPatient.objects.get_or_create(
                        veterinarian=request.user,
                        cattle=consultation_request.cattle,
                        defaults={
                            'cattle_owner': consultation_request.cattle_owner,
                            'consultation_request': consultation_request
                        }
                    )
                    
                    # Update symptom report status
                    consultation_request.symptom_report.status = 'accepted'
                    consultation_request.symptom_report.save()
                    
                    # Notify cattle owner of acceptance
                    from notifications.services import NotificationService
                    notification_service = NotificationService()
                    
                    notification_service.create_notification(
                        user=consultation_request.cattle_owner,
                        notification_type='consultation_update',
                        title='Consultation Request Accepted',
                        message=f'Dr. {request.user.name} has accepted your consultation request for {consultation_request.cattle.identification_number}. You will be contacted shortly.',
                        priority='high',
                        cattle=consultation_request.cattle,
                        metadata={
                            'veterinarian_name': request.user.name,
                            'consultation_request_id': str(consultation_request.id)
                        },
                        action_url=f'/consultations/requests/{consultation_request.id}/'
                    )
                    
                    # Notify other veterinarians that case is taken
                    other_notifications = VeterinarianNotificationRequest.objects.filter(
                        consultation_request=consultation_request
                    ).exclude(veterinarian=request.user)
                    
                    for notification in other_notifications:
                        notification_service.create_notification(
                            user=notification.veterinarian,
                            notification_type='consultation_update',
                            title='Consultation Request Taken',
                            message=f'The consultation request for {consultation_request.cattle.identification_number} has been accepted by another veterinarian.',
                            priority='medium',
                            cattle=consultation_request.cattle,
                            metadata={
                                'consultation_request_id': str(consultation_request.id),
                                'accepted_by': request.user.name
                            }
                        )
                    
                    return Response({
                        'message': 'Consultation request accepted successfully',
                        'consultation_request': ConsultationRequestSerializer(consultation_request).data,
                        'patient': VeterinarianPatientSerializer(patient).data
                    })
                else:
                    return Response(
                        {'error': 'Request was already accepted by another veterinarian'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        elif action == 'decline':
            consultation_request.decline_by_veterinarian(request.user)
            
            # Notify other veterinarians about the decline
            from notifications.services import NotificationService
            notification_service = NotificationService()
            
            # Check if all nearby vets have declined
            total_notified = len(consultation_request.requested_veterinarians)
            total_declined = len(consultation_request.declined_by)
            
            if total_declined >= total_notified - 1:  # All but one have declined
                # Expand search radius and notify more veterinarians
                additional_vets = notify_nearby_veterinarians_for_consultation(
                    consultation_request, 
                    expanded_radius=True
                )
                if additional_vets:
                    consultation_request.requested_veterinarians.extend([str(vet_id) for vet_id in additional_vets])
                    consultation_request.save()
            
        elif action == 'request_info':
            # Send message to cattle owner requesting more information
            from notifications.services import NotificationService
            notification_service = NotificationService()
            
            notification_service.create_notification(
                user=consultation_request.cattle_owner,
                notification_type='consultation_update',
                title='Additional Information Requested',
                message=f'Dr. {request.user.name} has requested additional information about your cattle {consultation_request.cattle.identification_number}. Message: {message}',
                priority='medium',
                cattle=consultation_request.cattle,
                metadata={
                    'veterinarian_name': request.user.name,
                    'consultation_request_id': str(consultation_request.id),
                    'requested_info': message
                },
                action_url=f'/consultations/requests/{consultation_request.id}/'
            )
        
        return Response({
            'message': f'Response recorded: {action}',
            'response': VeterinarianResponseSerializer(vet_response).data
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_patients(request):
    """Get patients for a veterinarian."""
    try:
        if request.user.role != 'veterinarian':
            return Response(
                {'error': 'Only veterinarians can access patient lists'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        patients = VeterinarianPatient.objects.filter(
            veterinarian=request.user
        ).select_related('cattle', 'cattle_owner')
        
        # Filter by status if provided
        status_filter = request.GET.get('status', 'active')
        if status_filter:
            patients = patients.filter(status=status_filter)
        
        # Serialize with simplified data for listing
        serializer = PatientListSerializer(patients, many=True)
        
        return Response({
            'patients': serializer.data,
            'total_count': patients.count()
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_patient_detail(request, patient_id):
    """Get detailed information about a patient."""
    try:
        patient = get_object_or_404(
            VeterinarianPatient,
            id=patient_id,
            veterinarian=request.user
        )
        
        serializer = VeterinarianPatientSerializer(patient)
        return Response(serializer.data)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_patient_note(request, patient_id):
    """Add a note to a patient."""
    try:
        patient = get_object_or_404(
            VeterinarianPatient,
            id=patient_id,
            veterinarian=request.user
        )
        
        data = request.data.copy()
        data['patient'] = patient.id
        
        serializer = PatientNoteSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            note = serializer.save(patient=patient)
            return Response(
                PatientNoteSerializer(note).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_patient_completed(request, patient_id):
    """Mark a patient case as completed."""
    try:
        patient = get_object_or_404(
            VeterinarianPatient,
            id=patient_id,
            veterinarian=request.user
        )
        
        patient.mark_as_completed()
        
        return Response({
            'message': 'Patient case marked as completed',
            'patient': VeterinarianPatientSerializer(patient).data
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_stats(request):
    """Get dashboard statistics for a veterinarian."""
    try:
        if request.user.role != 'veterinarian':
            return Response(
                {'error': 'Only veterinarians can access dashboard statistics'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Calculate current statistics
        now = timezone.now()
        today = now.date()
        
        # Pending requests
        pending_requests = VeterinarianNotificationRequest.objects.filter(
            veterinarian=request.user,
            consultation_request__status='pending'
        ).count()
        
        # Total consultations
        total_consultations = Consultation.objects.filter(
            veterinarian=request.user,
            status='completed'
        ).count()
        
        # Active patients
        active_patients = VeterinarianPatient.objects.filter(
            veterinarian=request.user,
            status='active'
        ).count()
        
        # Emergency responses (this month)
        emergency_responses = VeterinarianResponse.objects.filter(
            veterinarian=request.user,
            consultation_request__priority='emergency',
            responded_at__month=now.month,
            responded_at__year=now.year
        ).count()
        
        # Average response time (this month)
        responses = VeterinarianResponse.objects.filter(
            veterinarian=request.user,
            responded_at__month=now.month,
            responded_at__year=now.year
        )
        
        avg_response_time = 0
        if responses.exists():
            total_time = sum(r.response_time for r in responses)
            avg_response_time = total_time / responses.count() / 60  # Convert to minutes
        
        # Patient satisfaction rating
        completed_consultations = Consultation.objects.filter(
            veterinarian=request.user,
            status='completed',
            owner_rating__isnull=False
        )
        
        satisfaction_rating = 0
        if completed_consultations.exists():
            satisfaction_rating = completed_consultations.aggregate(
                avg_rating=Avg('owner_rating')
            )['avg_rating'] or 0
        
        # Revenue calculations (this month)
        month_consultations = Consultation.objects.filter(
            veterinarian=request.user,
            status='completed',
            created_at__month=now.month,
            created_at__year=now.year
        )
        
        total_earnings = sum(c.total_fee for c in month_consultations)
        consultation_fees = sum(c.consultation_fee for c in month_consultations)
        emergency_fees = sum(c.emergency_fee for c in month_consultations)
        
        stats_data = {
            'pending_requests': pending_requests,
            'total_consultations': total_consultations,
            'active_patients': active_patients,
            'emergency_responses': emergency_responses,
            'average_response_time': round(avg_response_time, 2),
            'patient_satisfaction_rating': round(satisfaction_rating, 2),
            'total_earnings': total_earnings,
            'consultation_fees': consultation_fees,
            'emergency_fees': emergency_fees,
            'last_updated': now
        }
        
        return Response(stats_data)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def expire_consultation_request(request, request_id):
    """Manually expire a consultation request."""
    try:
        consultation_request = get_object_or_404(
            ConsultationRequest,
            id=request_id
        )
        
        # Only allow cattle owner or system admin to expire requests
        if (request.user != consultation_request.cattle_owner and 
            request.user.role != 'admin'):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if consultation_request.status == 'pending':
            consultation_request.status = 'expired'
            consultation_request.save()
            
            return Response({
                'message': 'Consultation request expired successfully',
                'consultation_request': ConsultationRequestSerializer(consultation_request).data
            })
        else:
            return Response(
                {'error': 'Request is not in pending status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def schedule_follow_up(request, patient_id):
    """Schedule a follow-up appointment for a patient."""
    try:
        patient = get_object_or_404(
            VeterinarianPatient,
            id=patient_id,
            veterinarian=request.user
        )
        
        data = request.data
        
        follow_up = FollowUpSchedule.objects.create(
            patient=patient,
            scheduled_date=data.get('scheduled_date'),
            follow_up_type=data.get('follow_up_type', 'check_up'),
            notes=data.get('notes', ''),
            created_by=request.user
        )
        
        # Update patient's next follow-up date
        patient.next_follow_up = follow_up.scheduled_date
        patient.save()
        
        # Create reminder notification for cattle owner
        from notifications.services import NotificationService
        notification_service = NotificationService()
        
        notification_service.create_notification(
            user=patient.cattle_owner,
            notification_type='consultation_reminder',
            title='Follow-up Appointment Scheduled',
            message=f'Dr. {request.user.name} has scheduled a {follow_up.get_follow_up_type_display().lower()} follow-up for your cattle {patient.cattle.identification_number} on {follow_up.scheduled_date.strftime("%B %d, %Y at %I:%M %p")}.',
            priority='medium',
            cattle=patient.cattle,
            metadata={
                'follow_up_id': str(follow_up.id),
                'follow_up_type': follow_up.follow_up_type,
                'veterinarian_name': request.user.name
            },
            action_url=f'/consultations/patients/{patient.id}/'
        )
        
        return Response(
            FollowUpScheduleSerializer(follow_up).data,
            status=status.HTTP_201_CREATED
        )
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    """Mark consultation-related notifications as read."""
    try:
        from notifications.models import Notification
        
        notification_ids = request.data.get('notification_ids', [])
        
        if notification_ids:
            # Mark specific notifications as read
            notifications = Notification.objects.filter(
                id__in=notification_ids,
                user=request.user,
                is_read=False
            )
        else:
            # Mark all unread consultation notifications as read
            notifications = Notification.objects.filter(
                user=request.user,
                is_read=False,
                notification_type__in=[
                    'consultation_reminder',
                    'consultation_update',
                    'disease_alert',
                    'emergency_alert'
                ]
            )
        
        marked_count = 0
        for notification in notifications:
            notification.mark_as_read()
            marked_count += 1
        
        return Response({
            'message': f'{marked_count} notifications marked as read',
            'marked_count': marked_count
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )