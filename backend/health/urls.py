from django.urls import path
from . import views

urlpatterns = [
    path('symptoms/', views.SymptomEntryListCreateView.as_view(), name='symptom-list-create'),
    path('symptoms/<uuid:pk>/', views.SymptomEntryDetailView.as_view(), name='symptom-detail'),
    path('submit/', views.submit_symptoms_with_images, name='submit-symptoms-images'),
    path('images/', views.upload_health_image, name='upload-image'),
    path('images/list/', views.health_images_list, name='images-list'),
    path('cattle/<uuid:cattle_id>/history/', views.cattle_health_history, name='cattle-health-history'),
    
    # Treatment recommendation endpoints
    path('treatments/recommend/', views.get_treatment_recommendations, name='treatment-recommendations'),
    path('cattle/<uuid:cattle_id>/treatments/', views.get_cattle_specific_treatments, name='cattle-treatments'),
]
