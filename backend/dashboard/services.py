"""
Dashboard analytics service for generating statistics and insights.
"""
from datetime import datetime, timedelta
from django.db.models import Count, Avg, Sum, Q
from django.utils import timezone
from decimal import Decimal

from .models import (
    DashboardStats, HealthTrend, RegionalDiseaseMap,
    CattleHealthMetrics, VeterinarianPerformanceMetrics
)
from cattle.models import Cattle
from consultations.models import Consultation, DiseaseAlert, VeterinarianProfile
from health.models import SymptomEntry
from notifications.models import Notification


class DashboardAnalyticsService:
    """Service for dashboard analytics and statistics."""
    
    def get_cattle_owner_dashboard_data(self, user):
        """Get dashboard data for cattle owners."""
        
        # Get user's cattle
        cattle_queryset = Cattle.objects.filter(owner=user, is_archived=False)
        
        # Basic cattle statistics
        total_cattle = cattle_queryset.count()
        healthy_cattle = cattle_queryset.filter(health_status='healthy').count()
        sick_cattle = cattle_queryset.filter(health_status='sick').count()
        under_treatment = cattle_queryset.filter(health_status='under_treatment').count()
        
        # Recent health assessments (last 30 days)
        recent_date = timezone.now() - timedelta(days=30)
        recent_assessments = SymptomEntry.objects.filter(
            cattle__owner=user,
            created_at__gte=recent_date
        )
        
        # Recent consultations
        recent_consultations = Consultation.objects.filter(
            cattle_owner=user,
            created_at__gte=recent_date
        )
        
        # Health trends
        health_trends = self.calculate_health_trends(user, days=30)
        
        # Recent disease alerts in user's area
        recent_alerts = self.get_nearby_disease_alerts(user)
        
        # Upcoming consultations
        upcoming_consultations = Consultation.objects.filter(
            cattle_owner=user,
            status='scheduled',
            scheduled_time__gte=timezone.now()
        ).order_by('scheduled_time')[:5]
        
        # Notification summary
        unread_notifications = Notification.objects.filter(
            user=user,
            is_read=False
        ).count()
        
        return {
            'cattle_statistics': {
                'total_cattle': total_cattle,
                'healthy_cattle': healthy_cattle,
                'sick_cattle': sick_cattle,
                'under_treatment': under_treatment,
                'health_percentage': round((healthy_cattle / total_cattle * 100) if total_cattle > 0 else 0, 1)
            },
            'recent_activity': {
                'health_assessments': recent_assessments.count(),
                'consultations_completed': recent_consultations.filter(status='completed').count(),
                'consultations_scheduled': recent_consultations.filter(status='scheduled').count(),
                'ai_predictions': recent_assessments.aggregate(
                    total=Count('id')
                )['total'] or 0
            },
            'health_trends': health_trends,
            'alerts': {
                'nearby_disease_alerts': len(recent_alerts),
                'unread_notifications': unread_notifications,
                'recent_alerts': recent_alerts[:3]  # Top 3 recent alerts
            },
            'upcoming_consultations': [
                {
                    'id': str(consultation.id),
                    'type': consultation.consultation_type,
                    'scheduled_time': consultation.scheduled_time,
                    'veterinarian_name': consultation.veterinarian.name,
                    'cattle_id': consultation.cattle.identification_number,
                    'priority': consultation.priority
                }
                for consultation in upcoming_consultations
            ],
            'quick_actions': [
                {'action': 'report_symptoms', 'label': 'Report Symptoms', 'urgent': sick_cattle > 0},
                {'action': 'ai_assessment', 'label': 'AI Health Check', 'urgent': False},
                {'action': 'find_veterinarian', 'label': 'Find Veterinarian', 'urgent': sick_cattle > 0},
                {'action': 'view_health_history', 'label': 'Health History', 'urgent': False}
            ]
        }
    
    def get_veterinarian_dashboard_data(self, user):
        """Get dashboard data for veterinarians."""
        
        # Get veterinarian profile
        try:
            vet_profile = user.veterinarian_profile
        except:
            return {'error': 'Veterinarian profile not found'}
        
        # Recent consultations (last 30 days)
        recent_date = timezone.now() - timedelta(days=30)
        recent_consultations = Consultation.objects.filter(
            veterinarian=user,
            created_at__gte=recent_date
        )
        
        # Consultation statistics
        total_consultations = recent_consultations.count()
        completed_consultations = recent_consultations.filter(status='completed').count()
        scheduled_consultations = recent_consultations.filter(status='scheduled').count()
        emergency_consultations = recent_consultations.filter(priority='emergency').count()
        
        # Disease alerts in service area
        regional_alerts = self.get_regional_disease_alerts(vet_profile)
        
        # Performance metrics
        performance_metrics = self.calculate_veterinarian_performance(user, days=30)
        
        # Upcoming consultations
        upcoming_consultations = Consultation.objects.filter(
            veterinarian=user,
            status='scheduled',
            scheduled_time__gte=timezone.now()
        ).order_by('scheduled_time')[:5]
        
        # Recent disease patterns
        disease_patterns = self.analyze_regional_disease_patterns(vet_profile)
        
        # Notification summary
        unread_notifications = Notification.objects.filter(
            user=user,
            is_read=False
        ).count()
        
        return {
            'consultation_statistics': {
                'total_consultations': total_consultations,
                'completed_consultations': completed_consultations,
                'scheduled_consultations': scheduled_consultations,
                'emergency_consultations': emergency_consultations,
                'completion_rate': round((completed_consultations / total_consultations * 100) if total_consultations > 0 else 0, 1)
            },
            'regional_health': {
                'active_disease_alerts': len(regional_alerts),
                'disease_patterns': disease_patterns,
                'outbreak_risk_level': self.assess_outbreak_risk(regional_alerts)
            },
            'performance_metrics': performance_metrics,
            'alerts': {
                'unread_notifications': unread_notifications,
                'emergency_requests': emergency_consultations,
                'regional_alerts': regional_alerts[:3]  # Top 3 recent alerts
            },
            'upcoming_consultations': [
                {
                    'id': str(consultation.id),
                    'type': consultation.consultation_type,
                    'scheduled_time': consultation.scheduled_time,
                    'owner_name': consultation.cattle_owner.name,
                    'cattle_id': consultation.cattle.identification_number,
                    'priority': consultation.priority,
                    'case_description': consultation.case_description[:100] + '...' if len(consultation.case_description) > 100 else consultation.case_description
                }
                for consultation in upcoming_consultations
            ],
            'quick_actions': [
                {'action': 'view_alerts', 'label': 'Disease Alerts', 'urgent': len(regional_alerts) > 0},
                {'action': 'regional_map', 'label': 'Regional Disease Map', 'urgent': False},
                {'action': 'consultation_requests', 'label': 'Consultation Requests', 'urgent': emergency_consultations > 0},
                {'action': 'performance_report', 'label': 'Performance Report', 'urgent': False}
            ]
        }
    
    def calculate_health_trends(self, user, days=30):
        """Calculate health trends for cattle owner."""
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Get daily health assessment counts
        daily_assessments = []
        current_date = start_date
        
        while current_date <= end_date:
            assessments_count = SymptomEntry.objects.filter(
                cattle__owner=user,
                created_at__date=current_date
            ).count()
            
            daily_assessments.append({
                'date': current_date.isoformat(),
                'assessments': assessments_count
            })
            
            current_date += timedelta(days=1)
        
        # Get disease occurrence trends
        disease_trends = SymptomEntry.objects.filter(
            cattle__owner=user,
            created_at__gte=start_date
        ).values('cattle__health_status').annotate(
            count=Count('id')
        )
        
        return {
            'daily_assessments': daily_assessments,
            'disease_distribution': list(disease_trends),
            'period_days': days
        }
    
    def get_nearby_disease_alerts(self, user):
        """Get disease alerts near user's location."""
        
        # This would need user location data
        # For now, return recent alerts
        recent_alerts = DiseaseAlert.objects.filter(
            status='active',
            created_at__gte=timezone.now() - timedelta(days=7)
        ).order_by('-created_at')
        
        return [
            {
                'id': str(alert.id),
                'disease_name': alert.disease_name,
                'severity': alert.severity,
                'location': alert.location,
                'created_at': alert.created_at,
                'distance_km': None  # Would calculate based on user location
            }
            for alert in recent_alerts[:10]
        ]
    
    def get_regional_disease_alerts(self, vet_profile):
        """Get disease alerts in veterinarian's service area."""
        
        # Filter by state for now (would use geographic filtering in production)
        regional_alerts = DiseaseAlert.objects.filter(
            status='active',
            created_at__gte=timezone.now() - timedelta(days=14)
        ).order_by('-created_at')
        
        return [
            {
                'id': str(alert.id),
                'disease_name': alert.disease_name,
                'severity': alert.severity,
                'location': alert.location,
                'created_at': alert.created_at,
                'cattle_id': alert.cattle.identification_number,
                'distance_km': None  # Would calculate based on vet location
            }
            for alert in regional_alerts[:10]
        ]
    
    def calculate_veterinarian_performance(self, user, days=30):
        """Calculate veterinarian performance metrics."""
        
        recent_date = timezone.now() - timedelta(days=days)
        consultations = Consultation.objects.filter(
            veterinarian=user,
            created_at__gte=recent_date
        )
        
        completed_consultations = consultations.filter(status='completed')
        
        # Calculate average rating
        avg_rating = completed_consultations.aggregate(
            avg_rating=Avg('owner_rating')
        )['avg_rating'] or 0
        
        # Calculate response time (time from creation to start)
        response_times = []
        for consultation in completed_consultations:
            if consultation.started_at:
                response_time = (consultation.started_at - consultation.created_at).total_seconds() / 60
                response_times.append(response_time)
        
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # Calculate consultation duration
        durations = [c.duration_minutes for c in completed_consultations if c.duration_minutes]
        avg_duration = sum(durations) / len(durations) if durations else 0
        
        return {
            'total_consultations': consultations.count(),
            'completed_consultations': completed_consultations.count(),
            'average_rating': round(float(avg_rating), 2),
            'average_response_time_minutes': round(avg_response_time, 1),
            'average_consultation_duration': round(avg_duration, 1),
            'completion_rate': round((completed_consultations.count() / consultations.count() * 100) if consultations.count() > 0 else 0, 1)
        }
    
    def analyze_regional_disease_patterns(self, vet_profile):
        """Analyze disease patterns in veterinarian's region."""
        
        recent_alerts = DiseaseAlert.objects.filter(
            status='active',
            created_at__gte=timezone.now() - timedelta(days=30)
        )
        
        # Group by disease
        disease_counts = {}
        for alert in recent_alerts:
            disease = alert.disease_name
            if disease not in disease_counts:
                disease_counts[disease] = 0
            disease_counts[disease] += 1
        
        # Sort by frequency
        sorted_diseases = sorted(disease_counts.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {
                'disease_name': disease,
                'case_count': count,
                'trend': 'increasing' if count > 5 else 'stable'  # Simple trend logic
            }
            for disease, count in sorted_diseases[:5]
        ]
    
    def assess_outbreak_risk(self, regional_alerts):
        """Assess outbreak risk level based on recent alerts."""
        
        if len(regional_alerts) >= 10:
            return 'high'
        elif len(regional_alerts) >= 5:
            return 'medium'
        elif len(regional_alerts) >= 1:
            return 'low'
        else:
            return 'minimal'
    
    def get_individual_cattle_analytics(self, cattle, days=30):
        """Get detailed analytics for individual cattle."""
        
        recent_date = timezone.now() - timedelta(days=days)
        
        # Health assessments
        assessments = SymptomEntry.objects.filter(
            cattle=cattle,
            created_at__gte=recent_date
        ).order_by('-created_at')
        
        # Consultations
        consultations = Consultation.objects.filter(
            cattle=cattle,
            created_at__gte=recent_date
        ).order_by('-created_at')
        
        # Health timeline
        timeline_events = []
        
        for assessment in assessments:
            timeline_events.append({
                'date': assessment.created_at,
                'type': 'assessment',
                'description': f"Health assessment: {assessment.symptoms[:50]}...",
                'severity': assessment.severity
            })
        
        for consultation in consultations:
            timeline_events.append({
                'date': consultation.created_at,
                'type': 'consultation',
                'description': f"Consultation with Dr. {consultation.veterinarian.name}",
                'status': consultation.status
            })
        
        # Sort timeline by date
        timeline_events.sort(key=lambda x: x['date'], reverse=True)
        
        return {
            'cattle_info': {
                'id': str(cattle.id),
                'identification_number': cattle.identification_number,
                'breed': cattle.breed,
                'age': cattle.age,
                'health_status': cattle.health_status
            },
            'period_summary': {
                'total_assessments': assessments.count(),
                'total_consultations': consultations.count(),
                'health_changes': self.calculate_health_changes(cattle, days)
            },
            'timeline': timeline_events[:20],  # Last 20 events
            'health_score': self.calculate_health_score(cattle, days)
        }
    
    def get_herd_analytics(self, user, days=30):
        """Get analytics for user's entire herd."""
        
        cattle_queryset = Cattle.objects.filter(owner=user, is_archived=False)
        recent_date = timezone.now() - timedelta(days=days)
        
        # Herd health distribution
        health_distribution = cattle_queryset.values('health_status').annotate(
            count=Count('id')
        )
        
        # Recent activity across herd
        total_assessments = SymptomEntry.objects.filter(
            cattle__owner=user,
            created_at__gte=recent_date
        ).count()
        
        total_consultations = Consultation.objects.filter(
            cattle_owner=user,
            created_at__gte=recent_date
        ).count()
        
        # Cattle requiring attention
        cattle_needing_attention = cattle_queryset.filter(
            Q(health_status='sick') | Q(health_status='under_treatment')
        )
        
        return {
            'herd_summary': {
                'total_cattle': cattle_queryset.count(),
                'health_distribution': list(health_distribution),
                'cattle_needing_attention': cattle_needing_attention.count()
            },
            'recent_activity': {
                'total_assessments': total_assessments,
                'total_consultations': total_consultations,
                'period_days': days
            },
            'attention_required': [
                {
                    'id': str(cattle.id),
                    'identification_number': cattle.identification_number,
                    'breed': cattle.breed,
                    'health_status': cattle.health_status,
                    'last_assessment': self.get_last_assessment_date(cattle)
                }
                for cattle in cattle_needing_attention[:10]
            ]
        }
    
    def calculate_health_changes(self, cattle, days):
        """Calculate health status changes for cattle."""
        
        # This would track health status changes over time
        # For now, return a simple count
        recent_date = timezone.now() - timedelta(days=days)
        recent_assessments = SymptomEntry.objects.filter(
            cattle=cattle,
            created_at__gte=recent_date
        ).count()
        
        return {
            'assessments_count': recent_assessments,
            'trend': 'stable'  # Would calculate actual trend
        }
    
    def calculate_health_score(self, cattle, days):
        """Calculate overall health score for cattle."""
        
        # Simple health score calculation
        base_score = 100
        
        if cattle.health_status == 'sick':
            base_score -= 30
        elif cattle.health_status == 'under_treatment':
            base_score -= 15
        
        # Reduce score based on recent assessments
        recent_date = timezone.now() - timedelta(days=days)
        recent_assessments = SymptomEntry.objects.filter(
            cattle=cattle,
            created_at__gte=recent_date
        ).count()
        
        base_score -= min(recent_assessments * 5, 20)  # Max 20 point reduction
        
        return max(base_score, 0)
    
    def get_last_assessment_date(self, cattle):
        """Get the date of the last health assessment for cattle."""
        
        last_assessment = SymptomEntry.objects.filter(
            cattle=cattle
        ).order_by('-created_at').first()
        
        return last_assessment.created_at if last_assessment else None
    
    def update_cattle_owner_stats(self, user):
        """Update dashboard statistics for cattle owner."""
        
        today = timezone.now().date()
        
        # Get or create today's stats
        stats, created = DashboardStats.objects.get_or_create(
            user=user,
            stat_type='cattle_owner',
            date=today,
            defaults={}
        )
        
        # Update statistics
        cattle_queryset = Cattle.objects.filter(owner=user, is_archived=False)
        
        stats.total_cattle = cattle_queryset.count()
        stats.healthy_cattle = cattle_queryset.filter(health_status='healthy').count()
        stats.sick_cattle = cattle_queryset.filter(health_status='sick').count()
        stats.under_treatment_cattle = cattle_queryset.filter(health_status='under_treatment').count()
        
        # Health assessments today
        stats.total_health_assessments = SymptomEntry.objects.filter(
            cattle__owner=user,
            created_at__date=today
        ).count()
        
        # Consultations today
        consultations_today = Consultation.objects.filter(
            cattle_owner=user,
            created_at__date=today
        )
        
        stats.total_consultations = consultations_today.count()
        stats.completed_consultations = consultations_today.filter(status='completed').count()
        stats.cancelled_consultations = consultations_today.filter(status='cancelled').count()
        
        stats.save()
        
        return stats
    
    def update_veterinarian_stats(self, user):
        """Update dashboard statistics for veterinarian."""
        
        today = timezone.now().date()
        
        # Get or create today's stats
        stats, created = DashboardStats.objects.get_or_create(
            user=user,
            stat_type='veterinarian',
            date=today,
            defaults={}
        )
        
        # Update statistics
        consultations_today = Consultation.objects.filter(
            veterinarian=user,
            created_at__date=today
        )
        
        stats.total_consultations = consultations_today.count()
        stats.completed_consultations = consultations_today.filter(status='completed').count()
        stats.cancelled_consultations = consultations_today.filter(status='cancelled').count()
        stats.emergency_consultations = consultations_today.filter(priority='emergency').count()
        
        # Disease alerts received today
        stats.disease_alerts_received = Notification.objects.filter(
            user=user,
            notification_type='disease_alert',
            created_at__date=today
        ).count()
        
        # Calculate average response time
        completed_consultations = consultations_today.filter(status='completed')
        response_times = []
        
        for consultation in completed_consultations:
            if consultation.started_at:
                response_time = (consultation.started_at - consultation.created_at).total_seconds() / 60
                response_times.append(response_time)
        
        if response_times:
            stats.average_response_time_minutes = Decimal(str(sum(response_times) / len(response_times)))
        
        stats.save()
        
        return stats
    
    def get_veterinarian_performance_summary(self, user, days=30):
        """Get performance summary for veterinarian."""
        
        recent_date = timezone.now() - timedelta(days=days)
        consultations = Consultation.objects.filter(
            veterinarian=user,
            created_at__gte=recent_date
        )
        
        completed = consultations.filter(status='completed')
        
        return {
            'total_consultations': consultations.count(),
            'completion_rate': round((completed.count() / consultations.count() * 100) if consultations.count() > 0 else 0, 1),
            'average_rating': round(float(completed.aggregate(avg=Avg('owner_rating'))['avg'] or 0), 2),
            'emergency_cases': consultations.filter(priority='emergency').count(),
            'diseases_diagnosed': completed.exclude(diagnosis='').count(),
            'period_days': days
        }