"""
Property-based tests for cattle profile management.

Feature: cattle-health-system
Validates: Requirements 1.1, 1.2, 1.3, 1.4
"""
import pytest
from hypothesis import given, strategies as st, settings, assume
from hypothesis.extra.django import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import bcrypt

from cattle.models import Cattle, CattleHistory

User = get_user_model()


# Custom strategies for generating test data
@st.composite
def cattle_data(draw):
    """Generate valid cattle profile data."""
    return {
        'breed': draw(st.text(min_size=2, max_size=50, alphabet=st.characters(whitelist_categories=('Ll', 'Lu', 'Zs')))),
        'age': draw(st.integers(min_value=0, max_value=25)),
        'identification_number': draw(st.text(
            min_size=5,
            max_size=20,
            alphabet=st.characters(whitelist_categories=('Lu', 'Nd'))
        )),
        'gender': draw(st.sampled_from(['male', 'female'])),
        'weight': draw(st.one_of(
            st.none(),
            st.decimals(min_value=50, max_value=1500, places=2, allow_nan=False, allow_infinity=False)
        )),
        'metadata': draw(st.one_of(
            st.just({}),
            st.dictionaries(
                st.text(min_size=1, max_size=20),
                st.text(min_size=1, max_size=50),
                max_size=5
            )
        )),
        'health_status': draw(st.sampled_from(['healthy', 'sick', 'under_treatment']))
    }


@st.composite
def user_data(draw):
    """Generate user data for testing."""
    email_prefix = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Ll', 'Nd')),
        min_size=5,
        max_size=15
    ))
    return {
        'email': f"{email_prefix}@test.com",
        'phone': f"+1{draw(st.integers(min_value=1000000000, max_value=9999999999))}",
        'name': draw(st.text(min_size=3, max_size=30, alphabet=st.characters(whitelist_categories=('Ll', 'Lu', 'Zs')))),
        'password': 'TestPass123',
        'role': 'owner'
    }


@pytest.mark.django_db
class TestCattleProfilePersistence(TestCase):
    """
    Property 1: Cattle profile persistence
    For any valid cattle profile with required fields (breed, age, identification number),
    creating the profile should result in all fields being retrievable from storage.
    
    Feature: cattle-health-system, Property 1: Cattle profile persistence
    Validates: Requirements 1.1
    """
    
    @given(user=user_data(), cattle=cattle_data())
    @settings(max_examples=100, deadline=None)
    def test_cattle_profile_persistence(self, user, cattle):
        """Test that all cattle profile fields persist correctly."""
        # Create user
        hashed_password = bcrypt.hashpw(user['password'].encode('utf-8'), bcrypt.gensalt())
        owner = User.objects.create(
            email=user['email'],
            phone=user['phone'],
            name=user['name'],
            role=user['role'],
            password=hashed_password.decode('utf-8')
        )
        
        # Create cattle profile via API
        client = APIClient()
        refresh = RefreshToken.for_user(owner)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        response = client.post('/api/cattle/', cattle, format='json')
        
        # Should return 201 Created
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.data}"
        
        # Retrieve cattle from database
        cattle_obj = Cattle.objects.get(identification_number=cattle['identification_number'])
        
        # Verify all fields are persisted correctly
        assert cattle_obj.breed == cattle['breed']
        assert cattle_obj.age == cattle['age']
        assert cattle_obj.identification_number == cattle['identification_number']
        assert cattle_obj.gender == cattle['gender']
        assert cattle_obj.health_status == cattle['health_status']
        assert cattle_obj.owner == owner
        assert cattle_obj.is_archived is False
        
        # Verify optional fields
        if cattle['weight'] is not None:
            assert float(cattle_obj.weight) == float(cattle['weight'])
        else:
            assert cattle_obj.weight is None
        
        assert cattle_obj.metadata == cattle['metadata']


@pytest.mark.django_db
class TestCattleListCompleteness(TestCase):
    """
    Property 2: User cattle list completeness
    For any user with N cattle profiles, retrieving their cattle list should
    return exactly N profiles with correct ownership.
    
    Feature: cattle-health-system, Property 2: User cattle list completeness
    Validates: Requirements 1.2
    """
    
    @given(
        user=user_data(),
        cattle_list=st.lists(cattle_data(), min_size=1, max_size=10, unique_by=lambda x: x['identification_number'])
    )
    @settings(max_examples=100, deadline=None)
    def test_cattle_list_completeness(self, user, cattle_list):
        """Test that cattle list returns exactly all user's cattle."""
        # Create user
        hashed_password = bcrypt.hashpw(user['password'].encode('utf-8'), bcrypt.gensalt())
        owner = User.objects.create(
            email=user['email'],
            phone=user['phone'],
            name=user['name'],
            role=user['role'],
            password=hashed_password.decode('utf-8')
        )
        
        # Create N cattle profiles
        created_cattle = []
        for cattle_data_item in cattle_list:
            cattle_obj = Cattle.objects.create(
                owner=owner,
                **cattle_data_item
            )
            created_cattle.append(cattle_obj)
        
        # Retrieve cattle list via API
        client = APIClient()
        refresh = RefreshToken.for_user(owner)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        response = client.get('/api/cattle/')
        
        # Should return 200 OK
        assert response.status_code == 200
        
        # Should return exactly N cattle
        assert len(response.data) == len(cattle_list)
        
        # All returned cattle should belong to the user
        returned_ids = {item['id'] for item in response.data}
        expected_ids = {str(c.id) for c in created_cattle}
        assert returned_ids == expected_ids


