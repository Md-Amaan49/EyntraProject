"""
Admin configuration for health models.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import SymptomEntry, HealthImage
from .disease_models import Disease, TrainingDataset, TrainingImage, AIModel
from .treatment_models import (
    TreatmentCategory, Treatment, TreatmentRecommendation, 
    TreatmentProtocol, ProtocolStep
)


@admin.register(SymptomEntry)
class SymptomEntryAdmin(admin.ModelAdmin):
    """Admin for symptom entries."""
    
    list_display = ['cattle', 'severity', 'created_by', 'created_at']
    list_filter = ['severity', 'created_at', 'cattle__breed']
    search_fields = ['cattle__identification_number', 'symptoms', 'created_by__name']
    readonly_fields = ['created_at']
    
    fieldsets = (
        (None, {
            'fields': ('cattle', 'symptoms', 'severity', 'additional_notes')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(HealthImage)
class HealthImageAdmin(admin.ModelAdmin):
    """Admin for health images."""
    
    list_display = ['cattle', 'image_type', 'uploaded_by', 'upload_date', 'image_preview']
    list_filter = ['image_type', 'upload_date', 'cattle__breed']
    search_fields = ['cattle__identification_number', 'uploaded_by__name']
    readonly_fields = ['upload_date', 'image_preview']
    
    def image_preview(self, obj):
        """Show image preview in admin."""
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width: 100px; max-height: 100px;" />',
                obj.image.url
            )
        return "No image"
    image_preview.short_description = "Preview"


@admin.register(Disease)
class DiseaseAdmin(admin.ModelAdmin):
    """Admin for diseases."""
    
    list_display = ['name', 'severity', 'is_active', 'total_training_images', 'created_at']
    list_filter = ['severity', 'is_active', 'created_at']
    search_fields = ['name', 'scientific_name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'total_training_images']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'scientific_name', 'description', 'severity', 'is_active')
        }),
        ('Symptoms', {
            'fields': ('common_symptoms',),
            'description': 'Enter symptoms as a JSON list, e.g., ["fever", "cough", "loss of appetite"]'
        }),
        ('Treatments', {
            'fields': ('traditional_treatments', 'allopathic_treatments'),
            'description': 'Enter treatments as JSON objects with name, dosage, etc.'
        }),
        ('Care Information', {
            'fields': ('prevention_measures', 'care_instructions')
        }),
        ('AI Configuration', {
            'fields': ('detection_confidence_threshold',),
            'description': 'Minimum confidence score (0.0-1.0) for AI to predict this disease'
        }),
        ('Metadata', {
            'fields': ('total_training_images', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Set created_by when saving."""
        if not change:  # Only set on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


class TrainingImageInline(admin.TabularInline):
    """Inline for training images."""
    
    model = TrainingImage
    extra = 0
    readonly_fields = ['image_hash', 'uploaded_at', 'image_preview']
    fields = ['image', 'original_filename', 'labels', 'is_validated', 'quality_score', 'image_preview']
    
    def image_preview(self, obj):
        """Show image preview."""
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width: 50px; max-height: 50px;" />',
                obj.image.url
            )
        return "No image"
    image_preview.short_description = "Preview"


@admin.register(TrainingDataset)
class TrainingDatasetAdmin(admin.ModelAdmin):
    """Admin for training datasets."""
    
    list_display = ['name', 'disease', 'status', 'total_images', 'processed_images', 'uploaded_at']
    list_filter = ['status', 'disease', 'uploaded_at']
    search_fields = ['name', 'disease__name', 'uploaded_by__name']
    readonly_fields = ['uploaded_at', 'processed_at', 'file_size', 'processing_progress']
    inlines = [TrainingImageInline]
    
    fieldsets = (
        ('Dataset Information', {
            'fields': ('name', 'disease', 'description', 'dataset_file')
        }),
        ('Processing Status', {
            'fields': ('status', 'total_images', 'processed_images', 'processing_progress')
        }),
        ('Metadata', {
            'fields': ('file_size', 'metadata', 'uploaded_by', 'uploaded_at', 'processed_at'),
            'classes': ('collapse',)
        }),
    )
    
    def processing_progress(self, obj):
        """Show processing progress."""
        if obj.total_images > 0:
            percentage = (obj.processed_images / obj.total_images) * 100
            return f"{obj.processed_images}/{obj.total_images} ({percentage:.1f}%)"
        return "0/0 (0%)"
    processing_progress.short_description = "Progress"
    
    def save_model(self, request, obj, form, change):
        """Set uploaded_by and file_size when saving."""
        if not change:  # Only set on creation
            obj.uploaded_by = request.user
            if obj.dataset_file:
                obj.file_size = obj.dataset_file.size
        super().save_model(request, obj, form, change)


