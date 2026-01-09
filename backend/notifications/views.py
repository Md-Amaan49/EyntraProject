"""
Views for notification management.
"""
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification, NotificationPreferences
from .serializers import (
    NotificationSerializer, NotificationPreferencesSerializer
)
from .services import NotificationService


class NotificationListView(generics.ListAPIView):
    """List notifications for the authenticated user."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Notification.objects.filter(user=user)
        
        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        # Filter by notification type
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notification_stats(request):
    """Get notification statistics for the user."""
    try:
        user = request.user
        
        total_notifications = Notification.objects.filter(user=user).count()
        unread_notifications = Notification.objects.filter(
            user=user, 
            is_read=False
        ).count()
        
        # Count by priority
        priority_counts = {}
        for priority, _ in Notification.PRIORITY_CHOICES:
            count = Notification.objects.filter(
                user=user, 
                priority=priority,
                is_read=False
            ).count()
            priority_counts[priority] = count
        
        # Count by type
        type_counts = {}
        for notification_type, _ in Notification.TYPE_CHOICES:
            count = Notification.objects.filter(
                user=user, 
                notification_type=notification_type,
                is_read=False
            ).count()
            type_counts[notification_type] = count
        
        return Response({
            'total_notifications': total_notifications,
            'unread_notifications': unread_notifications,
            'priority_counts': priority_counts,
            'type_counts': type_counts
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_as_read(request, notification_id):
    """Mark a specific notification as read."""
    try:
        notification = get_object_or_404(
            Notification,
            id=notification_id,
            user=request.user
        )
        
        notification.mark_as_read()
        
        return Response(
            NotificationSerializer(notification).data
        )
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_as_read(request):
    """Mark all notifications as read for the user."""
    try:
        notifications = Notification.objects.filter(
            user=request.user,
            is_read=False
        )
        
        count = notifications.count()
        for notification in notifications:
            notification.mark_as_read()
        
        return Response({
            'message': f'Marked {count} notifications as read',
            'count': count
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    """Delete a specific notification."""
    try:
        notification = get_object_or_404(
            Notification,
            id=notification_id,
            user=request.user
        )
        
        notification.delete()
        
        return Response({
            'message': 'Notification deleted successfully'
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class NotificationPreferencesView(generics.RetrieveUpdateAPIView):
    """Get and update notification preferences."""
    serializer_class = NotificationPreferencesSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        """Get or create notification preferences for the user."""
        preferences, created = NotificationPreferences.objects.get_or_create(
            user=self.request.user
        )
        return preferences


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_test_notification(request):
    """Send a test notification to the user."""
    try:
        notification_service = NotificationService()
        
        notification = notification_service.create_notification(
            user=request.user,
            notification_type='system_message',
            title='Test Notification',
            message='This is a test notification to verify your notification settings.',
            priority='low'
        )
        
        return Response({
            'message': 'Test notification sent successfully',
            'notification': NotificationSerializer(notification).data
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_disease_alert_notification(request):
    """Create disease alert notifications for nearby veterinarians."""
    try:
        data = request.data
        
        # This would typically be called from the health assessment system
        # when a disease is detected
        notification_service = NotificationService()
        
        # Create notifications for nearby veterinarians
        notifications_created = notification_service.create_disease_alert_notifications(
            disease_name=data.get('disease_name'),
            location=data.get('location'),
            cattle_id=data.get('cattle_id'),
            severity=data.get('severity', 'medium'),
            ai_prediction_data=data.get('ai_prediction_data', {})
        )
        
        return Response({
            'message': f'Created {notifications_created} disease alert notifications',
            'notifications_created': notifications_created
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )