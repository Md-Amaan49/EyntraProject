"""
Cattle profile models for the Cattle Health System.
"""
import uuid
import os
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from PIL import Image
from .utils import compress_image


def cattle_image_upload_path(instance, filename):
    """Generate upload path for cattle images."""
    # Get file extension
    ext = filename.split('.')[-1].lower()
    # Generate new filename using cattle ID
    new_filename = f"{instance.id}_{uuid.uuid4().hex[:8]}.{ext}"
    # Return path: cattle_images/owner_id/filename
    return os.path.join('cattle_images', str(instance.owner.id), new_filename)


def validate_image_file(image):
    """Validate uploaded image file."""
    # Check file size (max 5MB)
    max_size = 5 * 1024 * 1024  # 5MB
    if image.size > max_size:
        raise ValidationError(f'Image file too large. Maximum size is {max_size // (1024*1024)}MB.')
    
    # Check file format
    allowed_formats = ['JPEG', 'PNG', 'WebP']
    try:
        with Image.open(image) as img:
            if img.format not in allowed_formats:
                raise ValidationError(f'Unsupported image format. Allowed formats: {", ".join(allowed_formats)}')
    except Exception:
        raise ValidationError('Invalid image file.')


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
    identification_number = models.CharField(max_length=50, db_index=True)
    image = models.ImageField(
        upload_to=cattle_image_upload_path,
        null=True,
        blank=True,
        validators=[validate_image_file],
        help_text='Optional cattle image (JPEG, PNG, WebP, max 5MB)'
    )
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
        constraints = [
            models.UniqueConstraint(
                fields=['owner', 'identification_number'],
                name='unique_identification_per_owner',
                condition=models.Q(is_archived=False)
            )
        ]
        indexes = [
            models.Index(fields=['owner', 'is_archived']),
            models.Index(fields=['identification_number']),
            models.Index(fields=['health_status']),
        ]
    
    def __str__(self):
        return f"{self.breed} - {self.identification_number} (Owner: {self.owner.username})"
    
    def get_image_url(self):
        """Get the URL for the cattle image."""
        if self.image:
            return self.image.url
        return None
    
    def get_thumbnail_url(self):
        """Get thumbnail URL (to be implemented with image processing)."""
        # For now, return the same image URL
        # In production, this would return a processed thumbnail
        return self.get_image_url()
    
    def clean(self):
        """Custom validation for the model."""
        super().clean()
        
        # Validate owner-scoped identification number uniqueness
        if self.identification_number:
            existing = Cattle.objects.filter(
                owner=self.owner,
                identification_number=self.identification_number,
                is_archived=False
            ).exclude(pk=self.pk)
            
            if existing.exists():
                raise ValidationError({
                    'identification_number': f'You already have cattle with identification number "{self.identification_number}".'
                })
    
    def save(self, *args, **kwargs):
        """Override save to run validation and compress images."""
        self.clean()
        
        # Compress image if it's being uploaded
        if self.image and hasattr(self.image, 'file'):
            # Only compress if it's a new upload (not already saved)
            if not self.pk or (self.pk and self._state.adding):
                try:
                    compressed_image = compress_image(self.image)
                    self.image = compressed_image
                except Exception as e:
                    print(f"Image compression failed: {e}")
                    # Continue with original image if compression fails
        
        super().save(*args, **kwargs)
    
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
