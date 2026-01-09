import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Avatar,
  Grid,
  Divider,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { User } from '../../types';
import { authAPI } from '../../services/api';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      // Get user data from localStorage first
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setFormData({
          name: parsedUser.name,
          phone: parsedUser.phone,
        });
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      setFormData({
        name: user.name,
        phone: user.phone,
      });
    }
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // In a real app, you would call an API to update the profile
      // For now, we'll just update localStorage
      if (user) {
        const updatedUser = {
          ...user,
          name: formData.name,
          phone: formData.phone,
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setIsEditing(false);
        setSuccess('Profile updated successfully!');
      }
    } catch (err: any) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'primary';
      case 'veterinarian':
        return 'secondary';
      case 'admin':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Cattle Owner';
      case 'veterinarian':
        return 'Veterinarian';
      case 'admin':
        return 'Administrator';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Unable to load user profile. Please try logging in again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={3}>
            {/* Profile Avatar and Basic Info */}
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: '3rem',
                  }}
                >
                  <PersonIcon fontSize="large" />
                </Avatar>
                
                <Typography variant="h5" gutterBottom>
                  {user.name}
                </Typography>
                
                <Chip
                  label={getRoleLabel(user.role)}
                  color={getRoleColor(user.role) as any}
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="body2" color="text.secondary">
                  Member since {new Date(user.created_at || Date.now()).toLocaleDateString()}
                </Typography>
              </Box>
            </Grid>

            {/* Profile Details */}
            <Grid item xs={12} md={8}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Profile Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    variant={isEditing ? 'outlined' : 'filled'}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={user.email}
                    disabled
                    variant="filled"
                    helperText="Email cannot be changed"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    variant={isEditing ? 'outlined' : 'filled'}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Role"
                    value={getRoleLabel(user.role)}
                    disabled
                    variant="filled"
                    helperText="Role cannot be changed"
                  />
                </Grid>
              </Grid>

              {/* Action Buttons */}
              <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                {!isEditing ? (
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleEdit}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? <CircularProgress size={20} /> : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </Box>
            </Grid>
          </Grid>             
        </CardContent>
      </Card>

      {/* Account Statistics */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Account Statistics
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  0
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cattle Registered
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="secondary">
                  0
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Health Reports
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  0
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Consultations
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfilePage;