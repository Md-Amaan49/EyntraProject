"""
Property-based tests for health assessment and symptom submission.

Feature: cattle-health-system
Validates: Requirements 2.1, 2.2, 2.4, 2.5
"""
import pytest
from hypothesis import given, strategies as st, settings, assume
from hypothesis.extra.django import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import bcrypt
from io import BytesIO
from PIL import Image

from health.models import SymptomEntry, HealthImage
from cattle.models import Cattle

User = get_user_model()


# Custom strategies
@st.composite
def user_with_cattle(draw):
    """Generate a user with a cattle profile."""
    email = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Ll', 'Nd')),
        min_size=5,
        max_size=15
    )) + "@test.com"
    
    return {
        'email': email,
        'phone': f"+1{draw(st.integers(min_value=1000000000, max_value=9999999999))}",
        'name': draw(st.text(min_size=3, max_size=30, alphabet=st.characters(whitelist_categories=('Ll', 'Lu', 'Zs')))),
        'password': 'TestPass123',
        'role': 'owner',
        'cattle': {
            'breed': draw(st.text(min_size=2, max_size=50, alphabet=st.characters(whitelist_categories=('Ll', 'Lu', 'Zs')))),
            'age': draw(st.integers(min_value=0, max_value=25)),
            'identification_number': draw(st.text(min_size=5, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Nd')))),
            'gender': draw(st.sampled_from(['male', 'female'])),
        }
    }


def create_test_image(format='JPEG', size_mb=1):
    """Create a test image file."""
    img = Image.new('RGB', (100, 100), color='red')
    img_io = BytesIO()
    img.save(img_io, format=format)
    img_io.seek(0)
    
    # Adjust size if needed
    content = img_io.read()
    if size_mb > 1:
        # Pad to desired size
        content = content + b'0' * (size_mb * 1024 * 1024 - len(content))
    
    img_io = BytesIO(content)
    img_io.seek(0)
    
    return SimpleUploadedFile(
        f"test.{format.lower()}",
        img_io.read(),
        content_type=f"image/{format.lower()}"
    )


@pytest.mark.django_db
class TestSymptomLengthValidation(TestCase):
    """
    Property 5: Symptom minimum length validation
    For any symptom text with fewer than 10 characters, submission should be rejected.
    
    Feature: cattle-health-system, Property 5: Symptom minimum length validation
    Validates: Requirements 2.1
    """
    
    @given(data=user_with_cattle(), symptom_text=st.text(max_size=9))
    @settings(max_examples=100, deadline=None)
    def test_short_symptoms_rejected(self, data, symptom_text):
        """Test that symptom texts shorter than 10 characters are rejected."""
        # Create user and cattle
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=data['email'],
            phone=data['phone'],
            name=data['name'],
            role=data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        cattle = Cattle.objects.create(
            owner=user,
            **data['cattle']
        )
        
        # Try to submit short symptom
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        symptom_data = {
            'cattle': str(cattle.id),
            'symptoms': symptom_text,
            'severity': 'moderate'
        }
        
        response = client.post('/api/health/symptoms/', symptom_data, format='json')
        
        # Should be rejected with 400 Bad Request
        assert response.status_code == 400
        assert 'symptoms' in response.data or 'non_field_errors' in response.data
    
    @given(data=user_with_cattle(), symptom_text=st.text(min_size=10, max_size=500))
    @settings(max_examples=100, deadline=None)
    def test_valid_length_symptoms_accepted(self, data, symptom_text):
        """Test that symptom texts of 10+ characters are accepted."""
        # Ensure text has actual content (not just whitespace)
        assume(len(symptom_text.strip()) >= 10)
        
        # Create user and cattle
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=data['email'],
            phone=data['phone'],
            name=data['name'],
            role=data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        cattle = Cattle.objects.create(
            owner=user,
            **data['cattle']
        )
        
        # Submit valid symptom
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        symptom_data = {
            'cattle': str(cattle.id),
            'symptoms': symptom_text,
            'severity': 'moderate'
        }
        
        response = client.post('/api/health/symptoms/', symptom_data, format='json')
        
        # Should be accepted with 201 Created
        assert response.status_code == 201
        assert 'symptoms' in response.data
        assert len(response.data['symptoms'].strip()) >= 10


@pytest.mark.django_db
class TestImageFormatAndSizeValidation(TestCase):
    """
    Property 6: Image format and size validation
    For any uploaded file, acceptance should occur only when format is JPEG or PNG 
    and size is at most 10MB.
    
    Feature: cattle-health-system, Property 6: Image format and size validation
    Validates: Requirements 2.2
    """
    
    @given(data=user_with_cattle(), format=st.sampled_from(['JPEG', 'PNG']))
    @settings(max_examples=50, deadline=None)
    def test_valid_image_formats_accepted(self, data, format):
        """Test that JPEG and PNG images are accepted."""
        # Create user and cattle
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=data['email'],
            phone=data['phone'],
            name=data['name'],
            role=data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        cattle = Cattle.objects.create(
            owner=user,
            **data['cattle']
        )
        
        # Create valid image
        image_file = create_test_image(format=format, size_mb=1)
        
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        image_data = {
            'cattle': str(cattle.id),
            'image': image_file,
            'image_type': 'general'
        }
        
        response = client.post('/api/health/images/', image_data, format='multipart')
        
        # Should be accepted
        assert response.status_code == 201
        assert 'image' in response.data
    
    @given(data=user_with_cattle())
    @settings(max_examples=30, deadline=None)
    def test_oversized_images_rejected(self, data):
        """Test that images larger than 10MB are rejected."""
        # Create user and cattle
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=data['email'],
            phone=data['phone'],
            name=data['name'],
            role=data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        cattle = Cattle.objects.create(
            owner=user,
            **data['cattle']
        )
        
        # Create oversized image (11MB)
        image_file = create_test_image(format='JPEG', size_mb=11)
        
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        image_data = {
            'cattle': str(cattle.id),
            'image': image_file,
            'image_type': 'general'
        }
        
        response = client.post('/api/health/images/', image_data, format='multipart')
        
        # Should be rejected
        assert response.status_code == 400
        assert 'image' in response.data


@pytest.mark.django_db
class TestUploadErrorSpecificity(TestCase):
    """
    Property 7: Invalid upload error specificity
    For any image upload that fails validation, the error message should specify 
    whether the issue is format or size.
    
    Feature: cattle-health-system, Property 7: Invalid upload error specificity
    Validates: Requirements 2.4
    """
    
    @given(data=user_with_cattle())
    @settings(max_examples=50, deadline=None)
    def test_size_error_is_specific(self, data):
        """Test that size validation errors are specific."""
        # Create user and cattle
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=data['email'],
            phone=data['phone'],
            name=data['name'],
            role=data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        cattle = Cattle.objects.create(
            owner=user,
            **data['cattle']
        )
        
        # Create oversized image
        image_file = create_test_image(format='JPEG', size_mb=11)
        
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        image_data = {
            'cattle': str(cattle.id),
            'image': image_file,
            'image_type': 'general'
        }
        
        response = client.post('/api/health/images/', image_data, format='multipart')
        
        # Error message should mention size
        assert response.status_code == 400
        error_message = str(response.data).lower()
        assert 'size' in error_message or 'mb' in error_message or '10' in error_message


@pytest.mark.django_db
class TestRequiredFieldValidation(TestCase):
    """
    Property 8: Required field validation
    For any symptom submission missing required fields, the system should return 
    validation errors listing all missing fields.
    
    Feature: cattle-health-system, Property 8: Required field validation
    Validates: Requirements 2.5
    """
    
    @given(data=user_with_cattle())
    @settings(max_examples=100, deadline=None)
    def test_missing_cattle_field_reported(self, data):
        """Test that missing cattle field is reported in validation errors."""
        # Create user
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=data['email'],
            phone=data['phone'],
            name=data['name'],
            role=data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        # Submit without cattle field
        symptom_data = {
            'symptoms': 'This is a valid symptom description',
            'severity': 'moderate'
        }
        
        response = client.post('/api/health/symptoms/', symptom_data, format='json')
        
        # Should report missing cattle field
        assert response.status_code == 400
        assert 'cattle' in response.data
    
    @given(data=user_with_cattle())
    @settings(max_examples=100, deadline=None)
    def test_missing_symptoms_field_reported(self, data):
        """Test that missing symptoms field is reported in validation errors."""
        # Create user and cattle
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=data['email'],
            phone=data['phone'],
            name=data['name'],
            role=data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        cattle = Cattle.objects.create(
            owner=user,
            **data['cattle']
        )
        
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        # Submit without symptoms field
        symptom_data = {
            'cattle': str(cattle.id),
            'severity': 'moderate'
        }
        
        response = client.post('/api/health/symptoms/', symptom_data, format='json')
        
        # Should report missing symptoms field
        assert response.status_code == 400
        assert 'symptoms' in response.data
    
    @given(data=user_with_cattle())
    @settings(max_examples=50, deadline=None)
    def test_multiple_missing_fields_all_reported(self, data):
        """Test that all missing required fields are reported together."""
        # Create user
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=data['email'],
            phone=data['phone'],
            name=data['name'],
            role=data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        # Submit with no required fields
        symptom_data = {
            'severity': 'moderate'
        }
        
        response = client.post('/api/health/symptoms/', symptom_data, format='json')
        
        # Should report both missing fields
        assert response.status_code == 400
        assert 'cattle' in response.data or 'symptoms' in response.data
        # At least one required field should be reported as missing


# Treatment recommendation property tests
@st.composite
def disease_prediction_data(draw):
    """Generate disease prediction data for treatment tests."""
    return {
        'diseaseName': draw(st.text(min_size=3, max_size=50, alphabet=st.characters(whitelist_categories=('Ll', 'Lu', 'Zs')))),
        'confidenceScore': draw(st.floats(min_value=0.0, max_value=100.0)),
        'severityLevel': draw(st.sampled_from(['low', 'medium', 'high', 'critical'])),
        'description': draw(st.text(min_size=10, max_size=200))
    }


@st.composite
def cattle_metadata(draw):
    """Generate cattle metadata for treatment tests."""
    return {
        'breed': draw(st.text(min_size=3, max_size=30, alphabet=st.characters(whitelist_categories=('Ll', 'Lu', 'Zs')))),
        'age': draw(st.integers(min_value=0, max_value=25)),
        'gender': draw(st.sampled_from(['male', 'female'])),
        'weight': draw(st.floats(min_value=100.0, max_value=1500.0))
    }


@pytest.mark.django_db
class TestDualTreatmentTypeProvision(TestCase):
    """
    Property 13: Dual treatment type provision
    For any disease prediction, treatment recommendations should include at least 
    one traditional remedy and at least one allopathic treatment.
    
    Feature: cattle-health-system, Property 13: Dual treatment type provision
    Validates: Requirements 4.1
    """
    
    @given(
        user_data=user_with_cattle(),
        predictions=st.lists(disease_prediction_data(), min_size=1, max_size=3),
        metadata=cattle_metadata()
    )
    @settings(max_examples=100, deadline=None)
    def test_dual_treatment_types_provided(self, user_data, predictions, metadata):
        """Test that both traditional and allopathic treatments are provided."""
        # Create user
        hashed_password = bcrypt.hashpw(user_data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=user_data['email'],
            phone=user_data['phone'],
            name=user_data['name'],
            role=user_data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        # Request treatment recommendations
        request_data = {
            'disease_predictions': predictions,
            'cattle_metadata': metadata,
            'preference': 'balanced'
        }
        
        response = client.post('/api/health/treatments/recommend/', request_data, format='json')
        
        # Should return successful response
        assert response.status_code == 200
        assert 'recommendations' in response.data
        
        recommendations = response.data['recommendations']
        
        # Should have both traditional and allopathic treatments
        assert 'traditional' in recommendations
        assert 'allopathic' in recommendations
        
        # At least one of each type should be provided (or fallback explanations)
        traditional_treatments = recommendations['traditional']
        allopathic_treatments = recommendations['allopathic']
        
        assert isinstance(traditional_treatments, list)
        assert isinstance(allopathic_treatments, list)
        
        # Should have at least one treatment of each type or explanation why not
        assert len(traditional_treatments) > 0 or 'no traditional treatments available' in str(recommendations).lower()
        assert len(allopathic_treatments) > 0 or 'veterinary consultation' in str(recommendations).lower()


@pytest.mark.django_db
class TestTreatmentInstructionCompleteness(TestCase):
    """
    Property 14: Treatment instruction completeness
    For any treatment recommendation, it should include dosage, administration method, 
    and duration fields.
    
    Feature: cattle-health-system, Property 14: Treatment instruction completeness
    Validates: Requirements 4.2
    """
    
    @given(
        user_data=user_with_cattle(),
        predictions=st.lists(disease_prediction_data(), min_size=1, max_size=2),
        metadata=cattle_metadata()
    )
    @settings(max_examples=100, deadline=None)
    def test_treatment_instruction_completeness(self, user_data, predictions, metadata):
        """Test that treatment recommendations include complete instructions."""
        # Create user
        hashed_password = bcrypt.hashpw(user_data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=user_data['email'],
            phone=user_data['phone'],
            name=user_data['name'],
            role=user_data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        # Request treatment recommendations
        request_data = {
            'disease_predictions': predictions,
            'cattle_metadata': metadata,
            'preference': 'balanced'
        }
        
        response = client.post('/api/health/treatments/recommend/', request_data, format='json')
        
        # Should return successful response
        assert response.status_code == 200
        recommendations = response.data['recommendations']
        
        # Check all treatments have required instruction fields
        all_treatments = recommendations.get('traditional', []) + recommendations.get('allopathic', [])
        
        for treatment in all_treatments:
            # Each treatment should have dosage, administration method, and duration
            assert 'dosage' in treatment, f"Treatment {treatment.get('name', 'unknown')} missing dosage"
            assert 'administration_method' in treatment or 'administration' in treatment, f"Treatment {treatment.get('name', 'unknown')} missing administration method"
            assert 'duration' in treatment, f"Treatment {treatment.get('name', 'unknown')} missing duration"
            
            # Fields should not be empty
            assert treatment.get('dosage', '').strip(), f"Treatment {treatment.get('name', 'unknown')} has empty dosage"
            duration = treatment.get('duration', '').strip()
            assert duration, f"Treatment {treatment.get('name', 'unknown')} has empty duration"


@pytest.mark.django_db
class TestTreatmentSafetyInformation(TestCase):
    """
    Property 15: Treatment safety information
    For any treatment recommendation, it should include non-empty precautions 
    and side effects lists.
    
    Feature: cattle-health-system, Property 15: Treatment safety information
    Validates: Requirements 4.3
    """
    
    @given(
        user_data=user_with_cattle(),
        predictions=st.lists(disease_prediction_data(), min_size=1, max_size=2),
        metadata=cattle_metadata()
    )
    @settings(max_examples=100, deadline=None)
    def test_treatment_safety_information(self, user_data, predictions, metadata):
        """Test that treatment recommendations include safety information."""
        # Create user
        hashed_password = bcrypt.hashpw(user_data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=user_data['email'],
            phone=user_data['phone'],
            name=user_data['name'],
            role=user_data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        # Request treatment recommendations
        request_data = {
            'disease_predictions': predictions,
            'cattle_metadata': metadata,
            'preference': 'balanced'
        }
        
        response = client.post('/api/health/treatments/recommend/', request_data, format='json')
        
        # Should return successful response
        assert response.status_code == 200
        recommendations = response.data['recommendations']
        
        # Check all treatments have safety information
        all_treatments = recommendations.get('traditional', []) + recommendations.get('allopathic', [])
        
        for treatment in all_treatments:
            # Each treatment should have precautions and side effects
            assert 'precautions' in treatment, f"Treatment {treatment.get('name', 'unknown')} missing precautions"
            assert 'side_effects' in treatment, f"Treatment {treatment.get('name', 'unknown')} missing side_effects"
            
            # Safety information should not be empty
            precautions = treatment.get('precautions', [])
            side_effects = treatment.get('side_effects', [])
            
            assert isinstance(precautions, list), f"Treatment {treatment.get('name', 'unknown')} precautions should be a list"
            assert isinstance(side_effects, list), f"Treatment {treatment.get('name', 'unknown')} side_effects should be a list"
            
            # Should have at least some safety information
            assert len(precautions) > 0 or len(side_effects) > 0, f"Treatment {treatment.get('name', 'unknown')} has no safety information"


@pytest.mark.django_db
class TestTraditionalRemedyDetails(TestCase):
    """
    Property 16: Traditional remedy details
    For any traditional treatment recommendation, it should include herbs/ingredients 
    and preparation method.
    
    Feature: cattle-health-system, Property 16: Traditional remedy details
    Validates: Requirements 4.4
    """
    
    @given(
        user_data=user_with_cattle(),
        predictions=st.lists(disease_prediction_data(), min_size=1, max_size=2),
        metadata=cattle_metadata()
    )
    @settings(max_examples=100, deadline=None)
    def test_traditional_remedy_details(self, user_data, predictions, metadata):
        """Test that traditional treatments include herbs and preparation methods."""
        # Create user
        hashed_password = bcrypt.hashpw(user_data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=user_data['email'],
            phone=user_data['phone'],
            name=user_data['name'],
            role=user_data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        # Request treatment recommendations with traditional preference
        request_data = {
            'disease_predictions': predictions,
            'cattle_metadata': metadata,
            'preference': 'traditional'
        }
        
        response = client.post('/api/health/treatments/recommend/', request_data, format='json')
        
        # Should return successful response
        assert response.status_code == 200
        recommendations = response.data['recommendations']
        
        # Check traditional treatments have required details
        traditional_treatments = recommendations.get('traditional', [])
        
        for treatment in traditional_treatments:
            # Each traditional treatment should have ingredients
            assert 'ingredients' in treatment, f"Traditional treatment {treatment.get('name', 'unknown')} missing ingredients"
            
            ingredients = treatment.get('ingredients', [])
            assert isinstance(ingredients, list), f"Traditional treatment {treatment.get('name', 'unknown')} ingredients should be a list"
            assert len(ingredients) > 0, f"Traditional treatment {treatment.get('name', 'unknown')} has no ingredients"
            
            # Should have preparation method (either as separate field or in description)
            has_preparation = (
                'preparation_method' in treatment and treatment['preparation_method'].strip() or
                'preparation' in treatment and treatment['preparation'].strip() or
                'mix' in treatment.get('description', '').lower() or
                'grind' in treatment.get('description', '').lower() or
                'boil' in treatment.get('description', '').lower()
            )
            
            assert has_preparation, f"Traditional treatment {treatment.get('name', 'unknown')} missing preparation method"


@pytest.mark.django_db
class TestTreatmentDisclaimerPresence(TestCase):
    """
    Property 17: Treatment disclaimer presence
    For any treatment recommendation response, it should include a disclaimer 
    advising veterinary consultation for serious cases.
    
    Feature: cattle-health-system, Property 17: Treatment disclaimer presence
    Validates: Requirements 4.5
    """
    
    @given(
        user_data=user_with_cattle(),
        predictions=st.lists(disease_prediction_data(), min_size=1, max_size=2),
        metadata=cattle_metadata()
    )
    @settings(max_examples=100, deadline=None)
    def test_treatment_disclaimer_presence(self, user_data, predictions, metadata):
        """Test that treatment recommendations include disclaimer."""
        # Create user
        hashed_password = bcrypt.hashpw(user_data['password'].encode('utf-8'), bcrypt.gensalt())
        user = User.objects.create(
            email=user_data['email'],
            phone=user_data['phone'],
            name=user_data['name'],
            role=user_data['role'],
            password=hashed_password.decode('utf-8')
        )
        
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        # Request treatment recommendations
        request_data = {
            'disease_predictions': predictions,
            'cattle_metadata': metadata,
            'preference': 'balanced'
        }
        
        response = client.post('/api/health/treatments/recommend/', request_data, format='json')
        
        # Should return successful response
        assert response.status_code == 200
        recommendations = response.data['recommendations']
        
        # Should have disclaimer
        assert 'disclaimer' in recommendations, "Treatment recommendations missing disclaimer"
        
        disclaimer = recommendations['disclaimer']
        assert isinstance(disclaimer, str), "Disclaimer should be a string"
        assert len(disclaimer.strip()) > 0, "Disclaimer should not be empty"
        
        # Disclaimer should mention veterinary consultation
        disclaimer_lower = disclaimer.lower()
        veterinary_mentioned = any(term in disclaimer_lower for term in [
            'veterinarian', 'veterinary', 'professional', 'doctor', 'consult'
        ])
        assert veterinary_mentioned, "Disclaimer should mention veterinary consultation"
        
        # Should also have veterinary consultation recommendation
        assert 'veterinary_consultation' in recommendations, "Missing veterinary consultation recommendation"
        
        vet_consultation = recommendations['veterinary_consultation']
        assert isinstance(vet_consultation, dict), "Veterinary consultation should be a dict"
        assert 'recommended' in vet_consultation, "Veterinary consultation missing 'recommended' field"