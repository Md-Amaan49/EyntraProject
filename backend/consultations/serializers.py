"""
Serializers for consultation and veterinarian models.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import (
    VeterinarianProfile, Consultation, ConsultationMessage,
    DiseaseAlert, VeterinarianNotification, SymptomReport,
    ConsultationRequest, VeterinarianResponse, VeterinarianNotificationRequest,
    VeterinarianPatient, PatientNote, VeterinarianDashboardStats,
    FollowUpSchedule
)
from cattle.serializers import CattleSerializer
from users.serializers import UserSerializer

User = get_user_model()


class VeterinarianProfileSerializer(serializers.ModelSerializer):
    """Serializer for veterinarian profiles."""
    
    user = UserSerializer(read_only=True)
    consultation_fees = serializers.SerializerMethodField()
    distance_km = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        read_only=True
    )
    
    class Meta:
        model = VeterinarianProfile
        fields = [
            'id', 'user', 'license_number', 'vet_type', 'specializations',
            'years_experience', 'address', 'city', 'state', 'pincode',
            'latitude', 'longitude', 'service_radius_km', 'is_available',
            'is_emergency_available', 'working_hours', 'consultation_fees',
            'qualification', 'bio', 'profile_image', 'total_consultations',
            'average_rating', 'is_verified', 'verification_date',
            'created_at', 'distance_km'
        ]
        read_only_fields = [
            'total_consultations', 'average_rating', 'is_verified',
            'verification_date', 'created_at'
        ]
    
    def get_consultation_fees(self, obj):
        """Get consultation fees for different types."""
        return obj.get_consultation_fees()
    
    def create(self, validated_data):
        """Create veterinarian profile."""
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)


class ConsultationSerializer(serializers.ModelSerializer):
    """Serializer for consultations."""
    
    cattle_owner = UserSerializer(read_only=True)
    veterinarian = UserSerializer(read_only=True)
    cattle = CattleSerializer(read_only=True)
    duration_minutes = serializers.ReadOnlyField()
    
    class Meta:
        model = Consultation
        fields = [
            'id', 'cattle_owner', 'veterinarian', 'cattle',
            'consultation_type', 'priority', 'status', 'scheduled_time',
            'started_at', 'ended_at', 'case_description', 'symptoms_reported',
            'ai_predictions', 'disease_location', 'veterinarian_notes',
            'diagnosis', 'treatment_plan', 'follow_up_required',
            'follow_up_date', 'consultation_fee', 'emergency_fee',
            'total_fee', 'owner_rating', 'owner_feedback',
            'duration_minutes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'cattle_owner', 'veterinarian', 'cattle', 'started_at',
            'ended_at', 'duration_minutes', 'created_at', 'updated_at'
        ]


class ConsultationMessageSerializer(serializers.ModelSerializer):
    """Serializer for consultation messages."""
    
    sender = UserSerializer(read_only=True)
    
    class Meta:
        model = ConsultationMessage
        fields = [
            'id', 'consultation', 'sender', 'message_type', 'content',
            'image', 'file', 'is_read', 'sent_at'
        ]
        read_only_fields = ['sender', 'sent_at']
    
    def create(self, validated_data):
        """Create consultation message."""
        validated_data['sender'] = self.context['request'].user
        return super().create(validated_data)


class DiseaseAlertSerializer(serializers.ModelSerializer):
    """Serializer for disease alerts."""
    
    cattle = CattleSerializer(read_only=True)
    notified_count = serializers.SerializerMethodField()
    
    class Meta:
        model = DiseaseAlert
        fields = [
            'id', 'alert_type', 'disease_name', 'severity', 'status',
            'location', 'affected_radius_km', 'cattle', 'symptom_entry',
            'ai_prediction_data', 'notified_count', 'created_at',
            'resolved_at'
        ]
        read_only_fields = ['created_at', 'resolved_at', 'notified_count']
    
    def get_notified_count(self, obj):
        """Get count of notified veterinarians."""
        return obj.notified_veterinarians.count()


class VeterinarianNotificationSerializer(serializers.ModelSerializer):
    """Serializer for veterinarian notifications."""
    
    veterinarian = UserSerializer(read_only=True)
    disease_alert = DiseaseAlertSerializer(read_only=True)
    
    class Meta:
        model = VeterinarianNotification
        fields = [
            'id', 'veterinarian', 'disease_alert', 'status', 'distance_km',
            'sent_at', 'read_at', 'acknowledged_at'
        ]
        read_only_fields = [
            'veterinarian', 'disease_alert', 'sent_at', 'read_at',
            'acknowledged_at'
        ]


class VeterinarianListSerializer(serializers.ModelSerializer):
    """Simplified serializer for veterinarian listings."""
    
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    distance_km = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        read_only=True
    )
    
    class Meta:
        model = VeterinarianProfile
        fields = [
            'id', 'user_name', 'user_email', 'vet_type', 'specializations',
            'years_experience', 'city', 'state', 'is_available',
            'is_emergency_available', 'consultation_fee_chat',
            'consultation_fee_voice', 'consultation_fee_video',
            'average_rating', 'total_consultations', 'distance_km'
        ]


class SymptomReportSerializer(serializers.ModelSerializer):
    """Serializer for symptom reports."""
    
    cattle = CattleSerializer(read_only=True)
    cattle_owner = UserSerializer(read_only=True)
    cattle_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = SymptomReport
        fields = [
            'id', 'cattle', 'cattle_owner', 'cattle_id', 'symptoms',
            'severity', 'is_emergency', 'ai_predictions', 'location',
            'status', 'reported_at', 'symptom_entry', 'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'cattle_owner', 'status', 'reported_at', 'created_at',
            'updated_at'
        ]
    
    def create(self, validated_data):
        """Create symptom report."""
        cattle_id = validated_data.pop('cattle_id')
        validated_data['cattle_id'] = cattle_id
        validated_data['cattle_owner'] = self.context['request'].user
        return super().create(validated_data)


class ConsultationRequestSerializer(serializers.ModelSerializer):
    """Serializer for consultation requests."""
    
    symptom_report = SymptomReportSerializer(read_only=True)
    cattle = CattleSerializer(read_only=True)
    cattle_owner = UserSerializer(read_only=True)
    assigned_veterinarian = UserSerializer(read_only=True)
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = ConsultationRequest
        fields = [
            'id', 'symptom_report', 'cattle', 'cattle_owner',
            'requested_veterinarians', 'status', 'priority',
            'assigned_veterinarian', 'created_at', 'expires_at',
            'accepted_at', 'declined_by', 'is_expired'
        ]
        read_only_fields = [
            'symptom_report', 'cattle', 'cattle_owner', 'requested_veterinarians',
            'assigned_veterinarian', 'created_at', 'expires_at', 'accepted_at',
            'declined_by', 'is_expired'
        ]
    
    def get_is_expired(self, obj):
        """Check if the request has expired."""
        return obj.is_expired()


class VeterinarianResponseSerializer(serializers.ModelSerializer):
    """Serializer for veterinarian responses."""
    
    veterinarian = UserSerializer(read_only=True)
    consultation_request = ConsultationRequestSerializer(read_only=True)
    
    class Meta:
        model = VeterinarianResponse
        fields = [
            'id', 'veterinarian', 'consultation_request', 'action',
            'message', 'response_time', 'responded_at'
        ]
        read_only_fields = [
            'veterinarian', 'consultation_request', 'response_time',
            'responded_at'
        ]
    
    def create(self, validated_data):
        """Create veterinarian response."""
        validated_data['veterinarian'] = self.context['request'].user
        return super().create(validated_data)


class VeterinarianNotificationRequestSerializer(serializers.ModelSerializer):
    """Serializer for veterinarian notification requests."""
    
    veterinarian = UserSerializer(read_only=True)
    consultation_request = ConsultationRequestSerializer(read_only=True)
    
    class Meta:
        model = VeterinarianNotificationRequest
        fields = [
            'id', 'veterinarian', 'consultation_request', 'notification_channels',
            'status', 'distance_km', 'sent_at', 'delivered_at', 'read_at',
            'responded_at'
        ]
        read_only_fields = [
            'veterinarian', 'consultation_request', 'sent_at', 'delivered_at',
            'read_at', 'responded_at'
        ]


class VeterinarianPatientSerializer(serializers.ModelSerializer):
    """Serializer for veterinarian patients."""
    
    veterinarian = UserSerializer(read_only=True)
    cattle = CattleSerializer(read_only=True)
    cattle_owner = UserSerializer(read_only=True)
    consultation_request = ConsultationRequestSerializer(read_only=True)
    consultation_history = serializers.SerializerMethodField()
    notes_count = serializers.SerializerMethodField()
    
    class Meta:
        model = VeterinarianPatient
        fields = [
            'id', 'veterinarian', 'cattle', 'cattle_owner', 'status',
            'added_at', 'treatment_plan', 'last_consultation',
            'next_follow_up', 'consultation_request', 'consultation_history',
            'notes_count'
        ]
        read_only_fields = [
            'veterinarian', 'cattle', 'cattle_owner', 'added_at',
            'consultation_request', 'consultation_history', 'notes_count'
        ]
    
    def get_consultation_history(self, obj):
        """Get consultation history for this patient."""
        consultations = Consultation.objects.filter(
            cattle=obj.cattle,
            veterinarian=obj.veterinarian
        ).order_by('-created_at')[:5]  # Last 5 consultations
        return ConsultationSerializer(consultations, many=True).data
    
    def get_notes_count(self, obj):
        """Get count of notes for this patient."""
        return obj.notes.count()


class PatientNoteSerializer(serializers.ModelSerializer):
    """Serializer for patient notes."""
    
    veterinarian = UserSerializer(read_only=True)
    patient = VeterinarianPatientSerializer(read_only=True)
    
    class Meta:
        model = PatientNote
        fields = [
            'id', 'veterinarian', 'patient', 'note_type', 'content',
            'is_private', 'created_at'
        ]
        read_only_fields = ['veterinarian', 'patient', 'created_at']
    
    def create(self, validated_data):
        """Create patient note."""
        validated_data['veterinarian'] = self.context['request'].user
        return super().create(validated_data)


class VeterinarianDashboardStatsSerializer(serializers.ModelSerializer):
    """Serializer for veterinarian dashboard statistics."""
    
    veterinarian = UserSerializer(read_only=True)
    
    class Meta:
        model = VeterinarianDashboardStats
        fields = [
            'id', 'veterinarian', 'period_start', 'period_end',
            'pending_requests', 'total_consultations', 'active_patients',
            'emergency_responses', 'average_response_time',
            'patient_satisfaction_rating', 'total_earnings',
            'consultation_fees', 'emergency_fees', 'last_updated'
        ]
        read_only_fields = ['veterinarian', 'last_updated']


class FollowUpScheduleSerializer(serializers.ModelSerializer):
    """Serializer for follow-up schedules."""
    
    patient = VeterinarianPatientSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = FollowUpSchedule
        fields = [
            'id', 'patient', 'scheduled_date', 'follow_up_type', 'notes',
            'is_completed', 'completed_at', 'created_by', 'created_at'
        ]
        read_only_fields = [
            'patient', 'created_by', 'completed_at', 'created_at'
        ]
    
    def create(self, validated_data):
        """Create follow-up schedule."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class ConsultationRequestListSerializer(serializers.ModelSerializer):
    """Simplified serializer for consultation request listings."""
    
    cattle_breed = serializers.CharField(source='cattle.breed', read_only=True)
    cattle_age = serializers.CharField(source='cattle.age', read_only=True)
    cattle_identification = serializers.CharField(source='cattle.identification_number', read_only=True)
    owner_name = serializers.CharField(source='cattle_owner.name', read_only=True)
    owner_phone = serializers.CharField(source='cattle_owner.phone_number', read_only=True)
    symptoms = serializers.CharField(source='symptom_report.symptoms', read_only=True)
    is_emergency = serializers.BooleanField(source='symptom_report.is_emergency', read_only=True)
    distance_km = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    
    class Meta:
        model = ConsultationRequest
        fields = [
            'id', 'cattle_breed', 'cattle_age', 'cattle_identification',
            'owner_name', 'owner_phone', 'symptoms', 'is_emergency',
            'status', 'priority', 'created_at', 'expires_at', 'distance_km'
        ]


class PatientListSerializer(serializers.ModelSerializer):
    """Simplified serializer for patient listings."""
    
    cattle_breed = serializers.CharField(source='cattle.breed', read_only=True)
    cattle_age = serializers.CharField(source='cattle.age', read_only=True)
    cattle_identification = serializers.CharField(source='cattle.identification_number', read_only=True)
    owner_name = serializers.CharField(source='cattle_owner.name', read_only=True)
    owner_phone = serializers.CharField(source='cattle_owner.phone_number', read_only=True)
    last_consultation_date = serializers.DateTimeField(source='last_consultation', read_only=True)
    
    class Meta:
        model = VeterinarianPatient
        fields = [
            'id', 'cattle_breed', 'cattle_age', 'cattle_identification',
            'owner_name', 'owner_phone', 'status', 'added_at',
            'last_consultation_date', 'next_follow_up'
        ]