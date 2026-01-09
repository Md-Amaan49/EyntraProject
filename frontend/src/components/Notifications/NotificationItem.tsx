import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Avatar,
  Button,
} from '@mui/material';
import {
  Close,
  LocalHospital,
  Schedule,
  Warning,
  Info,
  NotificationsActive,
  CheckCircle,
  OpenInNew,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../../types';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onAction?: (notification: Notification) => void;
  compact?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDismiss,
  onAction,
  compact = false,
}) => {
  const navigate = useNavigate();

  const getNotificationIcon = () => {
    if (notification.priority === 'critical') {
      return <Warning color="error" />;
    }
    
    switch (notification.type) {
      case 'reminder':
        return <Schedule color="info" />;
      case 'alert':
        return <NotificationsActive color="warning" />;
      case 'message':
        return <LocalHospital color="primary" />;
      case 'system':
        return <Info color="action" />;
      default:
        return <LocalHospital color="action" />;
    }
  };

  const getPriorityColor = () => {
    switch (notification.priority) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getBackgroundColor = () => {
    if (notification.isRead) return 'transparent';
    
    switch (notification.priority) {
      case 'critical':
        return 'error.light';
      case 'high':
        return 'warning.light';
      default:
        return 'action.hover';
    }
  };

  const formatNotificationTime = () => {
    const now = new Date();
    const diff = now.getTime() - new Date(notification.createdAt).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    return new Date(notification.createdAt).toLocaleDateString();
  };

  const handleClick = () => {
    // Mark as read if not already read
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate to action URL if provided
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    
    // Call custom action handler
    if (onAction) {
      onAction(notification);
    }
  };

  const handleDismiss = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onDismiss) {
      onDismiss(notification.id);
    }
  };

  if (compact) {
    return (
      <Card
        sx={{
          mb: 1,
          bgcolor: getBackgroundColor(),
          cursor: notification.actionUrl ? 'pointer' : 'default',
          '&:hover': {
            bgcolor: 'action.selected',
          },
        }}
        onClick={handleClick}
      >
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'transparent' }}>
              {getNotificationIcon()}
            </Avatar>
            
            <Box flex={1}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: notification.isRead ? 'normal' : 'bold',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {notification.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatNotificationTime()}
              </Typography>
            </Box>
            
            {notification.priority !== 'low' && (
              <Chip
                label={notification.priority}
                size="small"
                color={getPriorityColor() as any}
                variant="outlined"
              />
            )}
            
            {onDismiss && (
              <IconButton size="small" onClick={handleDismiss}>
                <Close fontSize="small" />
              </IconButton>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        mb: 2,
        bgcolor: getBackgroundColor(),
        cursor: notification.actionUrl ? 'pointer' : 'default',
        '&:hover': {
          bgcolor: 'action.selected',
        },
      }}
      onClick={handleClick}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'transparent' }}>
              {getNotificationIcon()}
            </Avatar>
            
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: notification.isRead ? 'normal' : 'bold',
                }}
              >
                {notification.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatNotificationTime()}
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            {notification.priority !== 'low' && (
              <Chip
                label={notification.priority.toUpperCase()}
                size="small"
                color={getPriorityColor() as any}
                variant={notification.priority === 'critical' ? 'filled' : 'outlined'}
              />
            )}
            
            <Chip
              label={notification.type}
              size="small"
              variant="outlined"
            />
            
            {!notification.isRead && (
              <Chip
                label="NEW"
                size="small"
                color="primary"
              />
            )}
            
            {onDismiss && (
              <IconButton size="small" onClick={handleDismiss}>
                <Close />
              </IconButton>
            )}
          </Box>
        </Box>
        
        <Typography variant="body1" paragraph>
          {notification.body}
        </Typography>
        
        {notification.actionUrl && (
          <Box display="flex" justifyContent="flex-end">
            <Button
              size="small"
              endIcon={<OpenInNew />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(notification.actionUrl!);
              }}
            >
              View Details
            </Button>
          </Box>
        )}
        
        {notification.metadata && Object.keys(notification.metadata).length > 0 && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Additional Information:
            </Typography>
            {Object.entries(notification.metadata).map(([key, value]) => (
              <Typography key={key} variant="caption" display="block">
                <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong>{' '}
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </Typography>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationItem;