from django.urls import path
from . import views

urlpatterns = [
    # Notification Management
    path('', views.NotificationListView.as_view(), name='notification-list'),
    path('stats/', views.get_notification_stats, name='notification-stats'),
    path('<uuid:notification_id>/read/', views.mark_notification_as_read, name='mark-notification-read'),
    path('mark-all-read/', views.mark_all_notifications_as_read, name='mark-all-notifications-read'),
    path('<uuid:notification_id>/delete/', views.delete_notification, name='delete-notification'),
    
    # Notification Preferences
    path('preferences/', views.NotificationPreferencesView.as_view(), name='notification-preferences'),
    
    # Testing and Admin
    path('test/', views.send_test_notification, name='send-test-notification'),
    path('disease-alert/', views.create_disease_alert_notification, name='create-disease-alert-notification'),
]
