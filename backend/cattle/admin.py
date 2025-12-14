"""
Admin configuration for Cattle models.
"""
from django.contrib import admin
from .models import Cattle, CattleHistory


@admin.register(Cattle)
class CattleAdmin(admin.ModelAdmin):
    """Admin interface for Cattle model."""
    
    list_display = [
        'identification_number',
        'breed',
        'age',
        'gender',
        'health_status',
        'owner',
        'is_archived',
        'created_at'
    ]
    list_filter = ['health_status', 'gender', 'is_archived', 'created_at']
    search_fields = ['identification_number', 'breed', 'owner__name', 'owner__email']
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'owner', 'identification_number', 'breed', 'age', 'gender')
        }),
        ('Physical Details', {
            'fields': ('weight', 'metadata')
        }),
        ('Health Status', {
            'fields': ('health_status', 'is_archived')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def get_queryset(self, request):
        """Include archived cattle in admin view."""
        return super().get_queryset(request)


@admin.register(CattleHistory)
class CattleHistoryAdmin(admin.ModelAdmin):
    """Admin interface for CattleHistory model."""
    
    list_display = [
        'cattle',
        'field_name',
        'old_value',
        'new_value',
        'changed_by',
        'changed_at'
    ]
    list_filter = ['field_name', 'changed_at']
    search_fields = ['cattle__identification_number', 'changed_by__name']
    ordering = ['-changed_at']
    readonly_fields = ['id', 'cattle', 'field_name', 'old_value', 'new_value', 'changed_by', 'changed_at']
    
    def has_add_permission(self, request):
        """Disable manual creation of history records."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Disable deletion of history records."""
        return False
