"""
Consultation and Veterinarian models for the Cattle Health System.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class VeterinarianProfile(models.Model):
    """Extended profile for veterinarian users."""
    
    VET_TYPE_CHOICES = [
        ('government', 'Government Veterinarian'),
        ('private', 'Private Veterinarian'),
    ]
    
    SPECIALIZATION_CHOICES = [
        ('general', 'General Practice'),
        ('surgery', 'Surgery'),
        ('reproduction', 'Reproduction'),
        ('nutrition', 'Nutrition'),
        ('emergency', 'Emergency Care'),
        ('preventive', 'Preventive Medicine'),
        ('infectious', 'Infectious Diseases'),
        ('dairy', 'Dairy Cattle'),
        ('beef', 'Beef Cattle'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='veterinarian_profile'
    )
    
    # Professional Information
    license_number = models.CharField(max_length=100, unique=True, db_index=True)
    vet_type = models.CharField(max_length=20, choices=VET_TYPE_CHOICES)
    specializations = models.JSONField(
        default=list,
        help_text='List of specialization areas'
    )
    years_experience = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(50)]
    )
    
    # Location Information
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    latitude = models.DecimalField(
        max_digits=10, 
        decimal_places=7,
        null=True, 
        blank=True
    )
    longitude = models.DecimalField(
        max_digits=10, 
        decimal_places=7,
        null=True, 
        blank=True
    )
    service_radius_km = models.IntegerField(
        default=50,
        validators=[MinValueValidator(1), MaxValueValidator(500)],
        help_text='Service radius in kilometers'
    )
    
    # Availability
    is_available = models.BooleanField(default=True)
    is_emergency_available = models.BooleanField(default=False)
    working_hours = models.JSONField(
        default=dict,
        help_text='Working hours for each day of the week'
    )
    
    # Consultation Fees
    consultation_fee_chat = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('100.00')
    )
    consultation_fee_voice = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('150.00')
    )
    consultation_fee_video = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('200.00')
    )
    emergency_fee_multiplier = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        default=Decimal('2.00'),
        help_text='Multiplier for emergency consultations'
    )
    
    # Professional Details
    qualification = models.TextField()
    bio = models.TextField(blank=True)
    profile_image = models.ImageField(
        upload_to='vet_profiles/',
        null=True,
        blank=True
    )
    
    # Statistics
    total_consultations = models.IntegerField(default=0)
    average_rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    
    # Verification
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'veterinarian_profiles'
        ordering = ['-average_rating', '-total_consultations']
        indexes = [
            models.Index(fields=['city', 'state']),
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['is_available', 'is_verified']),
            models.Index(fields=['vet_type']),
        ]
    
    def __str__(self):
        return f"Dr. {self.user.name} - {self.get_vet_type_display()}"
    
    def get_consultation_fees(self):
        """Get consultation fees for different types."""
        return {
            'chat': self.consultation_fee_chat,
            'voice': self.consultation_fee_voice,
            'video': self.consultation_fee_video,
            'emergency': {
                'chat': self.consultation_fee_chat * self.emergency_fee_multiplier,
                'voice': self.consultation_fee_voice * self.emergency_fee_multiplier,
                'video': self.consultation_fee_video * self.emergency_fee_multiplier,
            }
        }


class Consultation(models.Model):
    """Model for veterinary consultations."""
    
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]
    
    TYPE_CHOICES = [
        ('chat', 'Chat'),
        ('voice', 'Voice Call'),
        ('video', 'Video Call'),
    ]
    
    PRIORITY_CHOICES = [
        ('normal', 'Normal'),
        ('urgent', 'Urgent'),
        ('emergency', 'Emergency'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Participants
    cattle_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consultations_as_owner'
    )
    veterinarian = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consultations_as_vet'
    )
    cattle = models.ForeignKey(
        'cattle.Cattle',
        on_delete=models.CASCADE,
        related_name='consultations'
    )
    
    # Consultation Details
    consultation_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    
    # Scheduling
    scheduled_time = models.DateTimeField()
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Case Information
    case_description = models.TextField()
    symptoms_reported = models.TextField(blank=True)
    ai_predictions = models.JSONField(
        default=list,
        help_text='AI disease predictions that triggered this consultation'
    )
    
    # Location Context
    disease_location = models.JSONField(
        default=dict,
        help_text='Location where disease was detected'
    )
    
    # Consultation Notes
    veterinarian_notes = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    treatment_plan = models.TextField(blank=True)
    follow_up_required = models.BooleanField(default=False)
    follow_up_date = models.DateTimeField(null=True, blank=True)
    
    # Fees
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    emergency_fee = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    total_fee = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Ratings
    owner_rating = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    owner_feedback = models.TextField(blank=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'consultations'
        ordering = ['-scheduled_time']
        indexes = [
            models.Index(fields=['cattle_owner', '-scheduled_time']),
            models.Index(fields=['veterinarian', '-scheduled_time']),
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['scheduled_time']),
        ]
    
    def __str__(self):
        return f"Consultation {self.id} - {self.cattle.identification_number}"
    
    def start_consultation(self):
        """Start the consultation."""
        self.status = 'in_progress'
        self.started_at = timezone.now()
        self.save()
    
    def end_consultation(self, notes=None):
        """End the consultation."""
        self.status = 'completed'
        self.ended_at = timezone.now()
        if notes:
            self.veterinarian_notes = notes
        self.save()
        
        # Update veterinarian statistics
        vet_profile = self.veterinarian.veterinarian_profile
        vet_profile.total_consultations += 1
        vet_profile.save()
    
    def cancel_consultation(self, reason=None):
        """Cancel the consultation."""
        self.status = 'cancelled'
        if reason:
            self.veterinarian_notes = f"Cancelled: {reason}"
        self.save()
    
    @property
    def duration_minutes(self):
        """Get consultation duration in minutes."""
        if self.started_at and self.ended_at:
            return int((self.ended_at - self.started_at).total_seconds() / 60)
        return None


class ConsultationMessage(models.Model):
    """Model for chat messages during consultations."""
    
    MESSAGE_TYPE_CHOICES = [
        ('text', 'Text Message'),
        ('image', 'Image'),
        ('file', 'File'),
        ('system', 'System Message'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(
        Consultation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPE_CHOICES, default='text')
    content = models.TextField()
    image = models.ImageField(upload_to='consultation_images/', null=True, blank=True)
    file = models.FileField(upload_to='consultation_files/', null=True, blank=True)
    
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'consultation_messages'
        ordering = ['sent_at']
        indexes = [
            models.Index(fields=['consultation', 'sent_at']),
        ]
    
    def __str__(self):
        return f"Message from {self.sender.name} at {self.sent_at}"


class DiseaseAlert(models.Model):
    """Model for tracking disease alerts and notifications to veterinarians."""
    
    ALERT_TYPE_CHOICES = [
        ('ai_detection', 'AI Disease Detection'),
        ('symptom_report', 'Symptom Report'),
        ('outbreak_warning', 'Outbreak Warning'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Alert Details
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    disease_name = models.CharField(max_length=200)
    severity = models.CharField(max_length=20, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Location Information
    location = models.JSONField(help_text='Location where disease was detected')
    affected_radius_km = models.IntegerField(default=10)
    
    # Related Data
    cattle = models.ForeignKey(
        'cattle.Cattle',
        on_delete=models.CASCADE,
        related_name='disease_alerts'
    )
    symptom_entry = models.ForeignKey(
        'health.SymptomEntry',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    ai_prediction_data = models.JSONField(default=dict)
    
    # Notifications
    notified_veterinarians = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='VeterinarianNotification',
        related_name='received_disease_alerts'
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'disease_alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['disease_name']),
        ]
    
    def __str__(self):
        return f"Disease Alert: {self.disease_name} - {self.cattle.identification_number}"


class VeterinarianNotification(models.Model):
    """Through model for veterinarian notifications about disease alerts."""
    
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
        ('acknowledged', 'Acknowledged'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    veterinarian = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    disease_alert = models.ForeignKey(
        DiseaseAlert,
        on_delete=models.CASCADE
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')
    distance_km = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text='Distance from vet to disease location'
    )
    
    sent_at = models.DateTimeField(default=timezone.now)
    read_at = models.DateTimeField(null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'veterinarian_notifications'
        unique_together = ['veterinarian', 'disease_alert']
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['veterinarian', 'status']),
            models.Index(fields=['disease_alert']),
        ]
    
    def mark_as_read(self):
        """Mark notification as read."""
        self.status = 'read'
        self.read_at = timezone.now()
        self.save()
    
    def acknowledge(self):
        """Acknowledge the notification."""
        self.status = 'acknowledged'
        self.acknowledged_at = timezone.now()
        self.save()