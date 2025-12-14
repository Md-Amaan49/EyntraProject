"""
Treatment recommendation models for cattle diseases.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from .disease_models import Disease


class TreatmentCategory(models.Model):
    """Categories for organizing treatments."""
    
    CATEGORY_TYPES = [
        ('traditional', 'Traditional/Herbal'),
        ('allopathic', 'Allopathic/Modern'),
        ('supportive', 'Supportive Care'),
        ('preventive', 'Preventive'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    category_type = models.CharField(max_length=20, choices=CATEGORY_TYPES)
    description = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'treatment_categories'
        ordering = ['category_type', 'name']
        verbose_name = 'Treatment Category'
        verbose_name_plural = 'Treatment Categories'
    
    def __str__(self):
        return f"{self.name} ({self.get_category_type_display()})"


class Treatment(models.Model):
    """Individual treatment options for diseases."""
    
    ADMINISTRATION_METHODS = [
        ('oral', 'Oral'),
        ('topical', 'Topical'),
        ('injection', 'Injection'),
        ('intravenous', 'Intravenous'),
        ('intramuscular', 'Intramuscular'),
        ('subcutaneous', 'Subcutaneous'),
        ('inhalation', 'Inhalation'),
        ('feed_additive', 'Feed Additive'),
        ('water_additive', 'Water Additive'),
    ]
    
    EFFECTIVENESS_LEVELS = [
        ('low', 'Low'),
        ('moderate', 'Moderate'),
        ('high', 'High'),
        ('very_high', 'Very High'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, db_index=True)
    category = models.ForeignKey(
        TreatmentCategory,
        on_delete=models.CASCADE,
        related_name='treatments'
    )
    diseases = models.ManyToManyField(
        Disease,
        related_name='treatments',
        help_text='Diseases this treatment is effective for'
    )
    
    # Treatment details
    description = models.TextField(help_text='Detailed description of the treatment')
    ingredients = models.JSONField(
        default=list,
        help_text='List of active ingredients or components'
    )
    
    # Dosage and administration
    dosage = models.TextField(help_text='Dosage instructions')
    administration_method = models.CharField(
        max_length=20,
        choices=ADMINISTRATION_METHODS,
        default='oral'
    )
    frequency = models.CharField(
        max_length=100,
        help_text='How often to administer (e.g., "twice daily", "every 8 hours")'
    )
    duration = models.CharField(
        max_length=100,
        help_text='Treatment duration (e.g., "5-7 days", "until symptoms resolve")'
    )
    
    # Preparation (for traditional treatments)
    preparation_method = models.TextField(
        blank=True,
        null=True,
        help_text='How to prepare the treatment (for traditional remedies)'
    )
    
    # Safety information
    precautions = models.JSONField(
        default=list,
        help_text='List of precautions and warnings'
    )
    side_effects = models.JSONField(
        default=list,
        help_text='List of potential side effects'
    )
    contraindications = models.JSONField(
        default=list,
        help_text='Conditions where this treatment should not be used'
    )
    
    # Effectiveness and evidence
    effectiveness = models.CharField(
        max_length=20,
        choices=EFFECTIVENESS_LEVELS,
        default='moderate'
    )
    evidence_level = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Level of scientific evidence (e.g., "Clinical trials", "Traditional use")'
    )
    
    # Availability and cost
    availability = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text='Where to obtain this treatment'
    )
    estimated_cost = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Estimated cost range'
    )
    
    # Metadata
    is_active = models.BooleanField(default=True)
    requires_prescription = models.BooleanField(
        default=False,
        help_text='Whether this treatment requires veterinary prescription'
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_treatments'
    )
    
    class Meta:
        db_table = 'treatments'
        ordering = ['category__category_type', 'name']
        verbose_name = 'Treatment'
        verbose_name_plural = 'Treatments'
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['category', 'effectiveness']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.category.get_category_type_display()})"
    
    @property
    def is_traditional(self):
        """Check if this is a traditional treatment."""
        return self.category.category_type == 'traditional'
    
    @property
    def is_allopathic(self):
        """Check if this is an allopathic treatment."""
        return self.category.category_type == 'allopathic'


class TreatmentRecommendation(models.Model):
    """Specific treatment recommendations for disease predictions."""
    
    RECOMMENDATION_STRENGTH = [
        ('weak', 'Weak'),
        ('moderate', 'Moderate'),
        ('strong', 'Strong'),
        ('very_strong', 'Very Strong'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    disease = models.ForeignKey(
        Disease,
        on_delete=models.CASCADE,
        related_name='treatment_recommendations'
    )
    treatment = models.ForeignKey(
        Treatment,
        on_delete=models.CASCADE,
        related_name='recommendations'
    )
    
    # Recommendation specifics
    recommendation_strength = models.CharField(
        max_length=20,
        choices=RECOMMENDATION_STRENGTH,
        default='moderate'
    )
    priority_order = models.IntegerField(
        default=1,
        help_text='Priority order for this treatment (1 = highest priority)'
    )
    
    # Condition-specific adjustments
    severity_specific = models.JSONField(
        default=dict,
        blank=True,
        help_text='Adjustments based on disease severity'
    )
    age_specific = models.JSONField(
        default=dict,
        blank=True,
        help_text='Age-specific dosage or precautions'
    )
    breed_specific = models.JSONField(
        default=dict,
        blank=True,
        help_text='Breed-specific considerations'
    )
    
    # Additional notes
    special_instructions = models.TextField(
        blank=True,
        null=True,
        help_text='Special instructions for this disease-treatment combination'
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='treatment_recommendations'
    )
    
    class Meta:
        db_table = 'treatment_recommendations'
        ordering = ['disease', 'priority_order']
        unique_together = ['disease', 'treatment']
        verbose_name = 'Treatment Recommendation'
        verbose_name_plural = 'Treatment Recommendations'
        indexes = [
            models.Index(fields=['disease', 'priority_order']),
            models.Index(fields=['recommendation_strength']),
        ]
    
    def __str__(self):
        return f"{self.disease.name} → {self.treatment.name} (Priority {self.priority_order})"


class TreatmentProtocol(models.Model):
    """Complete treatment protocols for specific diseases."""
    
    PROTOCOL_TYPES = [
        ('standard', 'Standard Protocol'),
        ('emergency', 'Emergency Protocol'),
        ('chronic', 'Chronic Management'),
        ('preventive', 'Preventive Protocol'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    disease = models.ForeignKey(
        Disease,
        on_delete=models.CASCADE,
        related_name='protocols'
    )
    protocol_type = models.CharField(max_length=20, choices=PROTOCOL_TYPES)
    
    # Protocol details
    description = models.TextField()
    treatments = models.ManyToManyField(
        Treatment,
        through='ProtocolStep',
        related_name='protocols'
    )
    
    # Conditions for use
    severity_range = models.JSONField(
        default=list,
        help_text='Severity levels this protocol applies to'
    )
    age_range = models.JSONField(
        default=dict,
        blank=True,
        help_text='Age range this protocol applies to'
    )
    
    # Timeline
    total_duration = models.CharField(
        max_length=100,
        help_text='Total expected duration of protocol'
    )
    
    # Success metrics
    expected_outcomes = models.JSONField(
        default=list,
        help_text='Expected outcomes and timeline'
    )
    success_indicators = models.JSONField(
        default=list,
        help_text='Signs that treatment is working'
    )
    
    # Metadata
    is_active = models.BooleanField(default=True)
    requires_veterinary_supervision = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_protocols'
    )
    
    class Meta:
        db_table = 'treatment_protocols'
        ordering = ['disease', 'protocol_type', 'name']
        verbose_name = 'Treatment Protocol'
        verbose_name_plural = 'Treatment Protocols'
    
    def __str__(self):
        return f"{self.disease.name} - {self.name}"


class ProtocolStep(models.Model):
    """Individual steps in a treatment protocol."""
    
    STEP_TYPES = [
        ('immediate', 'Immediate Action'),
        ('daily', 'Daily Treatment'),
        ('monitoring', 'Monitoring'),
        ('followup', 'Follow-up'),
    ]
    
    protocol = models.ForeignKey(
        TreatmentProtocol,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    treatment = models.ForeignKey(Treatment, on_delete=models.CASCADE)
    
    step_number = models.IntegerField()
    step_type = models.CharField(max_length=20, choices=STEP_TYPES)
    
    # Step details
    instructions = models.TextField()
    timing = models.CharField(
        max_length=100,
        help_text='When to perform this step (e.g., "Day 1", "Every 12 hours")'
    )
    duration = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='How long to continue this step'
    )
    
    # Conditional logic
    conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text='Conditions that must be met for this step'
    )
    
    class Meta:
        db_table = 'protocol_steps'
        ordering = ['protocol', 'step_number']
        unique_together = ['protocol', 'step_number']
    
    def __str__(self):
        return f"{self.protocol.name} - Step {self.step_number}: {self.treatment.name}"