@admin.register(TrainingImage)
class TrainingImageAdmin(admin.ModelAdmin):
    """Admin for training images."""
    
    list_display = ['original_filename', 'disease', 'is_validated', 'quality_score', 'uploaded_at', 'image_preview']
    list_filter = ['disease', 'is_validated', 'uploaded_at']
    search_fields = ['original_filename', 'disease__name', 'image_hash']
    readonly_fields = ['image_hash', 'uploaded_at', 'image_preview']
    
    fieldsets = (
        ('Image Information', {
            'fields': ('disease', 'dataset', 'image', 'original_filename')
        }),
        ('Labels and Quality', {
            'fields': ('labels', 'annotations', 'is_validated', 'quality_score')
        }),
        ('Metadata', {
            'fields': ('image_hash', 'uploaded_at', 'image_preview'),
            'classes': ('collapse',)
        }),
    )
    
    def image_preview(self, obj):
        """Show image preview."""
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width: 200px; max-height: 200px;" />',
                obj.image.url
            )
        return "No image"
    image_preview.short_description = "Preview"


@admin.register(AIModel)
class AIModelAdmin(admin.ModelAdmin):
    """Admin for AI models."""
    
    list_display = ['version', 'status', 'is_active', 'accuracy', 'training_image_count', 'created_at']
    list_filter = ['status', 'is_active', 'created_at']
    search_fields = ['version', 'description']
    readonly_fields = ['created_at', 'trained_at', 'deployed_at', 'performance_summary']
    filter_horizontal = ['diseases']
    
    fieldsets = (
        ('Model Information', {
            'fields': ('version', 'description', 'model_file', 'diseases')
        }),
        ('Training Data', {
            'fields': ('training_dataset_count', 'training_image_count', 'training_config')
        }),
        ('Performance Metrics', {
            'fields': ('accuracy', 'precision', 'recall', 'f1_score', 'performance_summary')
        }),
        ('Status', {
            'fields': ('status', 'is_active')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'trained_at', 'deployed_at'),
            'classes': ('collapse',)
        }),
    )
    
    def performance_summary(self, obj):
        """Show performance metrics summary."""
        if obj.accuracy is not None:
            return format_html(
                '<strong>Accuracy:</strong> {:.2%}<br>'
                '<strong>Precision:</strong> {:.2%}<br>'
                '<strong>Recall:</strong> {:.2%}<br>'
                '<strong>F1 Score:</strong> {:.2%}',
                obj.accuracy or 0,
                obj.precision or 0,
                obj.recall or 0,
                obj.f1_score or 0
            )
        return "No metrics available"
    performance_summary.short_description = "Performance"
    
    def save_model(self, request, obj, form, change):
        """Set created_by when saving."""
        if not change:  # Only set on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    actions = ['activate_model']
    
    def activate_model(self, request, queryset):
        """Action to activate selected model."""
        if queryset.count() != 1:
            self.message_user(request, "Please select exactly one model to activate.", level='ERROR')
            return
        
        model = queryset.first()
        model.activate()
        self.message_user(request, f"Model {model.version} has been activated.", level='SUCCESS')
    
    activate_model.short_description = "Activate selected model"

