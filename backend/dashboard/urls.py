from django.urls import path
from . import views

urlpatterns = [
    # Dashboard Overview
    path('overview/', views.get_dashboard_overview, name='dashboard-overview'),
    
    # Role-specific dashboards
    path('cattle-owner-stats/', views.get_cattle_owner_stats, name='cattle-owner-stats'),
    path('veterinarian-stats/', views.get_veterinarian_stats, name='veterinarian-stats'),
    
    # Health Analytics
    path('health-trends/', views.get_health_trends, name='health-trends'),
    path('cattle-analytics/', views.get_cattle_health_analytics, name='cattle-analytics'),
    
    # Regional Analytics (for veterinarians)
    path('regional-disease-map/', views.get_regional_disease_map, name='regional-disease-map'),
    path('veterinarian-performance/', views.get_veterinarian_performance, name='veterinarian-performance'),
    
    # Alerts and Notifications
    path('outbreak-alerts/', views.get_disease_outbreak_alerts, name='outbreak-alerts'),
    path('notification-summary/', views.get_notification_summary, name='notification-summary'),
    
    # Data Management
    path('refresh/', views.refresh_dashboard_data, name='refresh-dashboard-data'),
]