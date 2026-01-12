from django.urls import path
from . import views

urlpatterns = [
    path('', views.CattleListCreateView.as_view(), name='cattle-list-create'),
    path('<uuid:pk>/', views.CattleDetailView.as_view(), name='cattle-detail'),
    path('<uuid:cattle_id>/history/', views.cattle_history, name='cattle-history'),
    path('<uuid:cattle_id>/restore/', views.restore_cattle, name='cattle-restore'),
    path('<uuid:cattle_id>/image/', views.cattle_image_update, name='cattle-image-update'),
    path('archived/', views.archived_cattle, name='cattle-archived'),
    path('stats/', views.cattle_stats, name='cattle-stats'),
]
