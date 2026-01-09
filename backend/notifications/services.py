"""
Notification service for handling notification creation and delivery.
"""
from django.utils import timezone
from django.contrib.auth import get_user_model
from geopy.distance import geodesic

from .models import (
    Notification, NotificationPreferences, NotificationTemplate,
    NotificationDelivery
)
from consultations.models import VeterinarianProfile, DiseaseAlert
from cattle.models import Cattle

User = get_user_model()


class NotificationService:
    """Service for managing notifications."""
    
    def create_notification(self, user, notification_type, title, message, 
                          priority='medium', cattle=None, consultation=None, 
                          disease_alert=None, metadata=None, action_url=None):
        """Create a new notification."""
        
        # Get user preferences
        preferences = self.get_user_preferences(user)
        
        # Check if user wants this type of notification
        if not self.should_send_notification(preferences, notification_type):
            return None
        
        # Create notification
        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority,
            cattle=cattle,
            consultation=consultation,
            disease_alert=disease_alert,
            metadata=metadata or {},
            action_url=action_url or '',
            send_email=self.should_send_email(preferences, notification_type),
            send_sms=self.should_send_sms(preferences, notification_type),
            send_push=self.should_send_push(preferences, notification_type)
        )
        
        # Queue for delivery
        self.queue_notification_delivery(notification)
        
        return notification
    
    def create_disease_alert_notifications(self, disease_name, location, 
                                         cattle_id, severity='medium', 
                                         ai_prediction_data=None):
        """Create disease alert notifications for nearby veterinarians."""
        
        try:
            cattle = Cattle.objects.get(id=cattle_id)
        except Cattle.DoesNotExist:
            return 0
        
        # Create disease alert record
        disease_alert = DiseaseAlert.objects.create(
            alert_type='ai_detection',
            disease_name=disease_name,
            severity=severity,
            location=location,
            affected_radius_km=20,  # 20km radius for alerts
            cattle=cattle,
            ai_prediction_data=ai_prediction_data or {}
        )
        
        # Find nearby veterinarians
        nearby_vets = self.find_nearby_veterinarians(location, radius_km=50)
        
        notifications_created = 0
        for vet_data in nearby_vets:
            vet = vet_data['veterinarian']
            distance = vet_data['distance']
            
            # Create notification
            title = f"Disease Alert: {disease_name} detected nearby"
            message = (
                f"A case of {disease_name} has been detected {distance:.1f}km "
                f"from your location. Cattle ID: {cattle.identification_number}. "
                f"Severity: {severity.title()}. "
                f"Location: {location.get('address', 'Unknown location')}."
            )
            
            notification = self.create_notification(
                user=vet,
                notification_type='disease_alert',
                title=title,
                message=message,
                priority='high' if severity in ['high', 'critical'] else 'medium',
                cattle=cattle,
                disease_alert=disease_alert,
                metadata={
                    'distance_km': distance,
                    'disease_name': disease_name,
                    'severity': severity,
                    'location': location
                },
                action_url=f'/consultations/alerts/{disease_alert.id}/'
            )
            
            if notification:
                notifications_created += 1
        
        return notifications_created
    
    def create_consultation_reminder(self, consultation):
        """Create consultation reminder notification."""
        
        # Reminder for cattle owner
        owner_title = f"Consultation Reminder: {consultation.consultation_type.title()} Call"
        owner_message = (
            f"Your {consultation.consultation_type} consultation with "
            f"Dr. {consultation.veterinarian.name} is scheduled for "
            f"{consultation.scheduled_time.strftime('%B %d, %Y at %I:%M %p')}. "
            f"Cattle: {consultation.cattle.identification_number}"
        )
        
        owner_notification = self.create_notification(
            user=consultation.cattle_owner,
            notification_type='consultation_reminder',
            title=owner_title,
            message=owner_message,
            priority='medium',
            cattle=consultation.cattle,
            consultation=consultation,
            action_url=f'/consultations/{consultation.id}/'
        )
        
        # Reminder for veterinarian
        vet_title = f"Upcoming Consultation: {consultation.consultation_type.title()} Call"
        vet_message = (
            f"You have a {consultation.consultation_type} consultation with "
            f"{consultation.cattle_owner.name} scheduled for "
            f"{consultation.scheduled_time.strftime('%B %d, %Y at %I:%M %p')}. "
            f"Cattle: {consultation.cattle.identification_number}"
        )
        
        vet_notification = self.create_notification(
            user=consultation.veterinarian,
            notification_type='consultation_reminder',
            title=vet_title,
            message=vet_message,
            priority='medium',
            cattle=consultation.cattle,
            consultation=consultation,
            action_url=f'/consultations/{consultation.id}/'
        )
        
        return [owner_notification, vet_notification]
    
    def create_emergency_alert(self, cattle, description, location=None):
        """Create emergency alert for nearby veterinarians."""
        
        # Find emergency-available veterinarians
        emergency_vets = VeterinarianProfile.objects.filter(
            is_emergency_available=True,
            is_available=True,
            is_verified=True
        )
        
        if location:
            # Filter by location if provided
            nearby_emergency_vets = []
            user_location = (location.get('latitude'), location.get('longitude'))
            
            for vet in emergency_vets:
                if vet.latitude and vet.longitude:
                    vet_location = (float(vet.latitude), float(vet.longitude))
                    distance = geodesic(user_location, vet_location).kilometers
                    
                    if distance <= vet.service_radius_km:
                        nearby_emergency_vets.append({
                            'veterinarian': vet.user,
                            'distance': distance
                        })
            
            # Sort by distance
            nearby_emergency_vets.sort(key=lambda x: x['distance'])
            target_vets = nearby_emergency_vets[:5]  # Notify top 5 closest
        else:
            # If no location, notify all emergency vets
            target_vets = [{'veterinarian': vet.user, 'distance': None} 
                          for vet in emergency_vets[:10]]
        
        notifications_created = 0
        for vet_data in target_vets:
            vet = vet_data['veterinarian']
            distance = vet_data['distance']
            
            title = f"EMERGENCY: Urgent veterinary assistance needed"
            message = (
                f"Emergency case reported for cattle {cattle.identification_number}. "
                f"Description: {description}. "
            )
            
            if distance:
                message += f"Distance: {distance:.1f}km from your location. "
            
            message += "Immediate response required."
            
            notification = self.create_notification(
                user=vet,
                notification_type='emergency_alert',
                title=title,
                message=message,
                priority='critical',
                cattle=cattle,
                metadata={
                    'emergency': True,
                    'distance_km': distance,
                    'description': description
                },
                action_url=f'/consultations/emergency/{cattle.id}/'
            )
            
            if notification:
                notifications_created += 1
        
        return notifications_created
    
    def find_nearby_veterinarians(self, location, radius_km=50):
        """Find veterinarians near a given location."""
        
        if not location.get('latitude') or not location.get('longitude'):
            return []
        
        user_location = (float(location['latitude']), float(location['longitude']))
        
        # Get all available veterinarians
        veterinarians = VeterinarianProfile.objects.filter(
            is_available=True,
            is_verified=True
        )
        
        nearby_vets = []
        for vet in veterinarians:
            if vet.latitude and vet.longitude:
                vet_location = (float(vet.latitude), float(vet.longitude))
                distance = geodesic(user_location, vet_location).kilometers
                
                if distance <= radius_km:
                    nearby_vets.append({
                        'veterinarian': vet.user,
                        'distance': distance,
                        'profile': vet
                    })
        
        # Sort by distance
        nearby_vets.sort(key=lambda x: x['distance'])
        return nearby_vets
    
    def get_user_preferences(self, user):
        """Get user notification preferences."""
        preferences, created = NotificationPreferences.objects.get_or_create(
            user=user
        )
        return preferences
    
    def should_send_notification(self, preferences, notification_type):
        """Check if user wants this type of notification."""
        type_mapping = {
            'disease_alert': preferences.disease_alerts_enabled,
            'consultation_reminder': preferences.consultation_reminders,
            'consultation_update': preferences.consultation_updates,
            'treatment_reminder': preferences.treatment_reminders,
            'vaccination_reminder': preferences.vaccination_reminders,
            'emergency_alert': preferences.emergency_alerts,
            'outbreak_warning': preferences.regional_disease_alerts,
            'system_message': True,  # Always send system messages
        }
        
        return type_mapping.get(notification_type, True)
    
    def should_send_email(self, preferences, notification_type):
        """Check if user wants email for this notification type."""
        type_mapping = {
            'disease_alert': preferences.disease_alerts_email,
            'consultation_reminder': preferences.consultation_reminders,
            'consultation_update': preferences.consultation_updates,
            'emergency_alert': preferences.emergency_alerts,
        }
        
        return type_mapping.get(notification_type, False)
    
    def should_send_sms(self, preferences, notification_type):
        """Check if user wants SMS for this notification type."""
        type_mapping = {
            'disease_alert': preferences.disease_alerts_sms,
            'emergency_alert': preferences.emergency_alerts,
        }
        
        return type_mapping.get(notification_type, False)
    
    def should_send_push(self, preferences, notification_type):
        """Check if user wants push notifications for this type."""
        type_mapping = {
            'disease_alert': preferences.disease_alerts_push,
            'consultation_reminder': preferences.consultation_reminders,
            'consultation_update': preferences.consultation_updates,
            'emergency_alert': preferences.emergency_alerts,
        }
        
        return type_mapping.get(notification_type, True)
    
    def queue_notification_delivery(self, notification):
        """Queue notification for delivery across different channels."""
        
        # Create delivery records for each enabled channel
        if notification.send_push:
            NotificationDelivery.objects.create(
                notification=notification,
                channel='push',
                recipient=str(notification.user.id)
            )
        
        if notification.send_email:
            NotificationDelivery.objects.create(
                notification=notification,
                channel='email',
                recipient=notification.user.email
            )
        
        if notification.send_sms and notification.user.phone:
            NotificationDelivery.objects.create(
                notification=notification,
                channel='sms',
                recipient=notification.user.phone
            )
        
        # Mark notification as queued
        notification.status = 'pending'
        notification.save()
    
    def process_pending_deliveries(self):
        """Process pending notification deliveries."""
        
        pending_deliveries = NotificationDelivery.objects.filter(
            status='pending'
        )
        
        for delivery in pending_deliveries:
            try:
                if delivery.channel == 'push':
                    self.send_push_notification(delivery)
                elif delivery.channel == 'email':
                    self.send_email_notification(delivery)
                elif delivery.channel == 'sms':
                    self.send_sms_notification(delivery)
                
            except Exception as e:
                delivery.mark_as_failed(str(e))
    
    def send_push_notification(self, delivery):
        """Send push notification (placeholder implementation)."""
        # This would integrate with a push notification service
        # like Firebase Cloud Messaging, OneSignal, etc.
        
        # For now, just mark as sent
        delivery.mark_as_sent()
        delivery.mark_as_delivered()
    
    def send_email_notification(self, delivery):
        """Send email notification (placeholder implementation)."""
        # This would integrate with an email service
        # like SendGrid, AWS SES, etc.
        
        # For now, just mark as sent
        delivery.mark_as_sent()
        delivery.mark_as_delivered()
    
    def send_sms_notification(self, delivery):
        """Send SMS notification (placeholder implementation)."""
        # This would integrate with an SMS service
        # like Twilio, AWS SNS, etc.
        
        # For now, just mark as sent
        delivery.mark_as_sent()
        delivery.mark_as_delivered()