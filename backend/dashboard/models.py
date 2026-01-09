"""
Dashboard analytics models for the Cattle Health System.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal


class DashboardStats(models.Model):
    """Aggregated dashboard statistics."""
    
    STAT_TYPE_CHOICES = [
        ('cattle_owner', 'Cattle Owner Dashboard'),
        ('veterinarian', 'Veterinarian Dashboard'),
        ('system', 'System-wide Statistics'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dashboard_stats',
        null=True,
        blank=True
    )
    
    stat_type = models.CharField(max_length=20, choices=STAT_TYPE_CHOICES)
    date = models.DateField(default=timezone.now)
    
    # General Statistics
    total_cattle = models.IntegerField(default=0)
    healthy_cattle = models.IntegerField(default=0)
    sick_cattle = models.IntegerField(default=0)
    under_treatment_cattle = models.IntegerField(default=0)
    
    # Health Statistics
    total_health_assessments = models.IntegerField(default=0)
    ai_predictions_made = models.IntegerField(default=0)
    diseases_detected = models.IntegerField(default=0)
    
    # Consultation Statistics
    total_consultations = models.IntegerField(default=0)
    completed_consultations = models.IntegerField(default=0)
    cancelled_consultations = models.IntegerField(default=0)
    emergency_consultations = models.IntegerField(default=0)
    
    # Veterinarian-specific Statistics
    consultation_requests_received = models.IntegerField(default=0)
    disease_alerts_received = models.IntegerField(default=0)
    average_response_time_minutes = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    
    # Regional Statistics (for veterinarians)
    regional_disease_cases = models.IntegerField(default=0)
    regional_outbreak_alerts = models.IntegerField(default=0)
    
    # Financial Statistics
    total_consultation_fees = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'dashboard_stats'
        unique_together = ['user', 'stat_type', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', 'stat_type', '-date']),
            models.Index(fields=['stat_type', '-date']),
        ]
    
    def __str__(self):
        if self.user:
            return f"{self.user.name} - {self.get_stat_type_display()} - {self.date}"
        return f"System - {self.get_stat_type_display()} - {self.date}"


class HealthTrend(models.Model):
    """Health trend data for analytics."""
    
    TREND_TYPE_CHOICES = [
        ('disease_occurrence', 'Disease Occurrence'),
        ('health_status', 'Health Status'),
        ('treatment_effectiveness', 'Treatment Effectiveness'),
        ('regional_outbreak', 'Regional Outbreak'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='health_trends',
        null=True,
        blank=True
    )
    
    trend_type = models.CharField(max_length=30, choices=TREND_TYPE_CHOICES)
    date = models.DateField()
    
    # Disease Information
    disease_name = models.CharField(max_length=200, blank=True)
    
    # Location Information (for regional trends)
    location_data = models.JSONField(
        default=dict,
        help_text='Location information for regional trends'
    )
    
    # Trend Data
    case_count = models.IntegerField(default=0)
    recovery_count = models.IntegerField(default=0)
    mortality_count = models.IntegerField(default=0)
    
    # Confidence and Severity
    average_confidence = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    severity_distribution = models.JSONField(
        default=dict,
        help_text='Distribution of severity levels'
    )
    
    # Additional Metrics
    metadata = models.JSONField(
        default=dict,
        help_text='Additional trend metrics'
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'health_trends'
        unique_together = ['user', 'trend_type', 'disease_name', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', 'trend_type', '-date']),
            models.Index(fields=['disease_name', '-date']),
            models.Index(fields=['trend_type', '-date']),
        ]
    
    def __str__(self):
        return f"{self.trend_type} - {self.disease_name or 'All'} - {self.date}"


class RegionalDiseaseMap(models.Model):
    """Regional disease mapping for veterinarian dashboards."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Location Information
    region_name = models.CharField(max_length=200)
    state = models.CharField(max_length=100)
    district = models.CharField(max_length=100, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    
    # Disease Information
    disease_name = models.CharField(max_length=200)
    case_count = models.IntegerField(default=0)
    active_cases = models.IntegerField(default=0)
    resolved_cases = models.IntegerField(default=0)
    
    # Severity and Risk
    risk_level = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Low Risk'),
            ('medium', 'Medium Risk'),
            ('high', 'High Risk'),
            ('critical', 'Critical Risk'),
        ],
        default='low'
    )
    
    # Time Information
    first_reported = models.DateTimeField()
    last_updated = models.DateTimeField(auto_now=True)
    
    # Related Data
    affected_cattle_count = models.IntegerField(default=0)
    veterinarians_in_region = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'regional_disease_map'
        unique_together = ['region_name', 'disease_name']
        ordering = ['-last_updated']
        indexes = [
            models.Index(fields=['state', 'disease_name']),
            models.Index(fields=['risk_level', '-last_updated']),
            models.Index(fields=['latitude', 'longitude']),
        ]
    
    def __str__(self):
        return f"{self.disease_name} in {self.region_name} - {self.risk_level}"


class CattleHealthMetrics(models.Model):
    """Individual cattle health metrics for detailed analytics."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cattle = models.ForeignKey(
        'cattle.Cattle',
        on_delete=models.CASCADE,
        related_name='health_metrics'
    )
    
    # Time Period
    date = models.DateField()
    
    # Health Scores
    overall_health_score = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        help_text='Overall health score (0-100)'
    )
    
    # Activity Metrics
    symptom_reports_count = models.IntegerField(default=0)
    ai_assessments_count = models.IntegerField(default=0)
    consultations_count = models.IntegerField(default=0)
    
    # Treatment Metrics
    treatments_received = models.IntegerField(default=0)
    treatment_compliance_score = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    
    # Recovery Metrics
    recovery_time_days = models.IntegerField(null=True, blank=True)
    treatment_effectiveness_score = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    
    # Risk Factors
    risk_factors = models.JSONField(
        default=list,
        help_text='List of identified risk factors'
    )
    
    # Predictions
    predicted_health_issues = models.JSONField(
        default=list,
        help_text='AI-predicted potential health issues'
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'cattle_health_metrics'
        unique_together = ['cattle', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['cattle', '-date']),
            models.Index(fields=['overall_health_score']),
        ]
    
    def __str__(self):
        return f"{self.cattle.identification_number} - {self.date} - Score: {self.overall_health_score}"


class VeterinarianPerformanceMetrics(models.Model):
    """Performance metrics for veterinarians."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    veterinarian = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='performance_metrics'
    )
    
    # Time Period
    date = models.DateField()
    
    # Consultation Metrics
    consultations_completed = models.IntegerField(default=0)
    average_consultation_duration = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    consultation_success_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    
    # Response Metrics
    average_response_time_minutes = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    emergency_response_time_minutes = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    
    # Quality Metrics
    average_rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    positive_feedback_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    
    # Disease Detection Metrics
    diseases_diagnosed = models.IntegerField(default=0)
    diagnostic_accuracy_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    
    # Regional Impact
    regional_cases_handled = models.IntegerField(default=0)
    outbreak_responses = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'veterinarian_performance_metrics'
        unique_together = ['veterinarian', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['veterinarian', '-date']),
            models.Index(fields=['average_rating']),
        ]
    
    def __str__(self):
        return f"Dr. {self.veterinarian.name} - {self.date}"