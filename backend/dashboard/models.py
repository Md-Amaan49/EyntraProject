"""
Dashboard models for the Enhanced Dashboard System.
Includes models for predictions, disease records, alerts, API usage logs, and system logs.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from cattle.models import Cattle


class Prediction(models.Model):
    """Model for storing AI prediction results from Roboflow."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cow = models.ForeignKey(
        Cattle,
        on_delete=models.CASCADE,
        related_name='predictions',
        help_text='The cattle that was scanned'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='predictions',
        help_text='User who performed the scan'
    )
    image_url = models.TextField(help_text='URL or path to the uploaded image')
    predicted_class = models.CharField(
        max_length=100,
        help_text='Disease class predicted by Roboflow (e.g., "lumpy", "healthy")'
    )
    confidence = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text='Confidence score from 0 to 100'
    )
    is_healthy = models.BooleanField(
        help_text='True if prediction indicates healthy cattle'
    )
    raw_response = models.JSONField(
        null=True,
        blank=True,
        help_text='Complete raw response from Roboflow API'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'predictions'
        ordering = ['-created_at']
        verbose_name = 'Prediction'
        verbose_name_plural = 'Predictions'
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['cow']),
            models.Index(fields=['user']),
            models.Index(fields=['is_healthy']),
            models.Index(fields=['predicted_class']),
        ]
    
    def __str__(self):
        return f"{self.cow.identification_number} - {self.predicted_class} ({self.confidence}%)"
    
    def save(self, *args, **kwargs):
        """Override save to validate confidence bounds."""
        if self.confidence < 0 or self.confidence > 100:
            raise ValueError('Confidence must be between 0 and 100')
        super().save(*args, **kwargs)


class DiseaseRecord(models.Model):
    """Model for tracking confirmed disease cases."""
    
    SEVERITY_CHOICES = [
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cow = models.ForeignKey(
        Cattle,
        on_delete=models.CASCADE,
        related_name='disease_records',
        help_text='The affected cattle'
    )
    prediction = models.ForeignKey(
        Prediction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='disease_records',
        help_text='Associated prediction if available'
    )
    disease_type = models.CharField(
        max_length=100,
        help_text='Type of disease detected'
    )
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        help_text='Severity level of the disease'
    )
    recommendation = models.TextField(
        help_text='Recommended actions and treatment'
    )
    confirmed_by_vet = models.BooleanField(
        default=False,
        help_text='Whether a veterinarian has confirmed the diagnosis'
    )
    vet_notes = models.TextField(
        blank=True,
        help_text='Additional notes from veterinarian'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'disease_records'
        ordering = ['-created_at']
        verbose_name = 'Disease Record'
        verbose_name_plural = 'Disease Records'
        indexes = [
            models.Index(fields=['cow']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['disease_type']),
            models.Index(fields=['severity']),
            models.Index(fields=['confirmed_by_vet']),
        ]
    
    def __str__(self):
        return f"{self.cow.identification_number} - {self.disease_type} ({self.severity})"


class Alert(models.Model):
    """Model for user alerts and notifications."""
    
    ALERT_TYPES = [
        ('disease', 'Disease Detected'),
        ('low_confidence', 'Low Confidence'),
        ('recognition_failure', 'Recognition Failure'),
    ]
    
    SEVERITY_CHOICES = [
        ('error', 'Error'),
        ('warning', 'Warning'),
        ('info', 'Info'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='alerts',
        help_text='User who should receive this alert'
    )
    prediction = models.ForeignKey(
        Prediction,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='alerts',
        help_text='Associated prediction if applicable'
    )
    alert_type = models.CharField(
        max_length=50,
        choices=ALERT_TYPES,
        help_text='Type of alert'
    )
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        help_text='Severity level of the alert'
    )
    message = models.TextField(
        help_text='Alert message to display to user'
    )
    is_read = models.BooleanField(
        default=False,
        help_text='Whether user has read this alert'
    )
    dismissed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When user dismissed this alert'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'alerts'
        ordering = ['-created_at']
        verbose_name = 'Alert'
        verbose_name_plural = 'Alerts'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['is_read']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['alert_type']),
            models.Index(fields=['severity']),
        ]
    
    def __str__(self):
        return f"{self.user.name} - {self.alert_type} ({self.severity})"
    
    def mark_as_read(self):
        """Mark alert as read."""
        self.is_read = True
        self.save()
    
    def dismiss(self):
        """Dismiss the alert."""
        self.dismissed_at = timezone.now()
        self.save()


class APIUsageLog(models.Model):
    """Model for tracking API usage and performance."""
    
    id = models.BigAutoField(primary_key=True)
    endpoint = models.CharField(
        max_length=255,
        help_text='API endpoint that was called'
    )
    method = models.CharField(
        max_length=10,
        help_text='HTTP method (GET, POST, etc.)'
    )
    status_code = models.IntegerField(
        help_text='HTTP status code returned'
    )
    response_time_ms = models.IntegerField(
        help_text='Response time in milliseconds'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='api_logs',
        help_text='User who made the request'
    )
    error_message = models.TextField(
        blank=True,
        help_text='Error message if request failed'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'api_usage_logs'
        ordering = ['-created_at']
        verbose_name = 'API Usage Log'
        verbose_name_plural = 'API Usage Logs'
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['endpoint']),
            models.Index(fields=['status_code']),
            models.Index(fields=['user']),
        ]
    
    def __str__(self):
        return f"{self.method} {self.endpoint} - {self.status_code} ({self.response_time_ms}ms)"
    
    @property
    def is_success(self):
        """Check if request was successful (2xx status code)."""
        return 200 <= self.status_code < 300
    
    @property
    def is_error(self):
        """Check if request resulted in error (4xx or 5xx status code)."""
        return self.status_code >= 400


class SystemLog(models.Model):
    """Model for system-level logging and monitoring."""
    
    LEVEL_CHOICES = [
        ('error', 'Error'),
        ('warning', 'Warning'),
        ('info', 'Info'),
    ]
    
    CATEGORY_CHOICES = [
        ('failed_prediction', 'Failed Prediction'),
        ('invalid_image', 'Invalid Image'),
        ('low_confidence', 'Low Confidence'),
        ('api_error', 'API Error'),
        ('database_error', 'Database Error'),
        ('general', 'General'),
    ]
    
    id = models.BigAutoField(primary_key=True)
    level = models.CharField(
        max_length=20,
        choices=LEVEL_CHOICES,
        help_text='Log level'
    )
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        help_text='Log category'
    )
    message = models.TextField(
        help_text='Log message'
    )
    details = models.JSONField(
        null=True,
        blank=True,
        help_text='Additional details as JSON'
    )
    prediction = models.ForeignKey(
        Prediction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='system_logs',
        help_text='Associated prediction if applicable'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='system_logs',
        help_text='Associated user if applicable'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'system_logs'
        ordering = ['-created_at']
        verbose_name = 'System Log'
        verbose_name_plural = 'System Logs'
        indexes = [
            models.Index(fields=['level']),
            models.Index(fields=['category']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['user']),
        ]
    
    def __str__(self):
        return f"[{self.level.upper()}] {self.category} - {self.message[:50]}"
