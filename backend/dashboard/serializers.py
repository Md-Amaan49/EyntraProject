"""
Serializers for dashboard models.
"""
from rest_framework import serializers
from .models import (
    DashboardStats, HealthTrend, RegionalDiseaseMap,
    CattleHealthMetrics, VeterinarianPerformanceMetrics
)


class DashboardStatsSerializer(serializers.ModelSerializer):
    """Serializer for dashboard statistics."""
    
    user_name = serializers.CharField(source='user.name', read_only=True)
    
    class Meta:
        model = DashboardStats
        fields = [
            'id', 'user_name', 'stat_type', 'date', 'total_cattle',
            'healthy_cattle', 'sick_cattle', 'under_treatment_cattle',
            'total_health_assessments', 'ai_predictions_made', 'diseases_detected',
            'total_consultations', 'completed_consultations', 'cancelled_consultations',
            'emergency_consultations', 'consultation_requests_received',
            'disease_alerts_received', 'average_response_time_minutes',
            'regional_disease_cases', 'regional_outbreak_alerts',
            'total_consultation_fees', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user_name', 'created_at', 'updated_at']


class HealthTrendSerializer(serializers.ModelSerializer):
    """Serializer for health trends."""
    
    user_name = serializers.CharField(source='user.name', read_only=True)
    
    class Meta:
        model = HealthTrend
        fields = [
            'id', 'user_name', 'trend_type', 'date', 'disease_name',
            'location_data', 'case_count', 'recovery_count', 'mortality_count',
            'average_confidence', 'severity_distribution', 'metadata', 'created_at'
        ]
        read_only_fields = ['user_name', 'created_at']


class RegionalDiseaseMapSerializer(serializers.ModelSerializer):
    """Serializer for regional disease mapping."""
    
    class Meta:
        model = RegionalDiseaseMap
        fields = [
            'id', 'region_name', 'state', 'district', 'latitude', 'longitude',
            'disease_name', 'case_count', 'active_cases', 'resolved_cases',
            'risk_level', 'first_reported', 'last_updated', 'affected_cattle_count',
            'veterinarians_in_region'
        ]
        read_only_fields = ['last_updated']


class CattleHealthMetricsSerializer(serializers.ModelSerializer):
    """Serializer for cattle health metrics."""
    
    cattle_identification = serializers.CharField(
        source='cattle.identification_number', 
        read_only=True
    )
    cattle_breed = serializers.CharField(source='cattle.breed', read_only=True)
    
    class Meta:
        model = CattleHealthMetrics
        fields = [
            'id', 'cattle', 'cattle_identification', 'cattle_breed', 'date',
            'overall_health_score', 'symptom_reports_count', 'ai_assessments_count',
            'consultations_count', 'treatments_received', 'treatment_compliance_score',
            'recovery_time_days', 'treatment_effectiveness_score', 'risk_factors',
            'predicted_health_issues', 'created_at'
        ]
        read_only_fields = ['cattle_identification', 'cattle_breed', 'created_at']


class VeterinarianPerformanceMetricsSerializer(serializers.ModelSerializer):
    """Serializer for veterinarian performance metrics."""
    
    veterinarian_name = serializers.CharField(source='veterinarian.name', read_only=True)
    
    class Meta:
        model = VeterinarianPerformanceMetrics
        fields = [
            'id', 'veterinarian', 'veterinarian_name', 'date', 'consultations_completed',
            'average_consultation_duration', 'consultation_success_rate',
            'average_response_time_minutes', 'emergency_response_time_minutes',
            'average_rating', 'positive_feedback_percentage', 'diseases_diagnosed',
            'diagnostic_accuracy_rate', 'regional_cases_handled', 'outbreak_responses',
            'created_at'
        ]
        read_only_fields = ['veterinarian_name', 'created_at']


class DashboardOverviewSerializer(serializers.Serializer):
    """Serializer for dashboard overview data."""
    
    cattle_statistics = serializers.DictField(required=False)
    consultation_statistics = serializers.DictField(required=False)
    recent_activity = serializers.DictField(required=False)
    regional_health = serializers.DictField(required=False)
    performance_metrics = serializers.DictField(required=False)
    health_trends = serializers.DictField(required=False)
    alerts = serializers.DictField(required=False)
    upcoming_consultations = serializers.ListField(required=False)
    quick_actions = serializers.ListField(required=False)


class HealthAnalyticsSerializer(serializers.Serializer):
    """Serializer for health analytics data."""
    
    cattle_info = serializers.DictField(required=False)
    herd_summary = serializers.DictField(required=False)
    period_summary = serializers.DictField(required=False)
    recent_activity = serializers.DictField(required=False)
    timeline = serializers.ListField(required=False)
    health_score = serializers.IntegerField(required=False)
    attention_required = serializers.ListField(required=False)


class RegionalAnalyticsSerializer(serializers.Serializer):
    """Serializer for regional analytics data."""
    
    regional_data = RegionalDiseaseMapSerializer(many=True)
    veterinarian_location = serializers.DictField()


class PerformanceAnalyticsSerializer(serializers.Serializer):
    """Serializer for performance analytics data."""
    
    performance_data = VeterinarianPerformanceMetricsSerializer(many=True)
    summary = serializers.DictField()
    period = serializers.DictField()


class OutbreakAlertSerializer(serializers.Serializer):
    """Serializer for outbreak alert data."""
    
    outbreak_alerts = serializers.ListField()
    total_active_alerts = serializers.IntegerField()
    last_updated = serializers.DateTimeField()


class NotificationSummarySerializer(serializers.Serializer):
    """Serializer for notification summary data."""
    
    total_recent = serializers.IntegerField()
    unread_count = serializers.IntegerField()
    by_type = serializers.DictField()
    by_priority = serializers.DictField()
    recent_critical = serializers.ListField()