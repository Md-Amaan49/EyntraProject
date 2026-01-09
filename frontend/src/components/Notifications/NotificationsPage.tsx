import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Alert,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Notifications,
  Settings,
  Search,
  FilterList,
  MarkEmailRead,
  Clear,
} from '@mui/icons-material';
import { notificationAPI } from '../../services/api';
import { Notification } from '../../types';
import NotificationItem from './NotificationItem';
import NotificationPreferences from './NotificationPreferences';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notifications-tabpanel-${index}`}
      aria-labelledby={`notifications-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (err: any) {
      console.error('Failed to mark as read:', err);
      setError('Failed to mark notification as read.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err: any) {
      console.error('Failed to mark all as read:', err);
      setError('Failed to mark all notifications as read.');
    }
  };

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterPriority('all');
    setFilterRead('all');
  };

  const filteredNotifications = notifications.filter(notification => {
    // Search filter
    if (searchTerm && !notification.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !notification.body.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Type filter
    if (filterType !== 'all' && notification.type !== filterType) {
      return false;
    }
    
    // Priority filter
    if (filterPriority !== 'all' && notification.priority !== filterPriority) {
      return false;
    }
    
    // Read status filter
    if (filterRead === 'unread' && notification.isRead) {
      return false;
    }
    if (filterRead === 'read' && !notification.isRead) {
      return false;
    }
    
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const hasActiveFilters = searchTerm || filterType !== 'all' || filterPriority !== 'all' || filterRead !== 'all';

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Notifications
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="notifications tabs">
            <Tab
              icon={<Notifications />}
              label={`All Notifications ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
              id="notifications-tab-0"
              aria-controls="notifications-tabpanel-0"
            />
            <Tab
              icon={<Settings />}
              label="Preferences"
              id="notifications-tab-1"
              aria-controls="notifications-tabpanel-1"
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Filters and Actions */}
          <Box sx={{ mb: 3 }}>
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" mb={2}>
              <TextField
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 250 }}
              />
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  label="Type"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="reminder">Reminders</MenuItem>
                  <MenuItem value="alert">Alerts</MenuItem>
                  <MenuItem value="message">Messages</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filterPriority}
                  label="Priority"
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <MenuItem value="all">All Priorities</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterRead}
                  label="Status"
                  onChange={(e) => setFilterRead(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="unread">Unread</MenuItem>
                  <MenuItem value="read">Read</MenuItem>
                </Select>
              </FormControl>
              
              {hasActiveFilters && (
                <Button
                  startIcon={<Clear />}
                  onClick={clearFilters}
                  size="small"
                >
                  Clear Filters
                </Button>
              )}
            </Box>
            
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="body2" color="text.secondary">
                  {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                  {hasActiveFilters && ` (filtered from ${notifications.length})`}
                </Typography>
                
                {hasActiveFilters && (
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {searchTerm && (
                      <Chip
                        label={`Search: "${searchTerm}"`}
                        size="small"
                        onDelete={() => setSearchTerm('')}
                      />
                    )}
                    {filterType !== 'all' && (
                      <Chip
                        label={`Type: ${filterType}`}
                        size="small"
                        onDelete={() => setFilterType('all')}
                      />
                    )}
                    {filterPriority !== 'all' && (
                      <Chip
                        label={`Priority: ${filterPriority}`}
                        size="small"
                        onDelete={() => setFilterPriority('all')}
                      />
                    )}
                    {filterRead !== 'all' && (
                      <Chip
                        label={`Status: ${filterRead}`}
                        size="small"
                        onDelete={() => setFilterRead('all')}
                      />
                    )}
                  </Box>
                )}
              </Box>
              
              {unreadCount > 0 && (
                <Button
                  startIcon={<MarkEmailRead />}
                  onClick={handleMarkAllAsRead}
                  size="small"
                >
                  Mark All Read
                </Button>
              )}
            </Box>
          </Box>

          {/* Notifications List */}
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Notifications sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {hasActiveFilters ? 'No notifications match your filters' : 'No notifications yet'}
              </Typography>
              <Typography color="text.secondary">
                {hasActiveFilters 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'You\'ll see notifications about your cattle\'s health and appointments here.'
                }
              </Typography>
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  sx={{ mt: 2 }}
                >
                  Clear Filters
                </Button>
              )}
            </Box>
          ) : (
            <Box>
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDismiss={handleDismiss}
                />
              ))}
            </Box>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <NotificationPreferences />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default NotificationsPage;