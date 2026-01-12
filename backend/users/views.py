"""
Views for user authentication and management.
"""
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
import bcrypt

from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
    UserUpdateSerializer,
    PasswordChangeSerializer,
    NearbyVeterinarianSerializer
)

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user.
    
    POST /api/users/register
    {
        "email": "user@example.com",
        "phone": "+1234567890",
        "name": "John Doe",
        "role": "owner",
        "password": "securepassword123",
        "password_confirm": "securepassword123"
    }
    """
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """
    Login user and return JWT tokens.
    
    POST /api/users/login
    {
        "email": "user@example.com",
        "password": "securepassword123"
    }
    """
    serializer = UserLoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data['email']
    password = serializer.validated_data['password']
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Check if user is active
    if not user.is_active:
        return Response({
            'error': 'User account is disabled'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Verify password with bcrypt
    if not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'message': 'Login successful',
        'user': UserSerializer(user).data,
        'tokens': {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """
    Logout user by blacklisting the refresh token.
    
    POST /api/users/logout
    {
        "refresh": "refresh_token_here"
    }
    """
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({
                'error': 'Refresh token is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        token = RefreshToken(refresh_token)
        token.blacklist()
        
        return Response({
            'message': 'Logout successful'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': 'Invalid token'
        }, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get or update user profile.
    
    GET /api/users/profile
    PUT /api/users/profile
    """
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'PUT':
            return UserUpdateSerializer
        return UserSerializer
    
    def get_object(self):
        return self.request.user


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Change user password.
    
    POST /api/users/change-password
    {
        "old_password": "oldpassword123",
        "new_password": "newpassword123",
        "new_password_confirm": "newpassword123"
    }
    """
    serializer = PasswordChangeSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        user = request.user
        new_password = serializer.validated_data['new_password']
        
        # Hash new password with bcrypt
        hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        user.password = hashed.decode('utf-8')
        user.save()
        
        return Response({
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refresh_token(request):
    """
    Refresh access token using refresh token.
    
    POST /api/users/refresh
    {
        "refresh": "refresh_token_here"
    }
    """
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({
                'error': 'Refresh token is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        refresh = RefreshToken(refresh_token)
        
        return Response({
            'access': str(refresh.access_token)
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': 'Invalid or expired refresh token'
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nearby_veterinarians(request):
    """
    Get nearby veterinarians based on user's location.
    
    GET /api/users/nearby-veterinarians
    """
    user = request.user
    
    if user.role != 'owner':
        return Response({
            'error': 'Only cattle owners can search for veterinarians'
        }, status=status.HTTP_403_FORBIDDEN)
    
    if not user.state:
        return Response({
            'error': 'Please update your location in profile to find nearby veterinarians'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get nearby veterinarians
    veterinarians = user.get_nearby_veterinarians()
    
    # Serialize the data
    serializer = NearbyVeterinarianSerializer(veterinarians, many=True)
    
    return Response({
        'message': f'Found {veterinarians.count()} veterinarians near your location',
        'user_location': user.location_display,
        'veterinarians': serializer.data
    }, status=status.HTTP_200_OK)
