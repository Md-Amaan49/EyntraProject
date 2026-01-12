"""
User models for the Cattle Health System.
"""
import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""
    
    def create_user(self, email, phone, name, password=None, role='owner', **extra_fields):
        """Create and save a regular user."""
        if not email:
            raise ValueError('Users must have an email address')
        if not phone:
            raise ValueError('Users must have a phone number')
        if not name:
            raise ValueError('Users must have a name')
        
        email = self.normalize_email(email)
        user = self.model(
            email=email,
            phone=phone,
            name=name,
            role=role,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, phone, name, password=None, **extra_fields):
        """Create and save a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, phone, name, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model with role-based access control."""
    
    ROLE_CHOICES = [
        ('owner', 'Cattle Owner'),
        ('veterinarian', 'Veterinarian'),
        ('admin', 'Administrator'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=255, unique=True, db_index=True)
    phone = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='owner')
    
    # Location fields
    state = models.CharField(max_length=50, blank=True, null=True, help_text="State code (e.g., KA, MH)")
    city = models.CharField(max_length=100, blank=True, null=True, help_text="City ID from location data")
    address = models.TextField(blank=True, null=True, help_text="Complete address")
    pincode = models.CharField(max_length=10, blank=True, null=True, help_text="PIN/ZIP code")
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['phone', 'name']
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone']),
            models.Index(fields=['role']),
            models.Index(fields=['state']),
            models.Index(fields=['city']),
            models.Index(fields=['state', 'city']),  # Composite index for location queries
        ]
    
    def __str__(self):
        return f"{self.name} ({self.email})"
    
    def is_owner(self):
        """Check if user is a cattle owner."""
        return self.role == 'owner'
    
    def is_veterinarian(self):
        """Check if user is a veterinarian."""
        return self.role == 'veterinarian'
    
    def is_admin(self):
        """Check if user is an administrator."""
        return self.role == 'admin'
    
    def get_nearby_veterinarians(self, radius_km=50):
        """Get veterinarians in the same city or state."""
        if not self.state:
            return User.objects.none()
        
        # First try to find veterinarians in the same city
        if self.city:
            same_city_vets = User.objects.filter(
                role='veterinarian',
                is_active=True,
                state=self.state,
                city=self.city
            ).exclude(id=self.id)
            
            if same_city_vets.exists():
                return same_city_vets
        
        # If no veterinarians in the same city, find in the same state
        return User.objects.filter(
            role='veterinarian',
            is_active=True,
            state=self.state
        ).exclude(id=self.id)
    
    @property
    def location_display(self):
        """Get a human-readable location string."""
        parts = []
        if self.city:
            parts.append(self.city)
        if self.state:
            parts.append(self.state)
        return ', '.join(parts) if parts else 'Location not set'
