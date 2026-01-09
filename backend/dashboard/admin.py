"""
Django admin configuration for dashboard models.
"""
from django.contrib import admin
from .models import (
    DashboardStats, HealthTrend, RegionalDiseaseMap,
    CattleHealthMetrics, VeterinarianPerformanceMetrics
)


@admin.register(DashboardStats)
class DashboardStatsAdmin(admin.ModelAdmin):
    """Admin interface for Dashboard Statistics."""
    
    list_display = [
        'user', 'stat_type', 'date', 'total_cattle', 'total_consultations',
        'completed_consultations', 'created_at'
    ]
    list_filter = ['stat_type', 'date', 'created_at']
    search_fields = ['user__name', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'stat_type', 'date')
        }),
        ('Cattle Statistics', {
            'fields': (
                'total_cattle', 'healthy_cattle', 'sick_cattle', 
                'under_treatment_cattle'
            )
        }),
        ('Health Statistics', {
            'fields': (
                'total_health_assessments', 'ai_predictions_made', 
                'diseases_detected'
            )
        }),
        ('Consultation Statistics', {
            'fields': (
                'total_consultations', 'completed_consultations',
                'cancelled_consultations', 'emergency_consultations'
            )
        }),
        ('Veterinarian Statistics', {
            'fields': (
                'consultation_requests_received', 'disease_alerts_received',
                'average_response_time_minutes', 'regional_disease_cases',
                'regional_outbreak_alerts'
            )
        }),
        ('Financial Statistics', {
            'fields': ('total_consultation_fees',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(HealthTrend)
class HealthTrendAdmin(admin.ModelAdmin):
    """Admin interface for Health Trends."""
    
    list_display = [
        'user', 'trend_type', 'disease_name', 'date', 'case_count',
        'recovery_count', 'created_at'
    ]
    list_filter = ['trend_type', 'disease_name', 'date', 'created_at']
    search_fields = ['user__name', 'disease_name']
    readonly_fields = ['created_at']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'trend_type', 'date', 'disease_name')
        }),
        ('Location Information', {
            'fields': ('location_data',)
        }),
        ('Trend Data', {
            'fields': (
                'case_count', 'recovery_count', 'mortality_count',
                'average_confidence', 'severity_distribution'
            )
        }),
        ('Additional Data', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )


@admin.register(RegionalDiseaseMap)
class RegionalDiseaseMapAdmin(admin.ModelAdmin):
    """Admin interface for Regional Disease Map."""
    
    list_display = [
        'region_name', 'state', 'disease_name', 'case_count',
        'active_cases', 'risk_level', 'last_updated'
    ]
    list_filter = ['state', 'disease_name', 'risk_level', 'last_updated']
    search_fields = ['region_name', 'state', 'district', 'disease_name']
    readonly_fields = ['last_updated']
    date_hierarchy = 'last_updated'
    
    fieldsets = (
        ('Location Information', {
            'fields': (
                'region_name', 'state', 'district', 'latitude', 'longitude'
            )
        }),
        ('Disease Information', {
            'fields': (
                'disease_name', 'case_count', 'active_cases', 'resolved_cases'
            )
        }),
        ('Risk Assessment', {
            'fields': ('risk_level',)
        }),
        ('Additional Data', {
            'fields': (
                'affected_cattle_count', 'veterinarians_in_region',
                'first_reported'
            )
        }),
        ('Timestamp', {
            'fields': ('last_updated',)
        }),
    )


@admin.register(CattleHealthMetrics)
class CattleHealthMetricsAdmin(admin.ModelAdmin):
    """Admin interface for Cattle Health Metrics."""
    
    list_display = [
        'cattle', 'date', 'overall_health_score', 'symptom_reports_count',
        'consultations_count', 'created_at'
    ]
    list_filter = ['date', 'overall_health_score', 'created_at']
    search_fields = ['cattle__identification_number', 'cattle__breed']
    readonly_fields = ['created_at']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('cattle', 'date', 'overall_health_score')
        }),
        ('Activity Metrics', {
            'fields': (
                'symptom_reports_count', 'ai_assessments_count',
                'consultations_count'
            )
        }),
        ('Treatment Metrics', {
            'fields': (
                'treatments_received', 'treatment_compliance_score'
            )
        }),
        ('Recovery Metrics', {
            'fields': (
                'recovery_time_days', 'treatment_effectiveness_score'
            )
        }),
        ('Risk and Predictions', {
            'fields': ('risk_factors', 'predicted_health_issues'),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )


@admin.register(VeterinarianPerformanceMetrics)
class VeterinarianPerformanceMetricsAdmin(admin.ModelAdmin):
    """Admin interface for Veterinarian Performance Metrics."""
    
    list_display = [
        'veterinarian', 'date', 'consultations_completed', 'average_rating',
        'average_response_time_minutes', 'created_at'
    ]
    list_filter = ['date', 'average_rating', 'created_at']
    search_fields = ['veterinarian__name', 'veterinarian__email']
    readonly_fields = ['created_at']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('veterinarian', 'date')
        }),
        ('Consultation Metrics', {
            'fields': (
                'consultations_completed', 'average_consultation_duration',
                'consultation_success_rate'
            )
        }),
        ('Response Metrics', {
            'fields': (
                'average_response_time_minutes', 'emergency_response_time_minutes'
            )
        }),
        ('Quality Metrics', {
            'fields': (
                'average_rating', 'positive_feedback_percentage'
            )
        }),
        ('Disease Detection Metrics', {
            'fields': (
                'diseases_diagnosed', 'diagnostic_accuracy_rate'
            )
        }),
        ('Regional Impact', {
            'fields': ('regional_cases_handled', 'outbreak_responses')
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )
