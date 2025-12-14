"""
Disease management models for admin to add diseases and training datasets.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Disease(models.Model):
    """Model for cattle diseases that can be detected by the system."""
    
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True, db_index=True)
    scientific_name = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(help_text='Detailed description of the disease')
    common_symptoms = models.JSONField(
        default=list,
        help_text='List of common symptoms'
    )
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    
    # Treatment information
    traditional_treatments = models.JSONField(
        default=list,
        help_text='List of traditional/herbal treatments'
    )
    allopathic_treatments = models.JSONField(
        default=list,
        help_text='List of allopathic/modern treatments'
    )
    
    # Prevention and care
    prevention_measures = models.TextField(blank=True, null=True)
    care_instructions = models.TextField(blank=True, null=True)
    
    # Metadata
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this disease is active in the detection system'
    )
    detection_confidence_threshold = models.FloatField(
        default=0.6,
        help_text='Minimum confidence score (0-1) for AI to predict this disease'
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_diseases'
    )
    
    class Meta:
        db_table = 'diseases'
        ordering = ['name']
        verbose_name = 'Disease'
        verbose_name_plural = 'Diseases'
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def total_training_images(self):
        """Get total number of training images for this disease."""
        return self.training_images.count()


class TrainingDataset(models.Model):
    """Model for storing training datasets uploaded by admins."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending Processing'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    disease = models.ForeignKey(
        Disease,
        on_delete=models.CASCADE,
        related_name='training_datasets'
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Dataset file
    dataset_file = models.FileField(
        upload_to='training_datasets/%Y/%m/%d/',
        help_text='ZIP file containing training images'
    )
    
    # Processing status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_images = models.IntegerField(default=0)
    processed_images = models.IntegerField(default=0)
    
    # Metadata
    file_size = models.BigIntegerField(help_text='File size in bytes')
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional metadata about the dataset'
    )
    
    uploaded_at = models.DateTimeField(default=timezone.now)
    processed_at = models.DateTimeField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_datasets'
    )
    
    class Meta:
        db_table = 'training_datasets'
        ordering = ['-uploaded_at']
        verbose_name = 'Training Dataset'
        verbose_name_plural = 'Training Datasets'
        indexes = [
            models.Index(fields=['disease', '-uploaded_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.disease.name}"


class TrainingImage(models.Model):
    """Model for individual training images extracted from datasets."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    disease = models.ForeignKey(
        Disease,
        on_delete=models.CASCADE,
        related_name='training_images'
    )
    dataset = models.ForeignKey(
        TrainingDataset,
        on_delete=models.CASCADE,
        related_name='images',
        null=True,
        blank=True
    )
    
    image = models.ImageField(
        upload_to='training_images/%Y/%m/%d/',
        help_text='Training image for disease detection'
    )
    
    # Image metadata
    original_filename = models.CharField(max_length=255)
    image_hash = models.CharField(
        max_length=64,
        unique=True,
        help_text='SHA256 hash to prevent duplicates'
    )
    
    # Labels and annotations
    labels = models.JSONField(
        default=list,
        help_text='Additional labels or tags for this image'
    )
    annotations = models.JSONField(
        default=dict,
        blank=True,
        help_text='Bounding boxes or other annotations'
    )
    
    # Quality metrics
    is_validated = models.BooleanField(default=False)
    quality_score = models.FloatField(
        null=True,
        blank=True,
        help_text='Image quality score (0-1)'
    )
    
    uploaded_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'training_images'
        ordering = ['-uploaded_at']
        verbose_name = 'Training Image'
        verbose_name_plural = 'Training Images'
        indexes = [
            models.Index(fields=['disease', '-uploaded_at']),
            models.Index(fields=['image_hash']),
            models.Index(fields=['is_validated']),
        ]
    
    def __str__(self):
        return f"{self.disease.name} - {self.original_filename}"


class AIModel(models.Model):
    """Model for tracking AI model versions and training history."""
    
    STATUS_CHOICES = [
        ('training', 'Training'),
        ('completed', 'Completed'),
        ('deployed', 'Deployed'),
        ('archived', 'Archived'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    
    # Model file
    model_file = models.FileField(
        upload_to='ai_models/',
        help_text='Trained model file (.h5, .pkl, etc.)'
    )
    
    # Training information
    diseases = models.ManyToManyField(
        Disease,
        related_name='ai_models',
        help_text='Diseases this model can detect'
    )
    training_dataset_count = models.IntegerField(default=0)
    training_image_count = models.IntegerField(default=0)
    
    # Performance metrics
    accuracy = models.FloatField(null=True, blank=True)
    precision = models.FloatField(null=True, blank=True)
    recall = models.FloatField(null=True, blank=True)
    f1_score = models.FloatField(null=True, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='training')
    is_active = models.BooleanField(
        default=False,
        help_text='Whether this model is currently being used for predictions'
    )
    
    # Metadata
    training_config = models.JSONField(
        default=dict,
        blank=True,
        help_text='Training configuration and hyperparameters'
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    trained_at = models.DateTimeField(null=True, blank=True)
    deployed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_models'
    )
    
    class Meta:
        db_table = 'ai_models'
        ordering = ['-created_at']
        verbose_name = 'AI Model'
        verbose_name_plural = 'AI Models'
        indexes = [
            models.Index(fields=['version']),
            models.Index(fields=['status']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"Model v{self.version} - {self.status}"
    
    def activate(self):
        """Set this model as the active model for predictions."""
        # Deactivate all other models
        AIModel.objects.filter(is_active=True).update(is_active=False)
        # Activate this model
        self.is_active = True
        self.status = 'deployed'
        self.deployed_at = timezone.now()
        self.save()
