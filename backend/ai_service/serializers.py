"""
Serializers for AI prediction service.
"""
from rest_framework import serializers
from cattle.models import Cattle


class DiseasePredictionRequestSerializer(serializers.Serializer):
    """Serializer for disease prediction requests."""
    
    cattle_id = serializers.UUIDField()
    symptoms = serializers.CharField(min_length=10, max_length=2000)
    images = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        max_length=5,
        help_text='Up to 5 images'
    )
    save_assessment = serializers.BooleanField(default=True)
    
    def validate_cattle_id(self, value):
        """Validate cattle ownership."""
        request = self.context.get('request')
        try:
            cattle = Cattle.objects.get(id=value)
            if request and cattle.owner != request.user:
                raise serializers.ValidationError(
                    'You can only request predictions for your own cattle.'
                )
            return cattle
        except Cattle.DoesNotExist:
            raise serializers.ValidationError('Cattle not found.')
    
    def validate_images(self, value):
        """Validate uploaded images."""
        if len(value) > 5:
            raise serializers.ValidationError('Maximum 5 images allowed.')
        
        for image in value:
            # Check file size (max 10MB)
            if image.size > 10 * 1024 * 1024:
                raise serializers.ValidationError(
                    f'Image {image.name} exceeds 10MB size limit.'
                )
            
            # Check file format
            allowed_formats = ['image/jpeg', 'image/png', 'image/jpg']
            if hasattr(image, 'content_type') and image.content_type not in allowed_formats:
                raise serializers.ValidationError(
                    f'Image {image.name} must be JPEG or PNG format.'
                )
        
        return value
    
    def to_internal_value(self, data):
        """Convert cattle_id to cattle object."""
        validated_data = super().to_internal_value(data)
        validated_data['cattle'] = validated_data.pop('cattle_id')
        return validated_data


class DiseasePredictionSerializer(serializers.Serializer):
    """Serializer for individual disease predictions."""
    
    diseaseName = serializers.CharField()
    confidenceScore = serializers.FloatField()
    severityLevel = serializers.CharField()
    description = serializers.CharField()
    commonSymptoms = serializers.ListField(child=serializers.CharField())
    riskFactors = serializers.ListField(child=serializers.CharField())
    source = serializers.CharField(required=False)


class DiseasePredictionResponseSerializer(serializers.Serializer):
    """Serializer for disease prediction responses."""
    
    success = serializers.BooleanField()
    predictions = serializers.ListField(child=DiseasePredictionSerializer(), required=False)
    model_version = serializers.CharField(required=False)
    timestamp = serializers.CharField(required=False)
    assessment_saved = serializers.BooleanField(required=False)
    symptom_entry_id = serializers.CharField(required=False)
    disclaimer = serializers.CharField(required=False)
    error = serializers.CharField(required=False)
    message = serializers.CharField(required=False)


class AIModelInfoSerializer(serializers.Serializer):
    """Serializer for AI model information."""
    
    id = serializers.UUIDField()
    version = serializers.CharField()
    description = serializers.CharField()
    status = serializers.CharField()
    accuracy = serializers.FloatField(allow_null=True)
    precision = serializers.FloatField(allow_null=True)
    recall = serializers.FloatField(allow_null=True)
    f1_score = serializers.FloatField(allow_null=True)
    training_dataset_count = serializers.IntegerField()
    training_image_count = serializers.IntegerField()
    diseases = serializers.ListField(child=serializers.DictField())
    created_at = serializers.DateTimeField()
    deployed_at = serializers.DateTimeField(allow_null=True)


class FeedbackSerializer(serializers.Serializer):
    """Serializer for AI prediction feedback."""
    
    prediction_id = serializers.CharField()
    predicted_disease = serializers.CharField()
    actual_disease = serializers.CharField()
    was_correct = serializers.BooleanField()
    comments = serializers.CharField(max_length=1000, required=False)