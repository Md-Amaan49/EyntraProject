"""
Notification models for the Cattle Health System.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class NotificationPreferences(models.Model):
    """User notification preferences."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    
    # Disease Alert Preferences
    disease_alerts_enabled = models.BooleanField(default=True)
    disease_alerts_email = models.BooleanField(default=True)
    disease_alerts_sms = models.BooleanField(default=False)
    disease_alerts_push = models.BooleanField(default=True)
    
    # Consultation Preferences
    consultation_reminders = models.BooleanField(default=True)
    consultation_updates = models.BooleanField(default=True)
    consultation_messages = models.BooleanField(default=True)
    
    # Health Monitoring Preferences
    health_reports = models.BooleanField(default=True)
    treatment_reminders = models.BooleanField(default=True)
    vaccination_reminders = models.BooleanField(default=True)
    
    # Emergency Preferences
    emergency_alerts = models.BooleanField(default=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    
    # Veterinarian-specific Preferences
    regional_disease_alerts = models.BooleanField(default=True)
    new_consultation_requests = models.BooleanField(default=True)
    outbreak_warnings = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_preferences'
    
    def __str__(self):
        return f"Notification Preferences - {self.user.name}"


class Notification(models.Model):
    """User notifications."""
    
    TYPE_CHOICES = [
        ('disease_alert', 'Disease Alert'),
        ('consultation_reminder', 'Consultation Reminder'),
        ('consultation_update', 'Consultation Update'),
        ('treatment_reminder', 'Treatment Reminder'),
        ('vaccination_reminder', 'Vaccination Reminder'),
        ('emergency_alert', 'Emergency Alert'),
        ('outbreak_warning', 'Outbreak Warning'),
        ('system_message', 'System Message'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    # Notification Content
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    
    # Related Objects
    cattle = models.ForeignKey(
        'cattle.Cattle',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    consultation = models.ForeignKey(
        'consultations.Consultation',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    disease_alert = models.ForeignKey(
        'consultations.DiseaseAlert',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    
    # Delivery Channels
    send_email = models.BooleanField(default=False)
    send_sms = models.BooleanField(default=False)
    send_push = models.BooleanField(default=True)
    
    # Status Tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_read = models.BooleanField(default=False)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    action_url = models.URLField(blank=True, help_text='URL for notification action')
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['is_read']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.user.name}"
    
    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.status = 'read'
            self.save()
    
    def mark_as_sent(self):
        """Mark notification as sent."""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save()
    
    def mark_as_delivered(self):
        """Mark notification as delivered."""
        self.status = 'delivered'
        self.delivered_at = timezone.now()
        self.save()
    
    def is_expired(self):
        """Check if notification has expired."""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False


class NotificationTemplate(models.Model):
    """Templates for different types of notifications."""
    
    TYPE_CHOICES = [
        ('disease_alert', 'Disease Alert'),
        ('consultation_reminder', 'Consultation Reminder'),
        ('consultation_update', 'Consultation Update'),
        ('treatment_reminder', 'Treatment Reminder'),
        ('vaccination_reminder', 'Vaccination Reminder'),
        ('emergency_alert', 'Emergency Alert'),
        ('outbreak_warning', 'Outbreak Warning'),
        ('system_message', 'System Message'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES, unique=True)
    
    # Template Content
    title_template = models.CharField(max_length=200)
    message_template = models.TextField()
    email_subject_template = models.CharField(max_length=200, blank=True)
    email_body_template = models.TextField(blank=True)
    sms_template = models.CharField(max_length=160, blank=True)
    
    # Default Settings
    default_priority = models.CharField(
        max_length=20, 
        choices=Notification.PRIORITY_CHOICES, 
        default='medium'
    )
    default_send_email = models.BooleanField(default=False)
    default_send_sms = models.BooleanField(default=False)
    default_send_push = models.BooleanField(default=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_templates'
    
    def __str__(self):
        return f"Template: {self.get_notification_type_display()}"
    
    def render_notification(self, context):
        """Render notification content using template and context."""
        title = self.title_template.format(**context)
        message = self.message_template.format(**context)
        
        return {
            'title': title,
            'message': message,
            'priority': self.default_priority,
            'send_email': self.default_send_email,
            'send_sms': self.default_send_sms,
            'send_push': self.default_send_push,
        }


class NotificationDelivery(models.Model):
    """Track notification delivery across different channels."""
    
    CHANNEL_CHOICES = [
        ('push', 'Push Notification'),
        ('email', 'Email'),
        ('sms', 'SMS'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('bounced', 'Bounced'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name='deliveries'
    )
    
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Delivery Details
    recipient = models.CharField(max_length=200)  # email address, phone number, etc.
    external_id = models.CharField(max_length=200, blank=True)  # external service ID
    
    # Error Tracking
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'notification_deliveries'
        unique_together = ['notification', 'channel']
        indexes = [
            models.Index(fields=['status', 'next_retry_at']),
            models.Index(fields=['channel', 'status']),
        ]
    
    def __str__(self):
        return f"{self.notification.title} - {self.channel} - {self.status}"
    
    def mark_as_sent(self):
        """Mark delivery as sent."""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save()
    
    def mark_as_delivered(self):
        """Mark delivery as delivered."""
        self.status = 'delivered'
        self.delivered_at = timezone.now()
        self.save()
    
    def mark_as_failed(self, error_message=None):
        """Mark delivery as failed."""
        self.status = 'failed'
        self.failed_at = timezone.now()
        if error_message:
            self.error_message = error_message
        self.save()
    
    def can_retry(self):
        """Check if delivery can be retried."""
        return (
            self.status == 'failed' and 
            self.retry_count < self.max_retries and
            (not self.next_retry_at or timezone.now() >= self.next_retry_at)
        )