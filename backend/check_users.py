#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cattle_health.settings')
django.setup()

from users.models import User

print("=== Users in Database ===")
users = User.objects.all()
if users:
    for user in users:
        print(f"Email: {user.email}")
        print(f"Role: {user.role}")
        print(f"Active: {user.is_active}")
        print(f"Staff: {user.is_staff}")
        print(f"Superuser: {user.is_superuser}")
        print("---")
else:
    print("No users found in database!")

print(f"\nTotal users: {users.count()}")

# Test login credentials
print("\n=== Testing Login Credentials ===")
test_email = "test@example.com"
test_password = "password123"

try:
    user = User.objects.get(email=test_email)
    print(f"User found: {user.email}")
    print(f"Password check: {user.check_password(test_password)}")
except User.DoesNotExist:
    print(f"User with email {test_email} not found!")

# Test vet credentials
vet_email = "dr.sharma@vetclinic.com"
try:
    vet = User.objects.get(email=vet_email)
    print(f"Vet found: {vet.email}")
    print(f"Password check: {vet.check_password(test_password)}")
except User.DoesNotExist:
    print(f"Vet with email {vet_email} not found!")