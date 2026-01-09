import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Button,
} from '@mui/material';
import {
  Send,
  AttachFile,
  Image,
  Close,
  Download,
} from '@mui/icons-material';
import { consultationAPI } from '../../services/api';
import { ChatMessage, Consultation } from '../../types';

interface ChatInterfaceProps {
  consultation: Consultation;
  onMessageSent?: () => void;
  onSessionEnd?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  consultation,
  onMessageSent,
  onSessionEnd,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    
    // Set up real-time message updates (WebSocket would go here)
    const interval = setInterval(loadMessages, 5000); // Poll every 5 seconds for demo
    
    return () => clearInterval(interval);
  }, [consultation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await consultationAPI.getMessages(consultation.id);
      let messagesData = response.data;
      
      // Handle paginated response
      if (messagesData && typeof messagesData === 'object' && 'results' in messagesData) {
        messagesData = messagesData.results;
      }
      
      setMessages(Array.isArray(messagesData) ? messagesData : []);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError('Failed to load chat messages.');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedImage) return;

    try {
      setLoading(true);
      setError('');

      await consultationAPI.sendMessage(consultation.id, newMessage, selectedImage || undefined);
      
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      
      // Reload messages to get the new one
      await loadMessages();
      
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size must be less than 5MB');
        return;
      }
      
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isOwnMessage = (message: ChatMessage) => {
    // In a real app, you'd compare with current user ID
    return message.senderName !== 'Dr. ' + consultation.veterinarianId;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              Dr
            </Avatar>
            <Box>
              <Typography variant="h6">
                Dr. Veterinarian
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={isConnected ? 'Online' : 'Offline'}
                  color={isConnected ? 'success' : 'default'}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  Consultation #{consultation.id.slice(-6)}
                </Typography>
              </Box>
            </Box>
          </Box>
          
          {consultation.status === 'in_progress' && (
            <Button
              variant="outlined"
              color="error"
              onClick={onSessionEnd}
              size="small"
            >
              End Session
            </Button>
          )}
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      {/* Messages Area */}
      <Paper sx={{ flexGrow: 1, p: 2, overflow: 'auto', mb: 1 }}>
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No messages yet. Start the conversation!
            </Typography>
          </Box>
        ) : (
          <Box>
            {messages.map((message, index) => (
              <Box key={message.id} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: isOwnMessage(message) ? 'flex-end' : 'flex-start',
                    mb: 1,
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '70%',
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: isOwnMessage(message) ? 'primary.main' : 'grey.100',
                      color: isOwnMessage(message) ? 'primary.contrastText' : 'text.primary',
                    }}
                  >
                    {!isOwnMessage(message) && (
                      <Typography variant="caption" fontWeight="bold" display="block">
                        {message.senderName}
                      </Typography>
                    )}
                    
                    {message.type === 'image' && message.imageUrl && (
                      <Box sx={{ mb: 1 }}>
                        <img
                          src={message.imageUrl}
                          alt="Shared image"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            borderRadius: '8px',
                          }}
                        />
                      </Box>
                    )}
                    
                    <Typography variant="body2">
                      {message.message}
                    </Typography>
                    
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        textAlign: 'right',
                        mt: 0.5,
                        opacity: 0.7,
                      }}
                    >
                      {formatMessageTime(message.timestamp)}
                    </Typography>
                  </Box>
                </Box>
                
                {index < messages.length - 1 && 
                 new Date(messages[index + 1].timestamp).getDate() !== new Date(message.timestamp).getDate() && (
                  <Divider sx={{ my: 2 }}>
                    <Chip label={new Date(messages[index + 1].timestamp).toLocaleDateString()} size="small" />
                  </Divider>
                )}
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Paper>

      {/* Image Preview */}
      {imagePreview && (
        <Paper sx={{ p: 2, mb: 1 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <img
              src={imagePreview}
              alt="Preview"
              style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
            />
            <Typography variant="body2" flexGrow={1}>
              {selectedImage?.name}
            </Typography>
            <IconButton size="small" onClick={removeSelectedImage}>
              <Close />
            </IconButton>
          </Box>
        </Paper>
      )}

      {/* Message Input */}
      <Paper sx={{ p: 2 }}>
        <Box display="flex" alignItems="flex-end" gap={1}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading || consultation.status !== 'in_progress'}
            variant="outlined"
            size="small"
          />
          
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
          
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || consultation.status !== 'in_progress'}
          >
            <Image />
          </IconButton>
          
          <IconButton
            onClick={handleSendMessage}
            disabled={loading || (!newMessage.trim() && !selectedImage) || consultation.status !== 'in_progress'}
            color="primary"
          >
            {loading ? <CircularProgress size={24} /> : <Send />}
          </IconButton>
        </Box>
        
        {consultation.status !== 'in_progress' && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            This consultation has ended. You can no longer send messages.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default ChatInterface;