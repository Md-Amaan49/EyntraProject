#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cattle_health.settings')
django.setup()

from users.models import User

print("=== Fixing User Passwords ===")

# Fix test user password
try:
    user = User.objects.get(email="test@example.com")
    user.set_password("password123")
    user.save()
    print("✅ Fixed password for test@example.com")
except User.DoesNotExist:
    print("❌ test@example.com not found")

# Fix veterinarian password
try:
    vet = User.objects.get(email="dr.sharma@vetclinic.com")
    vet.set_password("password123")
    vet.save()
    print("✅ Fixed password for dr.sharma@vetclinic.com")
except User.DoesNotExist:
    print("❌ dr.sharma@vetclinic.com not found")

# Fix admin password
try:
    admin = User.objects.get(email="admin@example.com")
    admin.set_password("admin123")
    admin.save()
    print("✅ Fixed password for admin@example.com")
except User.DoesNotExist:
    print("❌ admin@example.com not found")

# Test the passwords
print("\n=== Testing Fixed Passwords ===")
test_users = [
    ("test@example.com", "password123"),
    ("dr.sharma@vetclinic.com", "password123"),
    ("admin@example.com", "admin123")
]

for email, password in test_users:
    try:
        user = User.objects.get(email=email)
        if user.check_password(password):
            print(f"✅ {email} - Password works!")
        else:
            print(f"❌ {email} - Password still not working")
    except User.DoesNotExist:
        print(f"❌ {email} - User not found")

print("\n=== Login Credentials ===")
print("Cattle Owner:")
print("  Email: test@example.com")
print("  Password: password123")
print()
print("Veterinarian:")
print("  Email: dr.sharma@vetclinic.com") 
print("  Password: password123")
print()
print("Admin:")
print("  Email: admin@example.com")
print("  Password: admin123")