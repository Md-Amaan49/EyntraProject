"""
Serializers for cattle profile management.
"""
from rest_framework import serializers
from .models import Cattle, CattleHistory


class CattleSerializer(serializers.ModelSerializer):
    """Serializer for cattle profiles."""
    
    owner_name = serializers.CharField(source='owner.name', read_only=True)
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Cattle
        fields = [
            'id',
            'owner',
            'owner_name',
            'owner_email',
            'breed',
            'age',
            'identification_number',
            'gender',
            'weight',
            'metadata',
            'health_status',
            'image',
            'image_url',
            'thumbnail_url',
            'is_archived',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'is_archived', 'created_at', 'updated_at', 'image_url', 'thumbnail_url']
    
    def get_image_url(self, obj):
        """Get the full URL for the cattle image."""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def get_thumbnail_url(self, obj):
        """Get the thumbnail URL for the cattle image."""
        # For now, return the same as image_url
        # In production, this would return a processed thumbnail
        return self.get_image_url(obj)
    
    def validate_age(self, value):
        """Validate cattle age is reasonable."""
        if value < 0:
            raise serializers.ValidationError("Age cannot be negative.")
        if value > 30:
            raise serializers.ValidationError("Age seems unreasonably high. Please verify.")
        return value
    
    def validate_weight(self, value):
        """Validate cattle weight is reasonable."""
        if value is not None:
            if value <= 0:
                raise serializers.ValidationError("Weight must be positive.")
            if value > 2000:
                raise serializers.ValidationError("Weight seems unreasonably high. Please verify.")
        return value
    
    def validate_identification_number(self, value):
        """Validate identification number uniqueness within owner scope."""
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Authentication required.")
        
        # Check if updating existing cattle
        if self.instance:
            # Exclude current instance from uniqueness check
            existing = Cattle.objects.filter(
                owner=request.user,
                identification_number=value,
                is_archived=False
            ).exclude(pk=self.instance.pk)
        else:
            # Creating new cattle
            existing = Cattle.objects.filter(
                owner=request.user,
                identification_number=value,
                is_archived=False
            )
        
        if existing.exists():
            raise serializers.ValidationError(
                f'You already have cattle with identification number "{value}".'
            )
        
        return value


class CattleCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating cattle profiles."""
    
    class Meta:
        model = Cattle
        fields = [
            'breed',
            'age',
            'identification_number',
            'gender',
            'weight',
            'metadata',
            'health_status',
            'image'
        ]
    
    def validate_age(self, value):
        """Validate cattle age is reasonable."""
        if value < 0:
            raise serializers.ValidationError("Age cannot be negative.")
        if value > 30:
            raise serializers.ValidationError("Age seems unreasonably high. Please verify.")
        return value
    
    def validate_weight(self, value):
        """Validate cattle weight is reasonable."""
        if value is not None:
            if value <= 0:
                raise serializers.ValidationError("Weight must be positive.")
            if value > 2000:
                raise serializers.ValidationError("Weight seems unreasonably high. Please verify.")
        return value
    
    def validate_identification_number(self, value):
        """Validate identification number uniqueness within owner scope."""
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Authentication required.")
        
        # Check for existing cattle with same ID for this owner
        existing = Cattle.objects.filter(
            owner=request.user,
            identification_number=value,
            is_archived=False
        )
        
        if existing.exists():
            raise serializers.ValidationError(
                f'You already have cattle with identification number "{value}".'
            )
        
        return value
    
    def create(self, validated_data):
        """Create cattle profile with owner from request context."""
        request = self.context.get('request')
        validated_data['owner'] = request.user
        return super().create(validated_data)


class CattleUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating cattle profiles."""
    
    class Meta:
        model = Cattle
        fields = [
            'breed',
            'age',
            'gender',
            'weight',
            'metadata',
            'health_status',
            'image'
        ]
    
    def validate_age(self, value):
        """Validate cattle age is reasonable."""
        if value < 0:
            raise serializers.ValidationError("Age cannot be negative.")
        if value > 30:
            raise serializers.ValidationError("Age seems unreasonably high. Please verify.")
        return value
    
    def validate_weight(self, value):
        """Validate cattle weight is reasonable."""
        if value is not None:
            if value <= 0:
                raise serializers.ValidationError("Weight must be positive.")
            if value > 2000:
                raise serializers.ValidationError("Weight seems unreasonably high. Please verify.")
        return value
    
    def update(self, instance, validated_data):
        """Update cattle profile and create history records."""
        request = self.context.get('request')
        
        # Track changes for history
        changes = []
        for field, new_value in validated_data.items():
            old_value = getattr(instance, field)
            if old_value != new_value:
                changes.append({
                    'field_name': field,
                    'old_value': str(old_value) if old_value is not None else None,
                    'new_value': str(new_value) if new_value is not None else None,
                })
        
        # Update the instance
        instance = super().update(instance, validated_data)
        
        # Create history records
        for change in changes:
            CattleHistory.objects.create(
                cattle=instance,
                changed_by=request.user if request else None,
                **change
            )
        
        return instance


class CattleHistorySerializer(serializers.ModelSerializer):
    """Serializer for cattle history records."""
    
    changed_by_name = serializers.CharField(source='changed_by.name', read_only=True)
    cattle_id = serializers.CharField(source='cattle.identification_number', read_only=True)
    
    class Meta:
        model = CattleHistory
        fields = [
            'id',
            'cattle_id',
            'field_name',
            'old_value',
            'new_value',
            'changed_by',
            'changed_by_name',
            'changed_at'
        ]
        read_only_fields = fields


class CattleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for cattle list view."""
    
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Cattle
        fields = [
            'id',
            'breed',
            'age',
            'identification_number',
            'gender',
            'health_status',
            'image_url',
            'thumbnail_url',
            'created_at'
        ]
        read_only_fields = fields
    
    def get_image_url(self, obj):
        """Get the full URL for the cattle image."""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def get_thumbnail_url(self, obj):
        """Get the thumbnail URL for the cattle image."""
        return self.get_image_url(obj)
