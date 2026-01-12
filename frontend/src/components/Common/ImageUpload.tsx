import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Card,
  CardMedia,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  PhotoCamera as CameraIcon,
} from '@mui/icons-material';

interface ImageUploadProps {
  value?: File | string | null;
  onChange: (file: File | null) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  preview?: boolean;
  disabled?: boolean;
  label?: string;
  helperText?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onError,
  accept = 'image/jpeg,image/png,image/webp',
  maxSize = 5, // 5MB default
  preview = true,
  disabled = false,
  label = 'Upload Image',
  helperText = 'JPEG, PNG, WebP formats supported. Max 5MB.',
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSize}MB`;
    }

    // Check file type
    const allowedTypes = accept.split(',').map(type => type.trim());
    const fileType = file.type;
    
    if (!allowedTypes.includes(fileType)) {
      return `File type not supported. Allowed types: ${allowedTypes.join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    setError('');
    setLoading(true);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (onError) onError(validationError);
      setLoading(false);
      return;
    }

    // Create image preview to validate it's a valid image
    const img = new Image();
    img.onload = () => {
      onChange(file);
      setLoading(false);
    };
    img.onerror = () => {
      const errorMsg = 'Invalid image file';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      setLoading(false);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    if (disabled) return;

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleRemove = () => {
    onChange(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getPreviewUrl = (): string | null => {
    if (value instanceof File) {
      return URL.createObjectURL(value);
    } else if (typeof value === 'string') {
      return value;
    }
    return null;
  };

  const previewUrl = getPreviewUrl();

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {preview && previewUrl && (
        <Box sx={{ mb: 2 }}>
          <Card sx={{ maxWidth: 300, position: 'relative' }}>
            <CardMedia
              component="img"
              height="200"
              image={previewUrl}
              alt="Cattle image preview"
              sx={{ objectFit: 'cover' }}
            />
            {!disabled && (
              <IconButton
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  },
                }}
                onClick={handleRemove}
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Card>
        </Box>
      )}

      <Box
        sx={{
          border: 2,
          borderStyle: 'dashed',
          borderColor: dragOver ? 'primary.main' : error ? 'error.main' : 'grey.300',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: dragOver ? 'action.hover' : 'transparent',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s ease-in-out',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary">
              Processing image...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <CameraIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography variant="h6" color="text.primary">
              {label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {helperText}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              disabled={disabled}
              sx={{ mt: 1 }}
            >
              Choose File
            </Button>
            <Typography variant="caption" color="text.secondary">
              or drag and drop here
            </Typography>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      {value && !error && (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="success.main">
            ✓ Image selected
          </Typography>
          {!disabled && (
            <Button size="small" onClick={handleRemove} color="error">
              Remove
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ImageUpload;