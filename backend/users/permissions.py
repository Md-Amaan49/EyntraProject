"""
Custom permissions for role-based access control.
"""
from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """Permission class for cattle owners."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_owner()


class IsVeterinarian(permissions.BasePermission):
    """Permission class for veterinarians."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_veterinarian()


class IsAdmin(permissions.BasePermission):
    """Permission class for administrators."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin()


class IsOwnerOrVeterinarian(permissions.BasePermission):
    """Permission class for owners or veterinarians."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_owner() or request.user.is_veterinarian())
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    Assumes the model instance has an `owner` or `user` attribute.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        elif hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False
