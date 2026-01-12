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


class SymptomReport(models.Model):
    """Model for cattle symptom reports that trigger veterinary notifications."""
    
    SEVERITY_CHOICES = [
        ('mild', 'Mild'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe'),
    ]
    
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('notified', 'Veterinarians Notified'),
        ('accepted', 'Accepted by Veterinarian'),
        ('completed', 'Completed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic Information
    cattle = models.ForeignKey(
        'cattle.Cattle',
        on_delete=models.CASCADE,
        related_name='symptom_reports'
    )
    cattle_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='symptom_reports'
    )
    
    # Symptom Details
    symptoms = models.TextField(
        help_text='Detailed description of observable symptoms'
    )
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='moderate')
    is_emergency = models.BooleanField(default=False)
    
    # AI Predictions
    ai_predictions = models.JSONField(
        default=list,
        help_text='AI disease predictions for this symptom report'
    )
    
    # Location Information
    location = models.JSONField(
        default=dict,
        help_text='Location coordinates and address where symptoms were observed'
    )
    
    # Status and Timestamps
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    reported_at = models.DateTimeField(default=timezone.now)
    
    # Related Objects
    symptom_entry = models.ForeignKey(
        'health.SymptomEntry',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='symptom_reports'
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'symptom_reports'
        ordering = ['-reported_at']
        indexes = [
            models.Index(fields=['cattle_owner', '-reported_at']),
            models.Index(fields=['status', 'is_emergency']),
            models.Index(fields=['severity']),
        ]
    
    def __str__(self):
        return f"Symptom Report {self.id} - {self.cattle.identification_number}"


class ConsultationRequest(models.Model):
    """Model for consultation requests sent to veterinarians from symptom reports."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    ]
    
    PRIORITY_CHOICES = [
        ('normal', 'Normal'),
        ('urgent', 'Urgent'),
        ('emergency', 'Emergency'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Related Objects
    symptom_report = models.ForeignKey(
        SymptomReport,
        on_delete=models.CASCADE,
        related_name='consultation_requests'
    )
    cattle = models.ForeignKey(
        'cattle.Cattle',
        on_delete=models.CASCADE,
        related_name='consultation_requests'
    )
    cattle_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consultation_requests_as_owner'
    )
    
    # Request Details
    requested_veterinarians = models.JSONField(
        default=list,
        help_text='List of veterinarian IDs who were notified'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    
    # Assignment
    assigned_veterinarian = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_consultation_requests'
    )
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(
        help_text='When this request expires if not accepted'
    )
    accepted_at = models.DateTimeField(null=True, blank=True)
    
    # Tracking
    declined_by = models.JSONField(
        default=list,
        help_text='List of veterinarian IDs who declined this request'
    )
    
    class Meta:
        db_table = 'consultation_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['cattle_owner', '-created_at']),
            models.Index(fields=['assigned_veterinarian', 'status']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"Consultation Request {self.id} - {self.cattle.identification_number}"
    
    def is_expired(self):
        """Check if the request has expired."""
        return timezone.now() > self.expires_at
    
    def accept_by_veterinarian(self, veterinarian):
        """Accept the request by a veterinarian."""
        if self.status == 'pending' and not self.is_expired():
            self.status = 'accepted'
            self.assigned_veterinarian = veterinarian
            self.accepted_at = timezone.now()
            self.save()
            return True
        return False
    
    def decline_by_veterinarian(self, veterinarian):
        """Decline the request by a veterinarian."""
        if self.status == 'pending' and veterinarian.id not in self.declined_by:
            declined_list = self.declined_by.copy()
            declined_list.append(str(veterinarian.id))
            self.declined_by = declined_list
            self.save()
            return True
        return False


class VeterinarianResponse(models.Model):
    """Model for tracking veterinarian responses to consultation requests."""
    
    ACTION_CHOICES = [
        ('accept', 'Accept'),
        ('decline', 'Decline'),
        ('request_info', 'Request More Information'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Related Objects
    veterinarian = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consultation_responses'
    )
    consultation_request = models.ForeignKey(
        ConsultationRequest,
        on_delete=models.CASCADE,
        related_name='responses'
    )
    
    # Response Details
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    message = models.TextField(blank=True, help_text='Optional message from veterinarian')
    
    # Timing
    response_time = models.IntegerField(
        help_text='Response time in seconds from notification to response'
    )
    responded_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'veterinarian_responses'
        unique_together = ['veterinarian', 'consultation_request']
        ordering = ['-responded_at']
        indexes = [
            models.Index(fields=['veterinarian', '-responded_at']),
            models.Index(fields=['consultation_request', 'action']),
        ]
    
    def __str__(self):
        return f"Response from Dr. {self.veterinarian.name} - {self.action}"


class VeterinarianNotificationRequest(models.Model):
    """Model for tracking notifications sent to veterinarians about consultation requests."""
    
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
        ('responded', 'Responded'),
    ]
    
    CHANNEL_CHOICES = [
        ('app', 'In-App Notification'),
        ('sms', 'SMS'),
        ('email', 'Email'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Related Objects
    veterinarian = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_requests'
    )
    consultation_request = models.ForeignKey(
        ConsultationRequest,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    # Notification Details
    notification_channels = models.JSONField(
        default=list,
        help_text='List of channels used for notification'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')
    distance_km = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Distance from veterinarian to cattle location'
    )
    
    # Timestamps
    sent_at = models.DateTimeField(default=timezone.now)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'veterinarian_notification_requests'
        unique_together = ['veterinarian', 'consultation_request']
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['veterinarian', 'status']),
            models.Index(fields=['consultation_request']),
            models.Index(fields=['distance_km']),
        ]
    
    def __str__(self):
        return f"Notification to Dr. {self.veterinarian.name} - {self.status}"
    
    def mark_as_delivered(self):
        """Mark notification as delivered."""
        self.status = 'delivered'
        self.delivered_at = timezone.now()
        self.save()
    
    def mark_as_read(self):
        """Mark notification as read."""
        self.status = 'read'
        self.read_at = timezone.now()
        self.save()
    
    def mark_as_responded(self):
        """Mark notification as responded."""
        self.status = 'responded'
        self.responded_at = timezone.now()
        self.save()


class VeterinarianPatient(models.Model):
    """Model for managing cattle patients under veterinarian care."""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('transferred', 'Transferred'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Related Objects
    veterinarian = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patients'
    )
    cattle = models.ForeignKey(
        'cattle.Cattle',
        on_delete=models.CASCADE,
        related_name='veterinarian_patients'
    )
    cattle_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cattle_under_vet_care'
    )
    
    # Patient Management
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    added_at = models.DateTimeField(default=timezone.now)
    
    # Treatment Information
    treatment_plan = models.TextField(blank=True)
    last_consultation = models.DateTimeField(null=True, blank=True)
    next_follow_up = models.DateTimeField(null=True, blank=True)
    
    # Related Consultation Request
    consultation_request = models.ForeignKey(
        ConsultationRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='patient_records'
    )
    
    class Meta:
        db_table = 'veterinarian_patients'
        unique_together = ['veterinarian', 'cattle']
        ordering = ['-added_at']
        indexes = [
            models.Index(fields=['veterinarian', 'status']),
            models.Index(fields=['cattle_owner']),
            models.Index(fields=['status', '-added_at']),
        ]
    
    def __str__(self):
        return f"Patient: {self.cattle.identification_number} under Dr. {self.veterinarian.name}"
    
    def mark_as_completed(self):
        """Mark patient case as completed."""
        self.status = 'completed'
        self.save()


class PatientNote(models.Model):
    """Model for veterinarian notes about patients."""
    
    NOTE_TYPE_CHOICES = [
        ('observation', 'Observation'),
        ('treatment', 'Treatment'),
        ('follow_up', 'Follow-up'),
        ('general', 'General'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Related Objects
    veterinarian = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patient_notes'
    )
    patient = models.ForeignKey(
        VeterinarianPatient,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    
    # Note Details
    note_type = models.CharField(max_length=20, choices=NOTE_TYPE_CHOICES, default='general')
    content = models.TextField()
    is_private = models.BooleanField(
        default=False,
        help_text='Whether this note is private to the veterinarian'
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'patient_notes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient', '-created_at']),
            models.Index(fields=['veterinarian', 'note_type']),
        ]
    
    def __str__(self):
        return f"Note for {self.patient.cattle.identification_number} - {self.note_type}"


class VeterinarianDashboardStats(models.Model):
    """Model for caching veterinarian dashboard statistics."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Related Veterinarian
    veterinarian = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vet_dashboard_stats'
    )
    
    # Time Period
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # Statistics
    pending_requests = models.IntegerField(default=0)
    total_consultations = models.IntegerField(default=0)
    active_patients = models.IntegerField(default=0)
    emergency_responses = models.IntegerField(default=0)
    average_response_time = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Average response time in minutes'
    )
    patient_satisfaction_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Revenue
    total_earnings = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    consultation_fees = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    emergency_fees = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Metadata
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'veterinarian_dashboard_stats'
        indexes = [
            models.Index(fields=['veterinarian', '-last_updated']),
        ]
    
    def __str__(self):
        return f"Dashboard Stats for Dr. {self.veterinarian.name}"


