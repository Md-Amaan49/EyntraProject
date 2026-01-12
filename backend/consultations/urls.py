from django.urls import path
from . import views

urlpatterns = [
    # Veterinarian Management
    path('veterinarians/', views.list_veterinarians, name='list-veterinarians'),
    path('veterinarians/register/', views.register_veterinarian, name='register-veterinarian'),
    path('veterinarians/nearby/', views.find_nearby_veterinarians, name='find-nearby-vets'),
    path('veterinarians/notifications/', views.get_veterinarian_notifications, name='vet-notifications'),
    path('veterinarians/notifications/<uuid:notification_id>/acknowledge/', 
         views.acknowledge_notification, name='acknowledge-notification'),
    
    # Consultation Management
    path('book/', views.book_consultation, name='book-consultation'),
    path('', views.ConsultationListView.as_view(), name='consultation-list'),
    path('<uuid:pk>/', views.ConsultationDetailView.as_view(), name='consultation-detail'),
    path('<uuid:consultation_id>/start/', views.start_consultation, name='start-consultation'),
    path('<uuid:consultation_id>/end/', views.end_consultation, name='end-consultation'),
    
    # Disease Alerts
    path('alerts/create/', views.create_disease_alert, name='create-disease-alert'),
    
    # Symptom Reporting and Veterinary Notification
    path('symptoms/report/', views.submit_symptom_report, name='submit-symptom-report'),
    path('requests/', views.get_consultation_requests, name='get-consultation-requests'),
    path('requests/<uuid:request_id>/respond/', views.respond_to_consultation_request, name='respond-consultation-request'),
    
    # Patient Management
    path('patients/', views.get_my_patients, name='get-my-patients'),
    path('patients/<uuid:patient_id>/', views.get_patient_detail, name='get-patient-detail'),
    path('patients/<uuid:patient_id>/notes/', views.add_patient_note, name='add-patient-note'),
    path('patients/<uuid:patient_id>/complete/', views.mark_patient_completed, name='mark-patient-completed'),
    
    # Dashboard Statistics
    path('dashboard/stats/', views.get_dashboard_stats, name='get-dashboard-stats'),
    
    # Additional utility endpoints
    path('requests/<uuid:request_id>/expire/', views.expire_consultation_request, name='expire-consultation-request'),
    path('patients/<uuid:patient_id>/follow-up/', views.schedule_follow_up, name='schedule-follow-up'),
    path('notifications/mark-read/', views.mark_notifications_read, name='mark-notifications-read'),
]
