"""
Django admin configuration for dashboard models.
"""
from django.contrib import admin
from .models import Prediction, DiseaseRecord, Alert, APIUsageLog, SystemLog


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    """Admin interface for Prediction model."""
    
    list_display = ['id', 'cow', 'user', 'predicted_class', 'confidence', 'is_healthy', 'created_at']
    list_filter = ['is_healthy', 'predicted_class', 'created_at']
    search_fields = ['cow__identification_number', 'user__name', 'user__email', 'predicted_class']
    readonly_fields = ['id', 'created_at', 'updated_at', 'raw_response']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'cow', 'user', 'image_url')
        }),
        ('Prediction Results', {
            'fields': ('predicted_class', 'confidence', 'is_healthy')
        }),
        ('Raw Data', {
            'fields': ('raw_response',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(DiseaseRecord)
class DiseaseRecordAdmin(admin.ModelAdmin):
    """Admin interface for DiseaseRecord model."""
    
    list_display = ['id', 'cow', 'disease_type', 'severity', 'confirmed_by_vet', 'created_at']
    list_filter = ['severity', 'confirmed_by_vet', 'disease_type', 'created_at']
    search_fields = ['cow__identification_number', 'disease_type', 'recommendation']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'cow', 'prediction')
        }),
        ('Disease Details', {
            'fields': ('disease_type', 'severity', 'recommendation')
        }),
        ('Veterinary Confirmation', {
            'fields': ('confirmed_by_vet', 'vet_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    """Admin interface for Alert model."""
    
    list_display = ['id', 'user', 'alert_type', 'severity', 'is_read', 'created_at']
    list_filter = ['alert_type', 'severity', 'is_read', 'created_at']
    search_fields = ['user__name', 'user__email', 'message']
    readonly_fields = ['id', 'created_at']
    date_hierarchy = 'created_at'
    actions = ['mark_as_read', 'mark_as_unread']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'user', 'prediction')
        }),
        ('Alert Details', {
            'fields': ('alert_type', 'severity', 'message')
        }),
        ('Status', {
            'fields': ('is_read', 'dismissed_at')
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )
    
    def mark_as_read(self, request, queryset):
        """Mark selected alerts as read."""
        updated = queryset.update(is_read=True)
        self.message_user(request, f'{updated} alert(s) marked as read.')
    mark_as_read.short_description = 'Mark selected alerts as read'
    
    def mark_as_unread(self, request, queryset):
        """Mark selected alerts as unread."""
        updated = queryset.update(is_read=False)
        self.message_user(request, f'{updated} alert(s) marked as unread.')
    mark_as_unread.short_description = 'Mark selected alerts as unread'


@admin.register(APIUsageLog)
class APIUsageLogAdmin(admin.ModelAdmin):
    """Admin interface for APIUsageLog model."""
    
    list_display = ['id', 'endpoint', 'method', 'status_code', 'response_time_ms', 'user', 'created_at']
    list_filter = ['method', 'status_code', 'created_at']
    search_fields = ['endpoint', 'user__name', 'user__email', 'error_message']
    readonly_fields = ['id', 'created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Request Information', {
            'fields': ('id', 'endpoint', 'method', 'user')
        }),
        ('Response Information', {
            'fields': ('status_code', 'response_time_ms', 'error_message')
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )


@admin.register(SystemLog)
class SystemLogAdmin(admin.ModelAdmin):
    """Admin interface for SystemLog model."""
    
    list_display = ['id', 'level', 'category', 'message_preview', 'user', 'created_at']
    list_filter = ['level', 'category', 'created_at']
    search_fields = ['message', 'user__name', 'user__email']
    readonly_fields = ['id', 'created_at', 'details']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Log Information', {
            'fields': ('id', 'level', 'category', 'message')
        }),
        ('Associated Records', {
            'fields': ('prediction', 'user')
        }),
        ('Additional Details', {
            'fields': ('details',),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )
    
    def message_preview(self, obj):
        """Show preview of message in list view."""
        return obj.message[:75] + '...' if len(obj.message) > 75 else obj.message
    message_preview.short_description = 'Message'
