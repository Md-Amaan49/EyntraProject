from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register_user, name='register'),
    path('login/', views.login_user, name='login'),
    path('logout/', views.logout_user, name='logout'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('change-password/', views.change_password, name='change-password'),
    path('refresh/', views.refresh_token, name='refresh-token'),
    path('nearby-veterinarians/', views.nearby_veterinarians, name='nearby-veterinarians'),
]