@admin.register(TreatmentCategory)
class TreatmentCategoryAdmin(admin.ModelAdmin):
    """Admin for treatment categories."""
    
    list_display = ['name', 'category_type', 'created_at']
    list_filter = ['category_type', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']


class TreatmentRecommendationInline(admin.TabularInline):
    """Inline for treatment recommendations."""
    
    model = TreatmentRecommendation
    extra = 0
    fields = ['disease', 'recommendation_strength', 'priority_order', 'special_instructions']


@admin.register(Treatment)
class TreatmentAdmin(admin.ModelAdmin):
    """Admin for treatments."""
    
    list_display = ['name', 'category', 'effectiveness', 'requires_prescription', 'is_active', 'created_at']
    list_filter = ['category__category_type', 'effectiveness', 'requires_prescription', 'is_active', 'created_at']
    search_fields = ['name', 'description', 'ingredients']
    readonly_fields = ['created_at', 'updated_at']
    filter_horizontal = ['diseases']
    inlines = [TreatmentRecommendationInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'category', 'description', 'diseases', 'is_active')
        }),
        ('Treatment Details', {
            'fields': ('ingredients', 'dosage', 'administration_method', 'frequency', 'duration')
        }),
        ('Preparation (Traditional)', {
            'fields': ('preparation_method',),
            'description': 'For traditional treatments only'
        }),
        ('Safety Information', {
            'fields': ('precautions', 'side_effects', 'contraindications')
        }),
        ('Effectiveness & Evidence', {
            'fields': ('effectiveness', 'evidence_level')
        }),
        ('Availability & Cost', {
            'fields': ('availability', 'estimated_cost', 'requires_prescription')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Set created_by when saving."""
        if not change:  # Only set on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(TreatmentRecommendation)
class TreatmentRecommendationAdmin(admin.ModelAdmin):
    """Admin for treatment recommendations."""
    
    list_display = ['disease', 'treatment', 'recommendation_strength', 'priority_order', 'created_at']
    list_filter = ['recommendation_strength', 'disease', 'treatment__category__category_type', 'created_at']
    search_fields = ['disease__name', 'treatment__name', 'special_instructions']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Recommendation', {
            'fields': ('disease', 'treatment', 'recommendation_strength', 'priority_order')
        }),
        ('Condition-Specific Adjustments', {
            'fields': ('severity_specific', 'age_specific', 'breed_specific'),
            'description': 'JSON objects with condition-specific adjustments'
        }),
        ('Additional Information', {
            'fields': ('special_instructions',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Set created_by when saving."""
        if not change:  # Only set on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


class ProtocolStepInline(admin.TabularInline):
    """Inline for protocol steps."""
    
    model = ProtocolStep
    extra = 0
    fields = ['step_number', 'step_type', 'treatment', 'instructions', 'timing', 'duration']
    ordering = ['step_number']


@admin.register(TreatmentProtocol)
class TreatmentProtocolAdmin(admin.ModelAdmin):
    """Admin for treatment protocols."""
    
    list_display = ['name', 'disease', 'protocol_type', 'is_active', 'requires_veterinary_supervision', 'created_at']
    list_filter = ['protocol_type', 'is_active', 'requires_veterinary_supervision', 'disease', 'created_at']
    search_fields = ['name', 'description', 'disease__name']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [ProtocolStepInline]
    
    fieldsets = (
        ('Protocol Information', {
            'fields': ('name', 'disease', 'protocol_type', 'description', 'is_active')
        }),
        ('Conditions', {
            'fields': ('severity_range', 'age_range', 'requires_veterinary_supervision')
        }),
        ('Timeline & Outcomes', {
            'fields': ('total_duration', 'expected_outcomes', 'success_indicators')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Set created_by when saving."""
        if not change:  # Only set on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ProtocolStep)
class ProtocolStepAdmin(admin.ModelAdmin):
    """Admin for protocol steps."""
    
    list_display = ['protocol', 'step_number', 'step_type', 'treatment', 'timing']
    list_filter = ['step_type', 'protocol__disease', 'protocol__protocol_type']
    search_fields = ['protocol__name', 'treatment__name', 'instructions']
    
    fieldsets = (
        ('Step Information', {
            'fields': ('protocol', 'step_number', 'step_type', 'treatment')
        }),
        ('Instructions', {
            'fields': ('instructions', 'timing', 'duration')
        }),
        ('Conditions', {
            'fields': ('conditions',),
            'description': 'JSON object with conditions for this step'
        }),
    )