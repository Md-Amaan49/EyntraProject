"""
Management command to create test users with location data.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import bcrypt

User = get_user_model()


class Command(BaseCommand):
    help = 'Create test users with location data for testing nearby veterinarians feature'

    def handle(self, *args, **options):
        # Test data for different states and cities
        test_users = [
            # Karnataka - Cattle Owners
            {
                'email': 'farmer1@example.com',
                'name': 'Rajesh Kumar',
                'phone': '+919876543210',
                'role': 'owner',
                'state': 'KA',
                'city': 'KA001',  # Bangalore
                'address': 'Farm House, Whitefield, Bangalore',
                'pincode': '560066',
                'password': 'testpass123'
            },
            {
                'email': 'farmer2@example.com',
                'name': 'Suresh Patil',
                'phone': '+919876543211',
                'role': 'owner',
                'state': 'KA',
                'city': 'KA002',  # Mysore
                'address': 'Dairy Farm, Mysore Road',
                'pincode': '570001',
                'password': 'testpass123'
            },
            
            # Karnataka - Veterinarians
            {
                'email': 'vet1@example.com',
                'name': 'Dr. Priya Sharma',
                'phone': '+919876543212',
                'role': 'veterinarian',
                'state': 'KA',
                'city': 'KA001',  # Bangalore
                'address': 'Veterinary Clinic, Koramangala, Bangalore',
                'pincode': '560034',
                'password': 'testpass123'
            },
            {
                'email': 'vet2@example.com',
                'name': 'Dr. Arun Reddy',
                'phone': '+919876543213',
                'role': 'veterinarian',
                'state': 'KA',
                'city': 'KA001',  # Bangalore
                'address': 'Animal Hospital, Indiranagar, Bangalore',
                'pincode': '560038',
                'password': 'testpass123'
            },
            {
                'email': 'vet3@example.com',
                'name': 'Dr. Lakshmi Nair',
                'phone': '+919876543214',
                'role': 'veterinarian',
                'state': 'KA',
                'city': 'KA002',  # Mysore
                'address': 'Cattle Care Center, Mysore',
                'pincode': '570002',
                'password': 'testpass123'
            },
            
            # Maharashtra - Cattle Owners
            {
                'email': 'farmer3@example.com',
                'name': 'Ganesh Jadhav',
                'phone': '+919876543215',
                'role': 'owner',
                'state': 'MH',
                'city': 'MH002',  # Pune
                'address': 'Dairy Farm, Hadapsar, Pune',
                'pincode': '411028',
                'password': 'testpass123'
            },
            
            # Maharashtra - Veterinarians
            {
                'email': 'vet4@example.com',
                'name': 'Dr. Amit Deshmukh',
                'phone': '+919876543216',
                'role': 'veterinarian',
                'state': 'MH',
                'city': 'MH002',  # Pune
                'address': 'Veterinary Hospital, Shivaji Nagar, Pune',
                'pincode': '411005',
                'password': 'testpass123'
            },
            {
                'email': 'vet5@example.com',
                'name': 'Dr. Sneha Kulkarni',
                'phone': '+919876543217',
                'role': 'veterinarian',
                'state': 'MH',
                'city': 'MH001',  # Mumbai
                'address': 'Animal Clinic, Andheri, Mumbai',
                'pincode': '400058',
                'password': 'testpass123'
            },
            
            # Tamil Nadu - Cattle Owners
            {
                'email': 'farmer4@example.com',
                'name': 'Murugan Pillai',
                'phone': '+919876543218',
                'role': 'owner',
                'state': 'TN',
                'city': 'TN001',  # Chennai
                'address': 'Cattle Farm, Tambaram, Chennai',
                'pincode': '600045',
                'password': 'testpass123'
            },
            
            # Tamil Nadu - Veterinarians
            {
                'email': 'vet6@example.com',
                'name': 'Dr. Karthik Raman',
                'phone': '+919876543219',
                'role': 'veterinarian',
                'state': 'TN',
                'city': 'TN001',  # Chennai
                'address': 'Veterinary College, Vepery, Chennai',
                'pincode': '600007',
                'password': 'testpass123'
            },
            {
                'email': 'vet7@example.com',
                'name': 'Dr. Meera Krishnan',
                'phone': '+919876543220',
                'role': 'veterinarian',
                'state': 'TN',
                'city': 'TN002',  # Coimbatore
                'address': 'Animal Care Center, Coimbatore',
                'pincode': '641001',
                'password': 'testpass123'
            },
        ]

        created_count = 0
        updated_count = 0

        for user_data in test_users:
            email = user_data['email']
            password = user_data.pop('password')
            
            # Check if user already exists
            user, created = User.objects.get_or_create(
                email=email,
                defaults=user_data
            )
            
            if created:
                # Hash password with bcrypt
                hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
                user.password = hashed.decode('utf-8')
                user.save()
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created user: {user.name} ({user.email}) - {user.role}')
                )
            else:
                # Update existing user with new location data
                for key, value in user_data.items():
                    setattr(user, key, value)
                user.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated user: {user.name} ({user.email}) - {user.role}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSummary:\n'
                f'- Created: {created_count} users\n'
                f'- Updated: {updated_count} users\n'
                f'- Total: {created_count + updated_count} users processed\n\n'
                f'Test users created with locations:\n'
                f'- Karnataka: 2 cattle owners, 3 veterinarians\n'
                f'- Maharashtra: 1 cattle owner, 2 veterinarians\n'
                f'- Tamil Nadu: 1 cattle owner, 2 veterinarians\n\n'
                f'You can now test the nearby veterinarians feature!'
            )
        )