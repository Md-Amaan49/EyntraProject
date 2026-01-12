"""
Tests for consultation and symptom notification models and views.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from .models import (
    VeterinarianProfile, SymptomReport, ConsultationRequest,
    VeterinarianResponse, VeterinarianPatient, VeterinarianDashboardStats
)
from cattle.models import Cattle
from health.models import SymptomEntry

User = get_user_model()


class SymptomNotificationModelTests(TestCase):
    """Test cases for symptom notification models."""
    
    def setUp(self):
        """Set up test data."""
        # Create users
        self.cattle_owner = User.objects.create_user(
            email='owner@test.com',
            phone='+1234567890',
            name='Test Owner',
            role='cattle_owner'
        )
        
        self.veterinarian = User.objects.create_user(
            email='vet@test.com',
            phone='+1234567891',
            name='Test Vet',
            role='veterinarian'
        )
        
        # Create veterinarian profile
        self.vet_profile = VeterinarianProfile.objects.create(
            user=self.veterinarian,
            license_number='VET123',
            vet_type='private',
            specializations=['general'],
            years_experience=5,
            address='Test Address',
            city='Test City',
            state='Test State',
            pincode='123456',
            latitude=Decimal('12.9716'),
            longitude=Decimal('77.5946'),
            qualification='BVSc',
            is_verified=True
        )
        
        # Create cattle
        self.cattle = Cattle.objects.create(
            owner=self.cattle_owner,
            identification_number='CATTLE001',
            breed='Holstein',
            age=2,  # Changed from '2 years' to 2
            gender='female',
            weight=Decimal('400.00')
        )
    
    def test_symptom_report_creation(self):
        """Test creating a symptom report."""
        symptom_report = SymptomReport.objects.create(
            cattle=self.cattle,
            cattle_owner=self.cattle_owner,
            symptoms='Fever and loss of appetite',
            severity='moderate',
            is_emergency=False,
            location={
                'latitude': 12.9716,
                'longitude': 77.5946,
                'address': 'Test Location'
            }
        )
        
        self.assertEqual(symptom_report.cattle, self.cattle)
        self.assertEqual(symptom_report.cattle_owner, self.cattle_owner)
        self.assertEqual(symptom_report.status, 'submitted')
        self.assertFalse(symptom_report.is_emergency)
    
    def test_consultation_request_creation(self):
        """Test creating a consultation request."""
        symptom_report = SymptomReport.objects.create(
            cattle=self.cattle,
            cattle_owner=self.cattle_owner,
            symptoms='Fever and loss of appetite',
            severity='severe',
            is_emergency=True,
            location={
                'latitude': 12.9716,
                'longitude': 77.5946,
                'address': 'Test Location'
            }
        )
        
        consultation_request = ConsultationRequest.objects.create(
            symptom_report=symptom_report,
            cattle=self.cattle,
            cattle_owner=self.cattle_owner,
            priority='emergency',
            expires_at=timezone.now() + timedelta(hours=2)
        )
        
        self.assertEqual(consultation_request.symptom_report, symptom_report)
        self.assertEqual(consultation_request.priority, 'emergency')
        self.assertEqual(consultation_request.status, 'pending')
        self.assertFalse(consultation_request.is_expired())
    
    def test_consultation_request_acceptance(self):
        """Test veterinarian accepting a consultation request."""
        symptom_report = SymptomReport.objects.create(
            cattle=self.cattle,
            cattle_owner=self.cattle_owner,
            symptoms='Fever and loss of appetite',
            severity='moderate',
            location={
                'latitude': 12.9716,
                'longitude': 77.5946,
                'address': 'Test Location'
            }
        )
        
        consultation_request = ConsultationRequest.objects.create(
            symptom_report=symptom_report,
            cattle=self.cattle,
            cattle_owner=self.cattle_owner,
            priority='normal',
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        # Accept the request
        success = consultation_request.accept_by_veterinarian(self.veterinarian)
        
        self.assertTrue(success)
        self.assertEqual(consultation_request.status, 'accepted')
        self.assertEqual(consultation_request.assigned_veterinarian, self.veterinarian)
        self.assertIsNotNone(consultation_request.accepted_at)
    
    def test_veterinarian_patient_creation(self):
        """Test creating a veterinarian patient record."""
        patient = VeterinarianPatient.objects.create(
            veterinarian=self.veterinarian,
            cattle=self.cattle,
            cattle_owner=self.cattle_owner,
            treatment_plan='Monitor temperature and provide supportive care'
        )
        
        self.assertEqual(patient.veterinarian, self.veterinarian)
        self.assertEqual(patient.cattle, self.cattle)
        self.assertEqual(patient.status, 'active')
        self.assertIsNotNone(patient.added_at)
    
    def test_veterinarian_response_creation(self):
        """Test creating a veterinarian response."""
        symptom_report = SymptomReport.objects.create(
            cattle=self.cattle,
            cattle_owner=self.cattle_owner,
            symptoms='Fever and loss of appetite',
            severity='moderate',
            location={
                'latitude': 12.9716,
                'longitude': 77.5946,
                'address': 'Test Location'
            }
        )
        
        consultation_request = ConsultationRequest.objects.create(
            symptom_report=symptom_report,
            cattle=self.cattle,
            cattle_owner=self.cattle_owner,
            priority='normal',
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        response = VeterinarianResponse.objects.create(
            veterinarian=self.veterinarian,
            consultation_request=consultation_request,
            action='accept',
            message='I can help with this case',
            response_time=300  # 5 minutes
        )
        
        self.assertEqual(response.veterinarian, self.veterinarian)
        self.assertEqual(response.consultation_request, consultation_request)
        self.assertEqual(response.action, 'accept')
        self.assertEqual(response.response_time, 300)
    
    def test_dashboard_stats_creation(self):
        """Test creating dashboard statistics."""
        stats = VeterinarianDashboardStats.objects.create(
            veterinarian=self.veterinarian,
            period_start=timezone.now() - timedelta(days=30),
            period_end=timezone.now(),
            pending_requests=5,
            total_consultations=25,
            active_patients=10,
            emergency_responses=3,
            average_response_time=Decimal('15.5'),
            patient_satisfaction_rating=Decimal('4.5'),
            total_earnings=Decimal('5000.00'),
            consultation_fees=Decimal('4500.00'),
            emergency_fees=Decimal('500.00')
        )
        
        self.assertEqual(stats.veterinarian, self.veterinarian)
        self.assertEqual(stats.pending_requests, 5)
        self.assertEqual(stats.total_consultations, 25)
        self.assertEqual(stats.patient_satisfaction_rating, Decimal('4.5'))