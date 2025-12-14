"""
URL configuration for AI prediction service.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Health check
    path('health/', views.health_check, name='ai-health-check'),
    
    # Disease prediction
    path('predict/', views.predict_disease, name='ai-predict-disease'),
    
    # Disease information
    path('diseases/', views.list_diseases, name='ai-list-diseases'),
    path('diseases/<uuid:disease_id>/', views.get_disease_details, name='ai-disease-details'),
    
    # Model information
    path('model/info/', views.model_info, name='ai-model-info'),
    
    # Feedback
    path('feedback/', views.submit_feedback, name='ai-feedback'),
]