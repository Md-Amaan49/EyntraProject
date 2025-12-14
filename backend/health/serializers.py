"""
Serializers for health assessment and symptom submission.
"""
from rest_framework import serializers
from .models import SymptomEntry, HealthImage
from PIL import Image
import io


class HealthImageSerializer(serializers.ModelSerializer):
    """Serializer for health images."""
    
    image_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)
    
    class Meta:
        model = HealthImage
        fields = [
            'id',
            'cattle',
            'symptom_entry',
            'image',
            'image_url',
            'image_type',
            'upload_date',
            'metadata',
            'uploaded_by',
            'uploaded_by_name'
        ]
        read_only_fields = ['id', 'upload_date', 'metadata', 'uploaded_by']
    
    def get_image_url(self, obj):
        """Get full URL for the image."""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def validate_image(self, value):
        """Validate image format and size."""
        # Check file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError(
                f"Image size exceeds maximum allowed size of 10MB. Current size: {value.size / (1024 * 1024):.2f}MB"
            )
        
        # Check file format
        allowed_formats = ['JPEG', 'PNG', 'JPG']
        try:
            img = Image.open(value)
            if img.format.upper() not in allowed_formats:
                raise serializers.ValidationError(
                    f"Invalid image format '{img.format}'. Only JPEG and PNG formats are allowed."
                )
            
            # Store dimensions in metadata
            width, height = img.size
            if not hasattr(value, '_metadata'):
                value._metadata = {}
            value._metadata['dimensions'] = {'width': width, 'height': height}
            value._metadata['format'] = img.format
            
        except Exception as e:
            raise serializers.ValidationError(f"Invalid image file: {str(e)}")
        
        return value
    
    def create(self, validated_data):
        """Create health image with metadata."""
        request = self.context.get('request')
        if request:
            validated_data['uploaded_by'] = request.user
        
        # Add metadata from validation
        image_file = validated_data.get('image')
        if hasattr(image_file, '_metadata'):
            validated_data['metadata'] = {
                'size': image_file.size,
                'name': image_file.name,
                **image_file._metadata
            }
        
        return super().create(validated_data)


class SymptomEntrySerializer(serializers.ModelSerializer):
    """Serializer for symptom entries."""
    
    images = HealthImageSerializer(many=True, read_only=True)
    cattle_name = serializers.CharField(source='cattle.breed', read_only=True)
    cattle_id_number = serializers.CharField(source='cattle.identification_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = SymptomEntry
        fields = [
            'id',
            'cattle',
            'cattle_name',
            'cattle_id_number',
            'symptoms',
            'observed_date',
            'severity',
            'additional_notes',
            'images',
            'created_at',
            'created_by',
            'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'created_by', 'images']
    
    def validate_symptoms(self, value):
        """Validate symptom description length."""
        if len(value.strip()) < 10:
            raise serializers.ValidationError(
                "Symptom description must be at least 10 characters long."
            )
        return value.strip()
    
    def validate(self, attrs):
        """Validate that cattle belongs to the user."""
        request = self.context.get('request')
        cattle = attrs.get('cattle')
        
        if request and cattle:
            if cattle.owner != request.user:
                raise serializers.ValidationError({
                    'cattle': 'You can only submit symptoms for your own cattle.'
                })
        
        return attrs
    
    def create(self, validated_data):
        """Create symptom entry with user."""
        request = self.context.get('request')
        if request:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class SymptomSubmissionSerializer(serializers.Serializer):
    """Serializer for complete symptom submission with images."""
    
    cattle_id = serializers.UUIDField()
    symptoms = serializers.CharField(min_length=10)
    severity = serializers.ChoiceField(
        choices=['mild', 'moderate', 'severe'],
        default='moderate'
    )
    additional_notes = serializers.CharField(required=False, allow_blank=True)
    images = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        max_length=5,
        help_text='Up to 5 images'
    )
    
    def validate_images(self, value):
        """Validate image count."""
        if len(value) > 5:
            raise serializers.ValidationError(
                "Maximum 5 images allowed per submission."
            )
        return value
    
    def validate(self, attrs):
        """Validate cattle ownership."""
        from cattle.models import Cattle
        
        request = self.context.get('request')
        cattle_id = attrs.get('cattle_id')
        
        try:
            cattle = Cattle.objects.get(id=cattle_id)
            if request and cattle.owner != request.user:
                raise serializers.ValidationError({
                    'cattle_id': 'You can only submit symptoms for your own cattle.'
                })
            attrs['cattle'] = cattle
        except Cattle.DoesNotExist:
            raise serializers.ValidationError({
                'cattle_id': 'Cattle not found.'
            })
        
        return attrs


class TreatmentRecommendationRequestSerializer(serializers.Serializer):
    """Serializer for treatment recommendation requests."""
    
    disease_predictions = serializers.ListField(
        child=serializers.DictField(),
        help_text='List of disease predictions from AI service'
    )
    cattle_metadata = serializers.DictField(
        required=False,
        help_text='Optional cattle information (breed, age, gender, etc.)'
    )
    preference = serializers.ChoiceField(
        choices=['traditional', 'allopathic', 'balanced'],
        default='balanced',
        required=False,
        help_text='Treatment preference'
    )
    
    def validate_disease_predictions(self, value):
        """Validate disease predictions structure."""
        if not value:
            raise serializers.ValidationError("At least one disease prediction is required.")
        
        required_fields = ['diseaseName', 'confidenceScore']
        
        for i, prediction in enumerate(value):
            for field in required_fields:
                if field not in prediction:
                    raise serializers.ValidationError(
                        f"Prediction {i+1} is missing required field: {field}"
                    )
            
            # Validate confidence score
            confidence = prediction.get('confidenceScore')
            if not isinstance(confidence, (int, float)) or not (0 <= confidence <= 100):
                raise serializers.ValidationError(
                    f"Prediction {i+1} has invalid confidence score. Must be between 0 and 100."
                )
        
        return value
    
    def validate_cattle_metadata(self, value):
        """Validate cattle metadata structure."""
        if value:
            # Validate age if provided
            age = value.get('age')
            if age is not None:
                try:
                    age = int(age)
                    if age < 0 or age > 30:
                        raise serializers.ValidationError(
                            "Age must be between 0 and 30 years."
                        )
                    value['age'] = age
                except (ValueError, TypeError):
                    raise serializers.ValidationError("Age must be a valid number.")
            
            # Validate gender if provided
            gender = value.get('gender')
            if gender and gender not in ['male', 'female']:
                raise serializers.ValidationError(
                    "Gender must be 'male' or 'female'."
                )
        
        return value