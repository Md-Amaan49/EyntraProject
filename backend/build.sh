#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Starting build process..."

# Install dependencies
echo "Installing Python dependencies..."
pip install --no-cache-dir -r requirements.txt

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --no-input

# Run migrations
echo "Running database migrations..."
python manage.py migrate

# Create superuser if it doesn't exist
echo "Creating superuser..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@cattlehealth.com').exists():
    User.objects.create_superuser('admin@cattlehealth.com', 'admin123', name='Admin User', role='admin')
    print('Superuser created successfully')
else:
    print('Superuser already exists')
" || echo "Superuser creation skipped"

# Create test users
echo "Creating test users..."
python create_test_users.py || echo "Test user creation skipped"

echo "Build process completed successfully!"