import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  NotificationsOff,
  MarkEmailRead,
  Settings,
  Clear,
  LocalHospital,
  Schedule,
  Warning,
  Info,
  CheckCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../../services/api';
import { Notification } from '../../types';

interface NotificationCenterProps {
  onNotificationClick?: (notification: Notification) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onNotificationClick,
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    
    // Set up real-time updates (WebSocket would go here)
    const interval = setInterval(loadNotifications, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const count = notifications.filter(n => !n.isRead).length;
    setUnreadCount(count);
  }, [notifications]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await notificationAPI.list();
      let notificationsData = response.data;
      
      // Handle paginated response
      if (notificationsData && typeof notificationsData === 'object' && 'results' in notificationsData) {
        notificationsData = notificationsData.results;
      }
      
      setNotifications(Array.isArray(notificationsData) ? notificationsData : []);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read if not already read
      if (!notification.isRead) {
        await notificationAPI.markAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
      }
      
      // Navigate to action URL if provided
      if (notification.actionUrl) {
        navigate(notification.actionUrl);
      }
      
      // Call custom handler if provided
      if (onNotificationClick) {
        onNotificationClick(notification);
      }
      
      handleMenuClose();
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      handleMenuClose();
    } catch (err: any) {
      console.error('Failed to mark all as read:', err);
      setError('Failed to mark all notifications as read.');
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'critical') {
      return <Warning color="error" />;
    }
    
    switch (type) {
      case 'reminder':
        return <Schedule color="info" />;
      case 'alert':
        return <NotificationsActive color="warning" />;
      case 'message':
        return <LocalHospital color="primary" />;
      case 'system':
        return <Info color="action" />;
      default:
        return <Notifications color="action" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const formatNotificationTime = (createdAt: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(createdAt).toLocaleDateString();
  };

  const recentNotifications = notifications.slice(0, 10); // Show last 10 notifications

  return (
    <Box>
      <IconButton
        onClick={handleMenuOpen}
        color="inherit"
        aria-label="notifications"
      >
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <NotificationsActive /> : <Notifications />}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { width: 400, maxHeight: 600 }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Notifications
            </Typography>
            <Box display="flex" gap={1}>
              {unreadCount > 0 && (
                <Button
                  size="small"
                  startIcon={<MarkEmailRead />}
                  onClick={handleMarkAllAsRead}
                >
                  Mark all read
                </Button>
              )}
              <IconButton
                size="small"
                onClick={() => {
                  navigate('/notifications/settings');
                  handleMenuClose();
                }}
              >
                <Settings />
              </IconButton>
            </Box>
          </Box>
          
          {unreadCount > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ m: 1 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress size={24} />
          </Box>
        ) : recentNotifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsOff sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 400, overflow: 'auto' }}>
            {recentNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  <ListItemIcon>
                    {getNotificationIcon(notification.type, notification.priority)}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: notification.isRead ? 'normal' : 'bold',
                            flex: 1,
                            mr: 1,
                          }}
                        >
                          {notification.title}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {notification.priority !== 'low' && (
                            <Chip
                              label={notification.priority}
                              size="small"
                              color={getPriorityColor(notification.priority) as any}
                              variant="outlined"
                            />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {formatNotificationTime(notification.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {notification.body}
                      </Typography>
                    }
                  />
                </ListItem>
                
                {index < recentNotifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {/* Footer */}
        {notifications.length > 10 && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Button
              size="small"
              onClick={() => {
                navigate('/notifications');
                handleMenuClose();
              }}
            >
              View all notifications
            </Button>
          </Box>
        )}
      </Menu>
    </Box>
  );
};

export default NotificationCenter;