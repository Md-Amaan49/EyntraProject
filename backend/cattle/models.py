"""
Cattle profile models for the Cattle Health System.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Cattle(models.Model):
    """Model for cattle profiles."""
    
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
    ]
    
    HEALTH_STATUS_CHOICES = [
        ('healthy', 'Healthy'),
        ('sick', 'Sick'),
        ('under_treatment', 'Under Treatment'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cattle'
    )
    breed = models.CharField(max_length=100)
    age = models.IntegerField(help_text='Age in years')
    identification_number = models.CharField(max_length=50, unique=True, db_index=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    weight = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Weight in kilograms'
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional metadata like color, markings, etc.'
    )
    health_status = models.CharField(
        max_length=20,
        choices=HEALTH_STATUS_CHOICES,
        default='healthy'
    )
    is_archived = models.BooleanField(
        default=False,
        help_text='Soft delete flag - archived cattle are not permanently deleted'
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cattle'
        ordering = ['-created_at']
        verbose_name = 'Cattle'
        verbose_name_plural = 'Cattle'
        indexes = [
            models.Index(fields=['owner', 'is_archived']),
            models.Index(fields=['identification_number']),
            models.Index(fields=['health_status']),
        ]
    
    def __str__(self):
        return f"{self.breed} - {self.identification_number}"
    
    def archive(self):
        """Soft delete the cattle profile."""
        self.is_archived = True
        self.save()
    
    def restore(self):
        """Restore an archived cattle profile."""
        self.is_archived = False
        self.save()


class CattleHistory(models.Model):
    """Model for tracking cattle profile update history."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cattle = models.ForeignKey(
        Cattle,
        on_delete=models.CASCADE,
        related_name='history'
    )
    field_name = models.CharField(max_length=100)
    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    changed_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'cattle_history'
        ordering = ['-changed_at']
        verbose_name = 'Cattle History'
        verbose_name_plural = 'Cattle Histories'
        indexes = [
            models.Index(fields=['cattle', '-changed_at']),
        ]
    
    def __str__(self):
        return f"{self.cattle.identification_number} - {self.field_name} changed at {self.changed_at}"
