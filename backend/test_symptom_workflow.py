#!/usr/bin/env python
"""
Test script for symptom notification workflow.
"""
import os
import sys
import django
from django.conf import settings

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cattle_health.settings')
django.setup()

from django.contrib.auth import get_user_model
from consultations.models import (
    SymptomReport, ConsultationRequest, VeterinarianProfile,
    VeterinarianNotificationRequest, VeterinarianPatient
)
from cattle.models import Cattle
from decimal import Decimal

User = get_user_model()

def test_symptom_workflow():
    """Test the complete symptom notification workflow."""
    
    print("Testing Symptom Notification Workflow...")
    
    # Check if we have test data
    cattle_owners = User.objects.filter(role='owner')  # Updated to use 'owner' role
    veterinarians = User.objects.filter(role='veterinarian')
    cattle = Cattle.objects.all()
    
    print(f"Found {cattle_owners.count()} cattle owners")
    print(f"Found {veterinarians.count()} veterinarians")
    print(f"Found {cattle.count()} cattle")
    
    if not cattle_owners.exists() or not veterinarians.exists() or not cattle.exists():
        print("❌ Insufficient test data. Please run create_test_users.py first.")
        return False
    
    # Test 1: Create a symptom report
    print("\n1. Testing symptom report creation...")
    
    test_cattle = cattle.first()
    test_owner = test_cattle.owner
    
    symptom_report = SymptomReport.objects.create(
        cattle=test_cattle,
        cattle_owner=test_owner,
        symptoms="Cattle showing signs of lethargy and loss of appetite",
        severity='moderate',
        is_emergency=False,
        ai_predictions=[
            {
                'disease': 'Foot and Mouth Disease',
                'confidence': 0.75,
                'symptoms_matched': ['lethargy', 'loss_of_appetite']
            }
        ],
        location={
            'latitude': 12.9716,
            'longitude': 77.5946,
            'address': 'Bangalore, Karnataka, India'
        }
    )
    
    print(f"✅ Created symptom report: {symptom_report.id}")
    
    # Test 2: Create consultation request
    print("\n2. Testing consultation request creation...")
    
    from datetime import timedelta
    from django.utils import timezone
    
    consultation_request = ConsultationRequest.objects.create(
        symptom_report=symptom_report,
        cattle=test_cattle,
        cattle_owner=test_owner,
        priority='normal',
        expires_at=timezone.now() + timedelta(hours=24)
    )
    
    print(f"✅ Created consultation request: {consultation_request.id}")
    
    # Test 3: Create veterinarian notifications
    print("\n3. Testing veterinarian notifications...")
    
    # Find nearby veterinarians (simulate)
    nearby_vets = VeterinarianProfile.objects.filter(is_verified=True)[:3]
    
    notifications_created = 0
    for vet_profile in nearby_vets:
        notification = VeterinarianNotificationRequest.objects.create(
            veterinarian=vet_profile.user,
            consultation_request=consultation_request,
            notification_channels=['app', 'email'],
            distance_km=Decimal('25.5')
        )
        notifications_created += 1
        print(f"   📧 Notified Dr. {vet_profile.user.name}")
    
    print(f"✅ Created {notifications_created} veterinarian notifications")
    
    # Test 4: Simulate veterinarian acceptance
    print("\n4. Testing veterinarian acceptance...")
    
    if nearby_vets.exists():
        accepting_vet = nearby_vets.first()
        
        # Accept the consultation request
        success = consultation_request.accept_by_veterinarian(accepting_vet.user)
        
        if success:
            print(f"✅ Dr. {accepting_vet.user.name} accepted the consultation request")
            
            # Create patient record
            patient = VeterinarianPatient.objects.create(
                veterinarian=accepting_vet.user,
                cattle=test_cattle,
                cattle_owner=test_owner,
                consultation_request=consultation_request
            )
            
            print(f"✅ Added {test_cattle.identification_number} to Dr. {accepting_vet.user.name}'s patient list")
            
        else:
            print("❌ Failed to accept consultation request")
    
    # Test 5: Check dashboard statistics
    print("\n5. Testing dashboard statistics...")
    
    if nearby_vets.exists():
        test_vet = nearby_vets.first()
        
        # Count pending requests
        pending_requests = VeterinarianNotificationRequest.objects.filter(
            veterinarian=test_vet.user,
            consultation_request__status='pending'
        ).count()
        
        # Count active patients
        active_patients = VeterinarianPatient.objects.filter(
            veterinarian=test_vet.user,
            status='active'
        ).count()
        
        print(f"✅ Dr. {test_vet.user.name} has {pending_requests} pending requests and {active_patients} active patients")
    
    print("\n🎉 Symptom notification workflow test completed successfully!")
    return True

if __name__ == '__main__':
    test_symptom_workflow()