class FollowUpSchedule(models.Model):
    """Model for scheduling follow-up appointments for patients."""
    
    FOLLOW_UP_TYPE_CHOICES = [
        ('check_up', 'Check-up'),
        ('treatment_review', 'Treatment Review'),
        ('medication_check', 'Medication Check'),
        ('recovery_assessment', 'Recovery Assessment'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Related Objects
    patient = models.ForeignKey(
        VeterinarianPatient,
        on_delete=models.CASCADE,
        related_name='follow_up_schedules'
    )
    
    # Schedule Details
    scheduled_date = models.DateTimeField()
    follow_up_type = models.CharField(max_length=30, choices=FOLLOW_UP_TYPE_CHOICES)
    notes = models.TextField(blank=True)
    
    # Status
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Creator
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_follow_ups'
    )
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'follow_up_schedules'
        ordering = ['scheduled_date']
        indexes = [
            models.Index(fields=['patient', 'scheduled_date']),
            models.Index(fields=['is_completed', 'scheduled_date']),
        ]
    
    def __str__(self):
        return f"Follow-up for {self.patient.cattle.identification_number} - {self.follow_up_type}"
    
    def mark_as_completed(self):
        """Mark follow-up as completed."""
        self.is_completed = True
        self.completed_at = timezone.now()
        self.save()