@pytest.mark.django_db
class TestUpdateHistoryPreservation(TestCase):
    """
    Property 3: Update preserves history
    For any cattle profile, updating any field should preserve the previous value
    in history while reflecting the new value in current state.
    
    Feature: cattle-health-system, Property 3: Update preserves history
    Validates: Requirements 1.3
    """
    
    @given(
        user=user_data(),
        initial_cattle=cattle_data(),
        new_age=st.integers(min_value=0, max_value=25)
    )
    @settings(max_examples=100, deadline=None)
    def test_update_preserves_history(self, user, initial_cattle, new_age):
        """Test that updates create history records."""
        # Ensure new age is different from initial
        assume(new_age != initial_cattle['age'])
        
        # Create user
        hashed_password = bcrypt.hashpw(user['password'].encode('utf-8'), bcrypt.gensalt())
        owner = User.objects.create(
            email=user['email'],
            phone=user['phone'],
            name=user['name'],
            role=user['role'],
            password=hashed_password.decode('utf-8')
        )
        
        # Create cattle profile
        cattle_obj = Cattle.objects.create(owner=owner, **initial_cattle)
        initial_age = cattle_obj.age
        
        # Update cattle via API
        client = APIClient()
        refresh = RefreshToken.for_user(owner)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        update_data = {'age': new_age}
        response = client.patch(f'/api/cattle/{cattle_obj.id}/', update_data, format='json')
        
        # Should return 200 OK
        assert response.status_code == 200
        
        # Refresh cattle from database
        cattle_obj.refresh_from_db()
        
        # Current state should reflect new value
        assert cattle_obj.age == new_age
        
        # History should preserve old value
        history = CattleHistory.objects.filter(cattle=cattle_obj, field_name='age')
        assert history.exists()
        
        history_record = history.first()
        assert history_record.old_value == str(initial_age)
        assert history_record.new_value == str(new_age)
        assert history_record.changed_by == owner


@pytest.mark.django_db
class TestSoftDeleteArchival(TestCase):
    """
    Property 4: Soft delete archival
    For any cattle profile, deleting it should set archived status to true
    without removing the record from the database.
    
    Feature: cattle-health-system, Property 4: Soft delete archival
    Validates: Requirements 1.4
    """
    
    @given(user=user_data(), cattle=cattle_data())
    @settings(max_examples=100, deadline=None)
    def test_soft_delete_archival(self, user, cattle):
        """Test that delete archives rather than permanently removes."""
        # Create user
        hashed_password = bcrypt.hashpw(user['password'].encode('utf-8'), bcrypt.gensalt())
        owner = User.objects.create(
            email=user['email'],
            phone=user['phone'],
            name=user['name'],
            role=user['role'],
            password=hashed_password.decode('utf-8')
        )
        
        # Create cattle profile
        cattle_obj = Cattle.objects.create(owner=owner, **cattle)
        cattle_id = cattle_obj.id
        
        # Delete cattle via API
        client = APIClient()
        refresh = RefreshToken.for_user(owner)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        response = client.delete(f'/api/cattle/{cattle_id}/')
        
        # Should return 200 OK (not 204 No Content, because we return a message)
        assert response.status_code == 200
        
        # Cattle should still exist in database
        assert Cattle.objects.filter(id=cattle_id).exists()
        
        # Cattle should be archived
        cattle_obj.refresh_from_db()
        assert cattle_obj.is_archived is True
        
        # Archived cattle should not appear in regular list
        response = client.get('/api/cattle/')
        assert response.status_code == 200
        returned_ids = {item['id'] for item in response.data}
        assert str(cattle_id) not in returned_ids
        
        # Archived cattle should appear in archived list
        response = client.get('/api/cattle/archived/')
        assert response.status_code == 200
        archived_ids = {item['id'] for item in response.data['cattle']}
        assert str(cattle_id) in archived_ids
