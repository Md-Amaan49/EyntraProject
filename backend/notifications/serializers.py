"""
Serializers for notification models.
"""
from rest_framework import serializers
from .models import Notification, NotificationPreferences, NotificationDelivery


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications."""
    
    user_name = serializers.CharField(source='user.name', read_only=True)
    cattle_identification = serializers.CharField(
        source='cattle.identification_number', 
        read_only=True
    )
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user_name', 'notification_type', 'title', 'message',
            'priority', 'cattle', 'cattle_identification', 'consultation',
            'disease_alert', 'send_email', 'send_sms', 'send_push',
            'status', 'is_read', 'metadata', 'action_url', 'created_at',
            'sent_at', 'delivered_at', 'read_at', 'expires_at', 'time_ago'
        ]
        read_only_fields = [
            'user_name', 'cattle_identification', 'status', 'sent_at',
            'delivered_at', 'read_at', 'time_ago'
        ]
    
    def get_time_ago(self, obj):
        """Get human-readable time since notification was created."""
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return "Just now"
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff < timedelta(days=7):
            days = diff.days
            return f"{days} day{'s' if days != 1 else ''} ago"
        else:
            return obj.created_at.strftime('%B %d, %Y')


class NotificationPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for notification preferences."""
    
    user_name = serializers.CharField(source='user.name', read_only=True)
    
    class Meta:
        model = NotificationPreferences
        fields = [
            'id', 'user_name', 'disease_alerts_enabled', 'disease_alerts_email',
            'disease_alerts_sms', 'disease_alerts_push', 'consultation_reminders',
            'consultation_updates', 'consultation_messages', 'health_reports',
            'treatment_reminders', 'vaccination_reminders', 'emergency_alerts',
            'emergency_contact_phone', 'regional_disease_alerts',
            'new_consultation_requests', 'outbreak_warnings', 'created_at',
            'updated_at'
        ]
        read_only_fields = ['user_name', 'created_at', 'updated_at']


class NotificationDeliverySerializer(serializers.ModelSerializer):
    """Serializer for notification deliveries."""
    
    notification_title = serializers.CharField(source='notification.title', read_only=True)
    
    class Meta:
        model = NotificationDelivery
        fields = [
            'id', 'notification', 'notification_title', 'channel', 'status',
            'recipient', 'external_id', 'error_message', 'retry_count',
            'max_retries', 'created_at', 'sent_at', 'delivered_at',
            'failed_at', 'next_retry_at'
        ]
        read_only_fields = [
            'notification_title', 'created_at', 'sent_at', 'delivered_at',
            'failed_at'
        ]


class NotificationCreateSerializer(serializers.Serializer):
    """Serializer for creating notifications."""
    
    notification_type = serializers.ChoiceField(choices=Notification.TYPE_CHOICES)
    title = serializers.CharField(max_length=200)
    message = serializers.CharField()
    priority = serializers.ChoiceField(
        choices=Notification.PRIORITY_CHOICES, 
        default='medium'
    )
    cattle_id = serializers.UUIDField(required=False)
    consultation_id = serializers.UUIDField(required=False)
    disease_alert_id = serializers.UUIDField(required=False)
    metadata = serializers.JSONField(required=False, default=dict)
    action_url = serializers.URLField(required=False, allow_blank=True)
    send_email = serializers.BooleanField(default=False)
    send_sms = serializers.BooleanField(default=False)
    send_push = serializers.BooleanField(default=True)


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer for notification statistics."""
    
    total_notifications = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()
    priority_counts = serializers.DictField()
    type_counts = serializers.DictField()
    recent_notifications = NotificationSerializer(many=True, read_only=True)