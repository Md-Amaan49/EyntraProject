"""
Serializers for cattle profile management.
"""
from rest_framework import serializers
from .models import Cattle, CattleHistory


class CattleSerializer(serializers.ModelSerializer):
    """Serializer for cattle profiles."""
    
    owner_name = serializers.CharField(source='owner.name', read_only=True)
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    
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
            'is_archived',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'is_archived', 'created_at', 'updated_at']
    
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
        """Validate identification number uniqueness."""
        # Check if updating existing cattle
        if self.instance:
            # Exclude current instance from uniqueness check
            if Cattle.objects.exclude(pk=self.instance.pk).filter(identification_number=value).exists():
                raise serializers.ValidationError("This identification number is already in use.")
        else:
            # Creating new cattle
            if Cattle.objects.filter(identification_number=value).exists():
                raise serializers.ValidationError("This identification number is already in use.")
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
            'health_status'
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
            'health_status'
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
    
    class Meta:
        model = Cattle
        fields = [
            'id',
            'breed',
            'age',
            'identification_number',
            'gender',
            'health_status',
            'created_at'
        ]
        read_only_fields = fields
