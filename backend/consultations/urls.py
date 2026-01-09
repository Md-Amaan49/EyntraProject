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
]
