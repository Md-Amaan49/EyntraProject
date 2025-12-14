"""
WSGI config for cattle_health project.
"""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cattle_health.settings')

application = get_wsgi_application()
