"""
Health assessment models for symptom and image submission.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinLengthValidator


class SymptomEntry(models.Model):
    """Model for cattle symptom entries."""
    
    SEVERITY_CHOICES = [
        ('mild', 'Mild'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cattle = models.ForeignKey(
        'cattle.Cattle',
        on_delete=models.CASCADE,
        related_name='symptom_entries'
    )
    symptoms = models.TextField(
        validators=[MinLengthValidator(10, message="Symptom description must be at least 10 characters")],
        help_text='Detailed description of observable symptoms'
    )
    observed_date = models.DateTimeField(default=timezone.now)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='moderate')
    additional_notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='symptom_entries'
    )
    
    class Meta:
        db_table = 'symptom_entries'
        ordering = ['-observed_date']
        verbose_name = 'Symptom Entry'
        verbose_name_plural = 'Symptom Entries'
        indexes = [
            models.Index(fields=['cattle', '-observed_date']),
            models.Index(fields=['severity']),
        ]
    
    def __str__(self):
        return f"{self.cattle.identification_number} - {self.observed_date.strftime('%Y-%m-%d')}"


class HealthImage(models.Model):
    """Model for health-related images."""
    
    IMAGE_TYPE_CHOICES = [
        ('lesion', 'Lesion'),
        ('wound', 'Wound'),
        ('discharge', 'Discharge'),
        ('general', 'General'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cattle = models.ForeignKey(
        'cattle.Cattle',
        on_delete=models.CASCADE,
        related_name='health_images'
    )
    symptom_entry = models.ForeignKey(
        SymptomEntry,
        on_delete=models.CASCADE,
        related_name='images',
        null=True,
        blank=True
    )
    image = models.ImageField(
        upload_to='health_images/%Y/%m/%d/',
        help_text='Health image (JPEG or PNG, max 10MB)'
    )
    image_type = models.CharField(
        max_length=50,
        choices=IMAGE_TYPE_CHOICES,
        default='general'
    )
    upload_date = models.DateTimeField(default=timezone.now)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Image metadata (size, format, dimensions)'
    )
    
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_images'
    )
    
    class Meta:
        db_table = 'health_images'
        ordering = ['-upload_date']
        verbose_name = 'Health Image'
        verbose_name_plural = 'Health Images'
        indexes = [
            models.Index(fields=['cattle', '-upload_date']),
            models.Index(fields=['symptom_entry']),
        ]
    
    def __str__(self):
        return f"{self.cattle.identification_number} - {self.image_type} - {self.upload_date.strftime('%Y-%m-%d')}"
    
    def save(self, *args, **kwargs):
        """Override save to populate metadata."""
        if self.image and not self.metadata:
            self.metadata = {
                'size': self.image.size,
                'name': self.image.name,
            }
        super().save(*args, **kwargs)


# Import disease management models
from .disease_models import Disease, TrainingDataset, TrainingImage, AIModel

# Import treatment models
from .treatment_models import (
    TreatmentCategory, Treatment, TreatmentRecommendation, 
    TreatmentProtocol, ProtocolStep
)
