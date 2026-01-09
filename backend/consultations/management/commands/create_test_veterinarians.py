"""
Management command to create test veterinarians for development.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decimal import Decimal
from consultations.models import VeterinarianProfile

User = get_user_model()


class Command(BaseCommand):
    help = 'Create test veterinarians for development'

    def handle(self, *args, **options):
        # Test veterinarian data
        test_vets = [
            {
                'user_data': {
                    'email': 'dr.sharma@example.com',
                    'name': 'Dr. Rajesh Sharma',
                    'phone': '+91-9876543210',
                    'role': 'veterinarian'
                },
                'profile_data': {
                    'license_number': 'VET001MH',
                    'vet_type': 'private',
                    'specializations': ['Bovine Medicine', 'Large Animal Surgery', 'Emergency Care'],
                    'years_experience': 15,
                    'address': '123 Veterinary Street, Pune',
                    'city': 'Pune',
                    'state': 'Maharashtra',
                    'pincode': '411001',
                    'latitude': Decimal('18.5204'),
                    'longitude': Decimal('73.8567'),
                    'service_radius_km': 50,
                    'is_available': True,
                    'is_emergency_available': True,
                    'consultation_fee_chat': Decimal('150.00'),
                    'consultation_fee_voice': Decimal('200.00'),
                    'consultation_fee_video': Decimal('300.00'),
                    'emergency_fee_multiplier': Decimal('2.00'),
                    'qualification': 'BVSc & AH, MVSc (Surgery)',
                    'bio': 'Experienced veterinarian specializing in bovine medicine and emergency care.',
                    'is_verified': True,
                    'average_rating': Decimal('4.8'),
                    'total_consultations': 245
                }
            },
            {
                'user_data': {
                    'email': 'dr.patel@example.com',
                    'name': 'Dr. Priya Patel',
                    'phone': '+91-9876543211',
                    'role': 'veterinarian'
                },
                'profile_data': {
                    'license_number': 'VET002MH',
                    'vet_type': 'government',
                    'specializations': ['Reproduction', 'Nutrition', 'Preventive Medicine'],
                    'years_experience': 12,
                    'address': '456 Government Hospital Road, Mumbai',
                    'city': 'Mumbai',
                    'state': 'Maharashtra',
                    'pincode': '400001',
                    'latitude': Decimal('19.0760'),
                    'longitude': Decimal('72.8777'),
                    'service_radius_km': 75,
                    'is_available': True,
                    'is_emergency_available': False,
                    'consultation_fee_chat': Decimal('100.00'),
                    'consultation_fee_voice': Decimal('150.00'),
                    'consultation_fee_video': Decimal('250.00'),
                    'emergency_fee_multiplier': Decimal('1.5'),
                    'qualification': 'BVSc & AH, PhD (Animal Reproduction)',
                    'bio': 'Government veterinarian with expertise in cattle reproduction and nutrition.',
                    'is_verified': True,
                    'average_rating': Decimal('4.6'),
                    'total_consultations': 189
                }
            },
            {
                'user_data': {
                    'email': 'dr.kumar@example.com',
                    'name': 'Dr. Amit Kumar',
                    'phone': '+91-9876543212',
                    'role': 'veterinarian'
                },
                'profile_data': {
                    'license_number': 'VET003MH',
                    'vet_type': 'private',
                    'specializations': ['Infectious Diseases', 'Dairy Cattle', 'General Practice'],
                    'years_experience': 8,
                    'address': '789 Dairy Farm Road, Nashik',
                    'city': 'Nashik',
                    'state': 'Maharashtra',
                    'pincode': '422001',
                    'latitude': Decimal('19.9975'),
                    'longitude': Decimal('73.7898'),
                    'service_radius_km': 40,
                    'is_available': False,
                    'is_emergency_available': True,
                    'consultation_fee_chat': Decimal('120.00'),
                    'consultation_fee_voice': Decimal('180.00'),
                    'consultation_fee_video': Decimal('280.00'),
                    'emergency_fee_multiplier': Decimal('2.5'),
                    'qualification': 'BVSc & AH, MVSc (Veterinary Medicine)',
                    'bio': 'Specialist in infectious diseases with focus on dairy cattle health.',
                    'is_verified': True,
                    'average_rating': Decimal('4.7'),
                    'total_consultations': 156
                }
            },
            {
                'user_data': {
                    'email': 'dr.singh@example.com',
                    'name': 'Dr. Manpreet Singh',
                    'phone': '+91-9876543213',
                    'role': 'veterinarian'
                },
                'profile_data': {
                    'license_number': 'VET004MH',
                    'vet_type': 'private',
                    'specializations': ['Surgery', 'Emergency Care', 'Beef Cattle'],
                    'years_experience': 20,
                    'address': '321 Rural Clinic, Satara',
                    'city': 'Satara',
                    'state': 'Maharashtra',
                    'pincode': '415001',
                    'latitude': Decimal('17.6599'),
                    'longitude': Decimal('74.0200'),
                    'service_radius_km': 60,
                    'is_available': True,
                    'is_emergency_available': True,
                    'consultation_fee_chat': Decimal('180.00'),
                    'consultation_fee_voice': Decimal('250.00'),
                    'consultation_fee_video': Decimal('350.00'),
                    'emergency_fee_multiplier': Decimal('2.0'),
                    'qualification': 'BVSc & AH, MVSc (Surgery), Diploma in Emergency Medicine',
                    'bio': 'Senior veterinary surgeon with extensive experience in emergency procedures.',
                    'is_verified': True,
                    'average_rating': Decimal('4.9'),
                    'total_consultations': 312
                }
            },
            {
                'user_data': {
                    'email': 'dr.desai@example.com',
                    'name': 'Dr. Kavita Desai',
                    'phone': '+91-9876543214',
                    'role': 'veterinarian'
                },
                'profile_data': {
                    'license_number': 'VET005MH',
                    'vet_type': 'government',
                    'specializations': ['General Practice', 'Preventive Medicine', 'Nutrition'],
                    'years_experience': 6,
                    'address': '654 District Hospital, Kolhapur',
                    'city': 'Kolhapur',
                    'state': 'Maharashtra',
                    'pincode': '416001',
                    'latitude': Decimal('16.7050'),
                    'longitude': Decimal('74.2433'),
                    'service_radius_km': 35,
                    'is_available': True,
                    'is_emergency_available': False,
                    'consultation_fee_chat': Decimal('80.00'),
                    'consultation_fee_voice': Decimal('120.00'),
                    'consultation_fee_video': Decimal('200.00'),
                    'emergency_fee_multiplier': Decimal('1.8'),
                    'qualification': 'BVSc & AH, PG Diploma in Livestock Management',
                    'bio': 'Young and enthusiastic veterinarian focused on preventive care and nutrition.',
                    'is_verified': True,
                    'average_rating': Decimal('4.5'),
                    'total_consultations': 98
                }
            }
        ]

        created_count = 0
        for vet_data in test_vets:
            try:
                # Check if user already exists
                user, user_created = User.objects.get_or_create(
                    email=vet_data['user_data']['email'],
                    defaults=vet_data['user_data']
                )
                
                if user_created:
                    user.set_password('testpass123')
                    user.save()
                    self.stdout.write(f"Created user: {user.name}")
                
                # Check if veterinarian profile already exists
                vet_profile, profile_created = VeterinarianProfile.objects.get_or_create(
                    user=user,
                    defaults=vet_data['profile_data']
                )
                
                if profile_created:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"Created veterinarian profile: Dr. {user.name}")
                    )
                else:
                    self.stdout.write(f"Veterinarian profile already exists: Dr. {user.name}")
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error creating veterinarian {vet_data['user_data']['name']}: {e}")
                )

        self.stdout.write(
            self.style.SUCCESS(f"Successfully created {created_count} new veterinarian profiles")
        )