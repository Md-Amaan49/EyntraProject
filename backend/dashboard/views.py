"""
Dashboard views for analytics and statistics.
"""
from datetime import datetime, timedelta
from django.db.models import Count, Avg, Sum, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    DashboardStats, HealthTrend, RegionalDiseaseMap, 
    CattleHealthMetrics, VeterinarianPerformanceMetrics
)
from .serializers import (
    DashboardStatsSerializer, HealthTrendSerializer,
    RegionalDiseaseMapSerializer, CattleHealthMetricsSerializer,
    VeterinarianPerformanceMetricsSerializer
)
from .services import DashboardAnalyticsService
from cattle.models import Cattle
from consultations.models import Consultation, DiseaseAlert
from health.models import SymptomEntry
from notifications.models import Notification


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_overview(request):
    """Get dashboard overview based on user role."""
    try:
        user = request.user
        analytics_service = DashboardAnalyticsService()
        
        if user.role == 'veterinarian':
            data = analytics_service.get_veterinarian_dashboard_data(user)
        else:  # cattle owner
            data = analytics_service.get_cattle_owner_dashboard_data(user)
        
        return Response(data)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cattle_owner_stats(request):
    """Get cattle owner specific dashboard statistics."""
    try:
        user = request.user
        
        if user.role != 'owner':
            return Response(
                {'error': 'Only cattle owners can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from cattle.models import Cattle
        
        # Get user's cattle
        cattle = Cattle.objects.filter(owner=user)
        
        # Calculate basic statistics
        total_cattle = cattle.count()
        healthy_cattle = cattle.filter(health_status='healthy').count()
        sick_cattle = cattle.filter(health_status='sick').count()
        under_treatment = cattle.filter(health_status='under_treatment').count()
        
        # Get recent health assessments
        recent_assessments = SymptomEntry.objects.filter(
            cattle__owner=user,
            created_at__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        # Get upcoming consultations
        upcoming_consultations = Consultation.objects.filter(
            cattle_owner=user,
            status='scheduled',
            scheduled_time__gte=timezone.now()
        ).count()
        
        # Get recent notifications
        unread_notifications = Notification.objects.filter(
            user=user,
            is_read=False
        ).count()
        
        data = {
            'cattle_statistics': {
                'total_cattle': total_cattle,
                'healthy_cattle': healthy_cattle,
                'sick_cattle': sick_cattle,
                'under_treatment': under_treatment,
                'health_percentage': (healthy_cattle / total_cattle * 100) if total_cattle > 0 else 0
            },
            'recent_activity': {
                'recent_assessments': recent_assessments,
                'upcoming_consultations': upcoming_consultations,
                'unread_notifications': unread_notifications
            },
            'quick_actions': [
                {'name': 'AI Disease Detection', 'url': '/health/ai-detection', 'icon': 'assessment'},
                {'name': 'Report Symptoms', 'url': '/health/submit', 'icon': 'local_hospital'},
                {'name': 'Find Veterinarians', 'url': '/veterinarians', 'icon': 'person_search'},
                {'name': 'My Consultations', 'url': '/consultations', 'icon': 'schedule'},
                {'name': 'Health Analytics', 'url': '/health/analytics', 'icon': 'trending_up'},
                {'name': 'Add Cattle', 'url': '/cattle/add', 'icon': 'add'}
            ]
        }
        
        return Response(data)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_veterinarian_stats(request):
    """Get veterinarian specific dashboard statistics."""
    try:
        user = request.user
        
        if user.role != 'veterinarian':
            return Response(
                {'error': 'Only veterinarians can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get veterinarian's consultations
        consultations = Consultation.objects.filter(veterinarian=user)
        
        # Calculate statistics
        total_consultations = consultations.count()
        completed_today = consultations.filter(
            status='completed',
            ended_at__date=timezone.now().date()
        ).count()
        
        pending_requests = consultations.filter(status='scheduled').count()
        
        # Get average rating
        completed_consultations = consultations.filter(
            status='completed',
            owner_rating__isnull=False
        )
        avg_rating = completed_consultations.aggregate(
            avg_rating=Avg('owner_rating')
        )['avg_rating'] or 0
        
        # Get response time (mock calculation)
        avg_response_time = 12  # minutes - would need actual calculation
        
        # Get regional disease alerts
        disease_alerts = DiseaseAlert.objects.filter(
            status='active',
            created_at__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        # Get emergency consultations
        emergency_consultations = consultations.filter(
            priority='emergency',
            created_at__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        data = {
            'performance_metrics': {
                'total_consultations': total_consultations,
                'completed_today': completed_today,
                'pending_requests': pending_requests,
                'average_rating': round(avg_rating, 1),
                'response_time_minutes': avg_response_time,
                'emergency_consultations': emergency_consultations
            },
            'regional_health': {
                'active_disease_alerts': disease_alerts,
                'regional_cases': 23,  # Mock data - would calculate from actual regional data
                'active_outbreaks': 1   # Mock data
            },
            'quick_actions': [
                {'name': 'My Schedule', 'url': '/consultations', 'icon': 'schedule'},
                {'name': 'Regional Map', 'url': '/regional-map', 'icon': 'map'},
                {'name': 'Performance', 'url': '/performance', 'icon': 'analytics'},
                {'name': 'My Patients', 'url': '/patients', 'icon': 'people'},
                {'name': 'Disease Alerts', 'url': '/alerts', 'icon': 'notification_important'},
                {'name': 'Health Trends', 'url': '/trends', 'icon': 'trending_up'}
            ]
        }
        
        return Response(data)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_health_trends(request):
    """Get health trend data for charts and analytics."""
    try:
        user = request.user
        days = int(request.GET.get('days', 30))
        trend_type = request.GET.get('trend_type', 'disease_occurrence')
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        trends = HealthTrend.objects.filter(
            user=user,
            trend_type=trend_type,
            date__range=[start_date, end_date]
        ).order_by('date')
        
        serializer = HealthTrendSerializer(trends, many=True)
        return Response({
            'trends': serializer.data,
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'days': days
            }
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cattle_health_analytics(request):
    """Get detailed cattle health analytics for cattle owners."""
    try:
        user = request.user
        
        if user.role != 'owner':
            return Response(
                {'error': 'Only cattle owners can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        cattle_id = request.GET.get('cattle_id')
        days = int(request.GET.get('days', 30))
        
        analytics_service = DashboardAnalyticsService()
        
        if cattle_id:
            # Get analytics for specific cattle
            try:
                cattle = Cattle.objects.get(id=cattle_id, owner=user)
                data = analytics_service.get_individual_cattle_analytics(cattle, days)
            except Cattle.DoesNotExist:
                return Response(
                    {'error': 'Cattle not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Get analytics for all user's cattle
            data = analytics_service.get_herd_analytics(user, days)
        
        return Response(data)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_regional_disease_map(request):
    """Get regional disease mapping for veterinarians."""
    try:
        user = request.user
        
        if user.role != 'veterinarian':
            return Response(
                {'error': 'Only veterinarians can access regional disease maps'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get veterinarian's service area
        vet_profile = user.veterinarian_profile
        state = request.GET.get('state', vet_profile.state)
        disease_name = request.GET.get('disease')
        
        # Filter regional disease data
        regional_data = RegionalDiseaseMap.objects.filter(state=state)
        
        if disease_name:
            regional_data = regional_data.filter(disease_name=disease_name)
        
        # Get recent data (last 30 days)
        recent_date = timezone.now() - timedelta(days=30)
        regional_data = regional_data.filter(last_updated__gte=recent_date)
        
        serializer = RegionalDiseaseMapSerializer(regional_data, many=True)
        
        return Response({
            'regional_data': serializer.data,
            'veterinarian_location': {
                'latitude': float(vet_profile.latitude) if vet_profile.latitude else None,
                'longitude': float(vet_profile.longitude) if vet_profile.longitude else None,
                'service_radius_km': vet_profile.service_radius_km,
                'state': vet_profile.state,
                'city': vet_profile.city
            }
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_veterinarian_performance(request):
    """Get veterinarian performance metrics."""
    try:
        user = request.user
        
        if user.role != 'veterinarian':
            return Response(
                {'error': 'Only veterinarians can access performance metrics'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        days = int(request.GET.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Get performance metrics
        performance_data = VeterinarianPerformanceMetrics.objects.filter(
            veterinarian=user,
            date__range=[start_date, end_date]
        ).order_by('date')
        
        serializer = VeterinarianPerformanceMetricsSerializer(performance_data, many=True)
        
        # Calculate summary statistics
        analytics_service = DashboardAnalyticsService()
        summary = analytics_service.get_veterinarian_performance_summary(user, days)
        
        return Response({
            'performance_data': serializer.data,
            'summary': summary,
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'days': days
            }
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_disease_outbreak_alerts(request):
    """Get disease outbreak alerts for the region."""
    try:
        user = request.user
        
        # Get recent disease alerts
        recent_alerts = DiseaseAlert.objects.filter(
            status='active',
            created_at__gte=timezone.now() - timedelta(days=7)
        ).order_by('-created_at')
        
        if user.role == 'veterinarian':
            # Filter by veterinarian's service area
            vet_profile = user.veterinarian_profile
            # This would need more sophisticated location filtering
            # For now, we'll return all recent alerts
            pass
        
        # Group alerts by disease and location
        outbreak_data = {}
        for alert in recent_alerts:
            disease = alert.disease_name
            if disease not in outbreak_data:
                outbreak_data[disease] = {
                    'disease_name': disease,
                    'total_cases': 0,
                    'locations': [],
                    'severity_levels': [],
                    'latest_alert': None
                }
            
            outbreak_data[disease]['total_cases'] += 1
            outbreak_data[disease]['severity_levels'].append(alert.severity)
            
            if not outbreak_data[disease]['latest_alert'] or alert.created_at > outbreak_data[disease]['latest_alert']:
                outbreak_data[disease]['latest_alert'] = alert.created_at
            
            # Add location if not already present
            location_key = f"{alert.location.get('city', 'Unknown')}, {alert.location.get('state', 'Unknown')}"
            if location_key not in outbreak_data[disease]['locations']:
                outbreak_data[disease]['locations'].append(location_key)
        
        # Convert to list and sort by case count
        outbreak_list = list(outbreak_data.values())
        outbreak_list.sort(key=lambda x: x['total_cases'], reverse=True)
        
        return Response({
            'outbreak_alerts': outbreak_list,
            'total_active_alerts': recent_alerts.count(),
            'last_updated': timezone.now()
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refresh_dashboard_data(request):
    """Refresh dashboard data by recalculating statistics."""
    try:
        user = request.user
        analytics_service = DashboardAnalyticsService()
        
        # Refresh data based on user role
        if user.role == 'veterinarian':
            analytics_service.update_veterinarian_stats(user)
        else:
            analytics_service.update_cattle_owner_stats(user)
        
        return Response({
            'message': 'Dashboard data refreshed successfully',
            'refreshed_at': timezone.now()
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notification_summary(request):
    """Get notification summary for dashboard."""
    try:
        user = request.user
        
        # Get recent notifications
        recent_notifications = Notification.objects.filter(
            user=user,
            created_at__gte=timezone.now() - timedelta(days=7)
        )
        
        # Count by type and priority
        notification_stats = {
            'total_recent': recent_notifications.count(),
            'unread_count': recent_notifications.filter(is_read=False).count(),
            'by_type': {},
            'by_priority': {},
            'recent_critical': []
        }
        
        # Count by type
        for notification_type, _ in Notification.TYPE_CHOICES:
            count = recent_notifications.filter(notification_type=notification_type).count()
            if count > 0:
                notification_stats['by_type'][notification_type] = count
        
        # Count by priority
        for priority, _ in Notification.PRIORITY_CHOICES:
            count = recent_notifications.filter(priority=priority).count()
            if count > 0:
                notification_stats['by_priority'][priority] = count
        
        # Get recent critical notifications
        critical_notifications = recent_notifications.filter(
            priority='critical',
            is_read=False
        ).order_by('-created_at')[:5]
        
        notification_stats['recent_critical'] = [
            {
                'id': str(notif.id),
                'title': notif.title,
                'message': notif.message[:100] + '...' if len(notif.message) > 100 else notif.message,
                'created_at': notif.created_at,
                'notification_type': notif.notification_type
            }
            for notif in critical_notifications
        ]
        
        return Response(notification_stats)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )