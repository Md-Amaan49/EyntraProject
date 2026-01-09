import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Avatar,
  Chip,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Videocam,
  VideocamOff,
  Mic,
  MicOff,
  CallEnd,
  ScreenShare,
  StopScreenShare,
  Settings,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import { Consultation } from '../../types';

interface VideoCallInterfaceProps {
  consultation: Consultation;
  onCallEnd?: () => void;
  onConnectionChange?: (connected: boolean) => void;
}

const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({
  consultation,
  onCallEnd,
  onConnectionChange,
}) => {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('good');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState('');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeCall();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(connectionStatus === 'connected');
    }
  }, [connectionStatus, onConnectionChange]);

  const initializeCall = async () => {
    try {
      setError('');
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Simulate connection process
      setTimeout(() => {
        setConnectionStatus('connected');
        
        // Simulate remote video (in real app, this would come from WebRTC)
        if (remoteVideoRef.current) {
          // Create a mock remote stream for demo
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Dr. Veterinarian', canvas.width / 2, canvas.height / 2);
            ctx.fillText('(Demo Video)', canvas.width / 2, canvas.height / 2 + 30);
          }
          
          const mockStream = canvas.captureStream();
          remoteVideoRef.current.srcObject = mockStream;
        }
      }, 2000);
      
    } catch (err: any) {
      console.error('Failed to initialize call:', err);
      setError('Failed to access camera/microphone. Please check permissions.');
      setConnectionStatus('disconnected');
    }
  };

  const cleanup = () => {
    // Stop all media streams
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        
        // Listen for screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          initializeCall(); // Restart camera
        };
      } else {
        setIsScreenSharing(false);
        initializeCall(); // Restart camera
      }
    } catch (err: any) {
      console.error('Screen share failed:', err);
      setError('Failed to start screen sharing.');
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleCallEnd = () => {
    cleanup();
    if (onCallEnd) {
      onCallEnd();
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'disconnected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'warning';
      case 'poor':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box ref={containerRef} sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'black' }}>
      {error && (
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Paper sx={{ p: 2, m: 1, bgcolor: 'rgba(255,255,255,0.9)' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>Dr</Avatar>
            <Box>
              <Typography variant="h6">Dr. Veterinarian</Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={connectionStatus}
                  color={getConnectionStatusColor() as any}
                  size="small"
                />
                <Chip
                  label={`${connectionQuality} quality`}
                  color={getQualityColor() as any}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Box>
          </Box>
          
          <Typography variant="caption" color="text.secondary">
            Consultation #{consultation.id.slice(-6)}
          </Typography>
        </Box>
      </Paper>

      {/* Video Area */}
      <Box sx={{ flexGrow: 1, position: 'relative', m: 1 }}>
        <Grid container spacing={1} sx={{ height: '100%' }}>
          {/* Remote Video (Main) */}
          <Grid item xs={12} md={9}>
            <Paper sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  backgroundColor: '#333',
                }}
              />
              
              {connectionStatus === 'connecting' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: 'white',
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Connecting to Dr. Veterinarian...
                  </Typography>
                  <Typography variant="body2">
                    Please wait while we establish the connection
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Local Video (Picture-in-Picture) */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  backgroundColor: '#333',
                  transform: 'scaleX(-1)', // Mirror effect
                }}
              />
              
              {!isVideoEnabled && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: 'white',
                  }}
                >
                  <VideocamOff sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="body2">Camera Off</Typography>
                </Box>
              )}
              
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  color: 'white',
                  bgcolor: 'rgba(0,0,0,0.5)',
                  px: 1,
                  borderRadius: 1,
                }}
              >
                You
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 2, m: 1, bgcolor: 'rgba(255,255,255,0.9)' }}>
        <Box display="flex" justifyContent="center" alignItems="center" gap={2}>
          <IconButton
            onClick={toggleVideo}
            color={isVideoEnabled ? 'primary' : 'error'}
            sx={{ bgcolor: isVideoEnabled ? 'primary.light' : 'error.light' }}
          >
            {isVideoEnabled ? <Videocam /> : <VideocamOff />}
          </IconButton>
          
          <IconButton
            onClick={toggleAudio}
            color={isAudioEnabled ? 'primary' : 'error'}
            sx={{ bgcolor: isAudioEnabled ? 'primary.light' : 'error.light' }}
          >
            {isAudioEnabled ? <Mic /> : <MicOff />}
          </IconButton>
          
          <IconButton
            onClick={toggleScreenShare}
            color={isScreenSharing ? 'secondary' : 'default'}
            sx={{ bgcolor: isScreenSharing ? 'secondary.light' : 'grey.200' }}
          >
            {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
          </IconButton>
          
          <IconButton
            onClick={toggleFullscreen}
            color="default"
            sx={{ bgcolor: 'grey.200' }}
          >
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
          
          <IconButton
            onClick={() => setSettingsOpen(true)}
            color="default"
            sx={{ bgcolor: 'grey.200' }}
          >
            <Settings />
          </IconButton>
          
          <Button
            variant="contained"
            color="error"
            startIcon={<CallEnd />}
            onClick={handleCallEnd}
            sx={{ ml: 2 }}
          >
            End Call
          </Button>
        </Box>
      </Paper>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Call Settings</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Video Quality: {connectionQuality}
          </Typography>
          <Typography variant="body2" paragraph>
            Connection Status: {connectionStatus}
          </Typography>
          <Typography variant="body2" paragraph>
            Camera: {isVideoEnabled ? 'Enabled' : 'Disabled'}
          </Typography>
          <Typography variant="body2" paragraph>
            Microphone: {isAudioEnabled ? 'Enabled' : 'Disabled'}
          </Typography>
          <Typography variant="body2" paragraph>
            Screen Sharing: {isScreenSharing ? 'Active' : 'Inactive'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VideoCallInterface;