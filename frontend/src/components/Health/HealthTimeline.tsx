import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Collapse,
  Alert,
  CircularProgress,
  Avatar,
} from '@mui/material';
import {
  LocalHospital,
  Psychology,
  Medication,
  VideoCall,
  ExpandMore,
  ExpandLess,
  Warning,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { HealthEvent } from '../../types';
import { cattleAPI } from '../../services/api';

interface HealthTimelineProps {
  cattleId: string;
  filters?: {
    dateRange?: { start: Date; end: Date };
    eventTypes?: string[];
    severity?: string[];
  };
}

const HealthTimeline: React.FC<HealthTimelineProps> = ({ cattleId, filters }) => {
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadHealthHistory();
  }, [cattleId, filters]);

  const loadHealthHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await cattleAPI.getHealthHistory(cattleId, filters);
      let historyData = response.data;
      
      // Handle paginated response
      if (historyData && typeof historyData === 'object' && 'results' in historyData) {
        historyData = historyData.results;
      }
      
      // Sort events chronologically (newest first)
      const sortedEvents = Array.isArray(historyData) 
        ? historyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [];
      
      setEvents(sortedEvents);
    } catch (err: any) {
      console.error('Failed to load health history:', err);
      setError('Failed to load health history. Please try again.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'symptom':
        return <Warning />;
      case 'prediction':
        return <Psychology />;
      case 'treatment':
        return <Medication />;
      case 'consultation':
        return <VideoCall />;
      default:
        return <LocalHospital />;
    }
  };

  const getEventColor = (type: string, severity?: string) => {
    if (severity === 'critical' || severity === 'severe') return 'error';
    if (severity === 'moderate') return 'warning';
    if (type === 'treatment') return 'success';
    if (type === 'consultation') return 'info';
    return 'primary';
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'critical':
      case 'severe':
        return <Error color="error" />;
      case 'moderate':
        return <Warning color="warning" />;
      case 'mild':
        return <CheckCircle color="success" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <LocalHospital sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Health History
          </Typography>
          <Typography color="text.secondary">
            No health events have been recorded for this cattle yet.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {events.map((event, index) => (
        <Box key={event.id} sx={{ display: 'flex', mb: 3 }}>
          {/* Timeline dot and connector */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
            <Avatar 
              sx={{ 
                bgcolor: `${getEventColor(event.type, event.severity)}.main`,
                width: 40,
                height: 40
              }}
            >
              {getEventIcon(event.type)}
            </Avatar>
            {index < events.length - 1 && (
              <Box 
                sx={{ 
                  width: 2, 
                  height: 40, 
                  bgcolor: 'divider', 
                  mt: 1 
                }} 
              />
            )}
          </Box>
          
          {/* Timeline content */}
          <Box sx={{ flex: 1 }}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="h6" component="h3">
                        {event.title}
                      </Typography>
                      {event.severity && getSeverityIcon(event.severity)}
                      <Chip 
                        label={event.type} 
                        size="small" 
                        color={getEventColor(event.type, event.severity) as any}
                        variant="outlined"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {new Date(event.date).toLocaleString()}
                      {event.veterinarian && ` • Dr. ${event.veterinarian}`}
                    </Typography>
                    
                    <Typography variant="body2" paragraph>
                      {event.description}
                    </Typography>
                  </Box>
                  
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <IconButton
                      size="small"
                      onClick={() => toggleEventExpansion(event.id)}
                      aria-label="expand details"
                    >
                      {expandedEvents.has(event.id) ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  )}
                </Box>
                
                <Collapse in={expandedEvents.has(event.id)}>
                  {event.metadata && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Additional Details:
                      </Typography>
                      {Object.entries(event.metadata).map(([key, value]) => (
                        <Typography key={key} variant="body2" sx={{ mb: 0.5 }}>
                          <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong>{' '}
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Collapse>
              </CardContent>
            </Card>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default HealthTimeline;