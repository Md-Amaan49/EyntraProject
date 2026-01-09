"""
Serializers for consultation and veterinarian models.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import (
    VeterinarianProfile, Consultation, ConsultationMessage,
    DiseaseAlert, VeterinarianNotification
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