"""
Property-based tests for user authentication.

Feature: cattle-health-system, Property: Authentication token validity
Validates: Requirements 1.1
"""
import pytest
from hypothesis import given, strategies as st, settings, assume
from hypothesis.extra.django import TestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework.test import APIClient
import bcrypt

User = get_user_model()


# Custom strategies for generating test data
@st.composite
def valid_email(draw):
    """Generate valid email addresses."""
    username = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Ll', 'Nd')),
        min_size=3,
        max_size=20
    ))
    domain = draw(st.sampled_from(['example.com', 'test.com', 'mail.com']))
    return f"{username}@{domain}"


@st.composite
def valid_phone(draw):
    """Generate valid phone numbers."""
    country_code = draw(st.sampled_from(['+1', '+44', '+91']))
    number = draw(st.integers(min_value=1000000000, max_value=9999999999))
    return f"{country_code}{number}"


@st.composite
def valid_password(draw):
    """Generate valid passwords (min 8 chars, with letters and numbers)."""
    length = draw(st.integers(min_value=8, max_value=20))
    password = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Ll', 'Lu', 'Nd')),
        min_size=length,
        max_size=length
    ))
    # Ensure it has at least one letter and one number
    assume(any(c.isalpha() for c in password))
    assume(any(c.isdigit() for c in password))
    return password


@st.composite
def user_data(draw):
    """Generate complete user registration data."""
    return {
        'email': draw(valid_email()),
        'phone': draw(valid_phone()),
        'name': draw(st.text(min_size=2, max_size=50, alphabet=st.characters(whitelist_categories=('Ll', 'Lu', 'Zs')))),
        'password': draw(valid_password()),
        'role': draw(st.sampled_from(['owner', 'veterinarian']))
    }


@pytest.mark.django_db
class TestAuthenticationProperties(TestCase):
    """Property-based tests for authentication system."""
    
    @given(data=user_data())
    @settings(max_examples=100, deadline=None)
    def test_user_registration_creates_valid_user(self, data):
        """
        Property: For any valid user data, registration should create a user
        with all fields correctly stored and password properly hashed.
        
        Feature: cattle-health-system, Property: Authentication token validity
        Validates: Requirements 1.1
        """
        client = APIClient()
        
        # Add password confirmation
        registration_data = data.copy()
        registration_data['password_confirm'] = data['password']
        
        # Register user
        response = client.post('/api/users/register/', registration_data, format='json')
        
        # Should return 201 Created
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.data}"
        
        # User should be created in database
        user = User.objects.get(email=data['email'])
        assert user is not None
        assert user.email == data['email']
        assert user.phone == data['phone']
        assert user.name == data['name']
        assert user.role == data['role']
        assert user.is_active is True
        
        # Password should be hashed with bcrypt
        assert user.password != data['password']
        assert bcrypt.checkpw(data['password'].encode('utf-8'), user.password.encode('utf-8'))
        
        # Response should include tokens
        assert 'tokens' in response.data
        assert 'access' in response.data['tokens']
        assert 'refresh' in response.data['tokens']
        
        # Tokens should be valid
        access_token = response.data['tokens']['access']
        refresh_token = response.data['tokens']['refresh']
        
        # Verify access token
        token = AccessToken(access_token)
        assert str(token['user_id']) == str(user.id)
        
        # Verify refresh token
        refresh = RefreshToken(refresh_token)
        assert str(refresh['user_id']) == str(user.id)
    
    @given(data=user_data())
    @settings(max_examples=100, deadline=None)
    def test_login_with_correct_credentials_returns_tokens(self, data):
        """
        Property: For any registered user, logging in with correct credentials
        should return valid JWT tokens.
        
        Feature: cattle-health-system, Property: Authentication token validity
        Validates: Requirements 1.1
        """
        # Create user directly
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=data['email'],
            phone=data['phone'],
            name=data['name'],
            role=data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        client = APIClient()
        
        # Login with correct credentials
        login_data = {
            'email': data['email'],
            'password': data['password']
        }
        response = client.post('/api/users/login/', login_data, format='json')
        
        # Should return 200 OK
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.data}"
        
        # Response should include tokens
        assert 'tokens' in response.data
        assert 'access' in response.data['tokens']
        assert 'refresh' in response.data['tokens']
        
        # Tokens should be valid and contain correct user_id
        access_token = response.data['tokens']['access']
        token = AccessToken(access_token)
        assert str(token['user_id']) == str(user.id)
    
    @given(data=user_data(), wrong_password=valid_password())
    @settings(max_examples=100, deadline=None)
    def test_login_with_wrong_password_fails(self, data, wrong_password):
        """
        Property: For any registered user, logging in with incorrect password
        should fail with 401 Unauthorized.
        
        Feature: cattle-health-system, Property: Authentication token validity
        Validates: Requirements 1.1
        """
        # Ensure wrong password is different from correct password
        assume(wrong_password != data['password'])
        
        # Create user
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        User.objects.create(
            email=data['email'],
            phone=data['phone'],
            name=data['name'],
            role=data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        client = APIClient()
        
        # Login with wrong password
        login_data = {
            'email': data['email'],
            'password': wrong_password
        }
        response = client.post('/api/users/login/', login_data, format='json')
        
        # Should return 401 Unauthorized
        assert response.status_code == 401
        assert 'error' in response.data
    
    @given(data=user_data())
    @settings(max_examples=100, deadline=None)
    def test_authenticated_requests_with_valid_token_succeed(self, data):
        """
        Property: For any user with a valid access token, authenticated requests
        should succeed.
        
        Feature: cattle-health-system, Property: Authentication token validity
        Validates: Requirements 1.1
        """
        # Create user
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=data['email'],
            phone=data['phone'],
            name=data['name'],
            role=data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        # Generate token
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Make authenticated request to profile endpoint
        response = client.get('/api/users/profile/')
        
        # Should return 200 OK
        assert response.status_code == 200
        assert response.data['email'] == user.email
        assert response.data['name'] == user.name
    
    @given(data=user_data())
    @settings(max_examples=50, deadline=None)
    def test_refresh_token_generates_new_access_token(self, data):
        """
        Property: For any user with a valid refresh token, requesting a new
        access token should succeed and return a valid token.
        
        Feature: cattle-health-system, Property: Authentication token validity
        Validates: Requirements 1.1
        """
        # Create user
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=data['email'],
            phone=data['phone'],
            name=data['name'],
            role=data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        refresh_token = str(refresh)
        
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        # Request new access token
        response = client.post('/api/users/refresh/', {'refresh': refresh_token}, format='json')
        
        # Should return 200 OK with new access token
        assert response.status_code == 200
        assert 'access' in response.data
        
        # New access token should be valid
        new_access_token = response.data['access']
        token = AccessToken(new_access_token)
        assert str(token['user_id']) == str(user.id)
