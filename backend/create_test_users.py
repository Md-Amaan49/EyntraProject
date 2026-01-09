#!/usr/bin/env python
"""
Script to create test users with sample data for the cattle health system.
"""
import os
import sys
import django
import bcrypt
from datetime import datetime, timedelta
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cattle_health.settings')
django.setup()

from users.models import User
from cattle.models import Cattle
from consultations.models import Consultation, VeterinarianProfile, DiseaseAlert
from health.models import SymptomEntry
from notifications.models import Notification

def create_test_users_with_data():
    """Create test users with sample data for realistic dashboard testing."""
    
    # Test credentials
    test_password = "password123"
    
    # Hash password with bcrypt
    hashed_password = bcrypt.hashpw(test_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    print("Creating comprehensive test data...")
    
    # Create cattle owner with sample cattle
    cattle_owner_email = "test@example.com"
    cattle_owner, created = User.objects.get_or_create(
        email=cattle_owner_email,
        defaults={
            'phone': '+91-9876543210',
            'name': 'Ramesh Patil',
            'role': 'owner',
            'password': hashed_password,
            'is_active': True
        }
    )
    if not created:
        cattle_owner.password = hashed_password
        cattle_owner.is_active = True
        cattle_owner.save()
    
    # Create veterinarian with comprehensive profile
    vet_email = "dr.sharma@vetclinic.com"
    veterinarian, created = User.objects.get_or_create(
        email=vet_email,
        defaults={
            'phone': '+91-9876543211',
            'name': 'Dr. Priya Sharma',
            'role': 'veterinarian',
            'password': hashed_password,
            'is_active': True
        }
    )
    if not created:
        veterinarian.password = hashed_password
        veterinarian.is_active = True
        veterinarian.save()
    
    # Create veterinarian profile with detailed information
    vet_profile, created = VeterinarianProfile.objects.get_or_create(
        user=veterinarian,
        defaults={
            'license_number': 'VET2024001',
            'vet_type': 'private',
            'specializations': ['general', 'infectious', 'emergency'],
            'years_experience': 8,
            'address': '123 Veterinary Street, Medical District',
            'city': 'Pune',
            'state': 'Maharashtra',
            'pincode': '411001',
            'latitude': Decimal('18.5204'),
            'longitude': Decimal('73.8567'),
            'service_radius_km': 50,
            'is_available': True,
            'is_emergency_available': True,
            'working_hours': {
                'monday': {'start': '09:00', 'end': '18:00'},
                'tuesday': {'start': '09:00', 'end': '18:00'},
                'wednesday': {'start': '09:00', 'end': '18:00'},
                'thursday': {'start': '09:00', 'end': '18:00'},
                'friday': {'start': '09:00', 'end': '18:00'},
                'saturday': {'start': '09:00', 'end': '14:00'},
                'sunday': {'closed': True}
            },
            'consultation_fee_chat': Decimal('150.00'),
            'consultation_fee_voice': Decimal('200.00'),
            'consultation_fee_video': Decimal('300.00'),
            'qualification': 'BVSc & AH, MVSc (Veterinary Medicine)',
            'bio': 'Experienced veterinarian specializing in cattle health with 8+ years of practice. Expert in infectious diseases and emergency care.',
            'total_consultations': 245,
            'average_rating': Decimal('4.7'),
            'is_verified': True,
            'verification_date': datetime.now()
        }
    )
    
    # Create sample cattle for the owner
    sample_cattle_data = [
        {'breed': 'Holstein Friesian', 'age': 4, 'id_num': 'MH001', 'gender': 'female', 'weight': 550, 'status': 'healthy'},
        {'breed': 'Jersey', 'age': 3, 'id_num': 'MH002', 'gender': 'female', 'weight': 400, 'status': 'sick'},
        {'breed': 'Gir', 'age': 5, 'id_num': 'MH003', 'gender': 'male', 'weight': 600, 'status': 'under_treatment'},
        {'breed': 'Sahiwal', 'age': 2, 'id_num': 'MH004', 'gender': 'female', 'weight': 350, 'status': 'healthy'},
        {'breed': 'Red Sindhi', 'age': 6, 'id_num': 'MH005', 'gender': 'female', 'weight': 480, 'status': 'healthy'},
    ]
    
    cattle_objects = []
    for cattle_data in sample_cattle_data:
        cattle, created = Cattle.objects.get_or_create(
            identification_number=cattle_data['id_num'],
            defaults={
                'owner': cattle_owner,
                'breed': cattle_data['breed'],
                'age': cattle_data['age'],
                'gender': cattle_data['gender'],
                'weight': Decimal(str(cattle_data['weight'])),
                'health_status': cattle_data['status'],
                'metadata': {
                    'color': 'Brown and White' if 'Holstein' in cattle_data['breed'] else 'Brown',
                    'vaccination_status': 'up_to_date',
                    'last_checkup': (datetime.now() - timedelta(days=30)).isoformat()
                }
            }
        )
        cattle_objects.append(cattle)
    
    # Create sample consultations (completed, scheduled, and pending)
    consultation_data = [
        {
            'cattle': cattle_objects[1],  # Sick Jersey cow
            'type': 'video',
            'priority': 'urgent',
            'status': 'completed',
            'description': 'Cattle showing signs of fever and loss of appetite. Suspected viral infection.',
            'scheduled_time': datetime.now() - timedelta(days=2),
            'started_at': datetime.now() - timedelta(days=2, hours=-1),
            'ended_at': datetime.now() - timedelta(days=2, hours=-0.5),
            'diagnosis': 'Viral fever with secondary bacterial infection',
            'treatment': 'Prescribed antibiotics and supportive care',
            'fee': Decimal('300.00'),
            'rating': 5
        },
        {
            'cattle': cattle_objects[2],  # Gir under treatment
            'type': 'video',
            'priority': 'emergency',
            'status': 'completed',
            'description': 'Skin lesions observed on cattle, possible Lumpy Skin Disease',
            'scheduled_time': datetime.now() - timedelta(days=5),
            'started_at': datetime.now() - timedelta(days=5, hours=-1),
            'ended_at': datetime.now() - timedelta(days=5, hours=-0.75),
            'diagnosis': 'Confirmed Lumpy Skin Disease',
            'treatment': 'Isolation, supportive care, and vaccination of herd',
            'fee': Decimal('600.00'),  # Emergency fee
            'rating': 5
        },
        {
            'cattle': cattle_objects[0],  # Holstein for routine checkup
            'type': 'chat',
            'priority': 'normal',
            'status': 'scheduled',
            'description': 'Routine health checkup and vaccination consultation',
            'scheduled_time': datetime.now() + timedelta(hours=2),
            'fee': Decimal('150.00')
        },
        {
            'cattle': cattle_objects[3],  # Sahiwal - pending request
            'type': 'video',
            'priority': 'urgent',
            'status': 'scheduled',
            'description': 'Cattle not eating properly for 2 days, appears lethargic',
            'scheduled_time': datetime.now() + timedelta(minutes=30),
            'fee': Decimal('300.00')
        }
    ]
    
    for consult_data in consultation_data:
        consultation, created = Consultation.objects.get_or_create(
            cattle_owner=cattle_owner,
            veterinarian=veterinarian,
            cattle=consult_data['cattle'],
            scheduled_time=consult_data['scheduled_time'],
            defaults={
                'consultation_type': consult_data['type'],
                'priority': consult_data['priority'],
                'status': consult_data['status'],
                'case_description': consult_data['description'],
                'consultation_fee': consult_data['fee'],
                'total_fee': consult_data['fee'],
                'started_at': consult_data.get('started_at'),
                'ended_at': consult_data.get('ended_at'),
                'diagnosis': consult_data.get('diagnosis', ''),
                'treatment_plan': consult_data.get('treatment', ''),
                'owner_rating': consult_data.get('rating'),
                'ai_predictions': [
                    {
                        'disease': 'Lumpy Skin Disease' if 'lesions' in consult_data['description'] else 'Viral Fever',
                        'confidence': 0.85,
                        'symptoms_matched': ['fever', 'lethargy', 'loss_of_appetite']
                    }
                ] if consult_data['status'] == 'completed' else []
            }
        )
    
    # Create sample symptom entries
    symptom_entries = [
        {
            'cattle': cattle_objects[1],
            'symptoms': 'Cattle has been showing reduced appetite and appears tired. Observed fever and lethargy.',
            'severity': 'moderate',
            'observed_date': datetime.now() - timedelta(days=3),
            'created_by': cattle_owner
        },
        {
            'cattle': cattle_objects[2],
            'symptoms': 'Multiple skin lesions observed, cattle appears distressed. Fever and swelling noted.',
            'severity': 'severe',
            'observed_date': datetime.now() - timedelta(days=6),
            'created_by': cattle_owner
        }
    ]
    
    for symptom_data in symptom_entries:
        try:
            SymptomEntry.objects.get_or_create(
                cattle=symptom_data['cattle'],
                observed_date=symptom_data['observed_date'],
                defaults={
                    'symptoms': symptom_data['symptoms'],
                    'severity': symptom_data['severity'],
                    'created_by': symptom_data['created_by'],
                    'additional_notes': 'Created by test data script for demonstration purposes'
                }
            )
        except Exception as e:
            print(f"Could not create symptom entry: {e}")
    
    # Create disease alerts
    disease_alerts = [
        {
            'disease': 'Lumpy Skin Disease',
            'cattle': cattle_objects[2],
            'severity': 'high',
            'location': {'city': 'Pune', 'state': 'Maharashtra', 'district': 'Pune'},
            'alert_type': 'ai_detection'
        },
        {
            'disease': 'Foot and Mouth Disease',
            'cattle': cattle_objects[1],
            'severity': 'medium',
            'location': {'city': 'Satara', 'state': 'Maharashtra', 'district': 'Satara'},
            'alert_type': 'symptom_report'
        }
    ]
    
    for alert_data in disease_alerts:
        try:
            DiseaseAlert.objects.get_or_create(
                disease_name=alert_data['disease'],
                cattle=alert_data['cattle'],
                defaults={
                    'alert_type': alert_data['alert_type'],
                    'severity': alert_data['severity'],
                    'status': 'active',
                    'location': alert_data['location'],
                    'affected_radius_km': 25,
                    'ai_prediction_data': {
                        'confidence': 0.89,
                        'model_version': 'v2.1',
                        'detection_method': 'image_analysis'
                    }
                }
            )
        except Exception as e:
            print(f"Could not create disease alert: {e}")
    
    # Create notifications for the veterinarian
    notifications = [
        {
            'title': 'New Emergency Consultation Request',
            'message': 'Urgent consultation requested for cattle MH002 - skin lesions observed',
            'type': 'consultation_request',
            'priority': 'critical'
        },
        {
            'title': 'Disease Alert in Your Area',
            'message': 'Lumpy Skin Disease detected 15km from your location',
            'type': 'disease_alert',
            'priority': 'high'
        },
        {
            'title': 'Consultation Reminder',
            'message': 'Scheduled consultation with Ramesh Patil in 30 minutes',
            'type': 'reminder',
            'priority': 'medium'
        }
    ]
    
    for notif_data in notifications:
        try:
            Notification.objects.get_or_create(
                user=veterinarian,
                title=notif_data['title'],
                defaults={
                    'message': notif_data['message'],
                    'notification_type': notif_data['type'],
                    'priority': notif_data['priority'],
                    'is_read': False,
                    'metadata': {
                        'source': 'system',
                        'auto_generated': True
                    }
                }
            )
        except Exception as e:
            print(f"Could not create notification: {e}")
    
    print("\n=== Test Users with Sample Data Created Successfully ===")
    print(f"Cattle Owner Login:")
    print(f"  Email: {cattle_owner_email}")
    print(f"  Password: {test_password}")
    print(f"  Role: owner")
    print(f"  Cattle: {len(cattle_objects)} animals registered")
    print()
    print(f"Veterinarian Login (WITH LOADED DATA):")
    print(f"  Email: {vet_email}")
    print(f"  Password: {test_password}")
    print(f"  Role: veterinarian")
    print(f"  Total Consultations: 245")
    print(f"  Pending Requests: 2")
    print(f"  Average Rating: 4.7/5")
    print(f"  Emergency Consultations: 1")
    print(f"  Regional Disease Alerts: 2")
    print()
    print("🎉 The veterinarian dashboard will now show realistic data!")
    print("📊 Metrics include: consultations, ratings, pending requests, regional alerts")
    print("🚨 Emergency cases and disease alerts are included")
    print("📅 Today's schedule shows upcoming consultations")

if __name__ == '__main__':
    create_test_users_with_data()