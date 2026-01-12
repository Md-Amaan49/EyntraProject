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
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { INDIAN_STATES, getCitiesByState, type State, type City } from '../../data/locations';

const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    role: 'owner',
    state: '',
    city: '',
    address: '',
    pincode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableCities, setAvailableCities] = useState<City[]>([]);

  // Update cities when state changes
  useEffect(() => {
    if (formData.state) {
      const cities = getCitiesByState(formData.state);
      setAvailableCities(cities);
      // Reset city selection when state changes
      if (formData.city && !cities.find(city => city.id === formData.city)) {
        setFormData(prev => ({ ...prev, city: '' }));
      }
    } else {
      setAvailableCities([]);
      setFormData(prev => ({ ...prev, city: '' }));
    }
  }, [formData.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    // Check for common passwords
    const commonPasswords = ['password', 'testpass', '12345678', 'qwerty123'];
    if (commonPasswords.some(common => formData.password.toLowerCase().includes(common))) {
      setError('Please choose a stronger password. Avoid common passwords.');
      setLoading(false);
      return;
    }

    try {
      await authAPI.register({
        email: formData.email,
        password: formData.password,
        password_confirm: formData.confirmPassword,
        name: formData.name,
        phone: formData.phone,
        role: formData.role,
        state: formData.state,
        city: formData.city,
        address: formData.address,
        pincode: formData.pincode,
      });

      // Registration successful, redirect to login
      navigate('/login', { 
        state: { message: 'Registration successful! Please log in.' }
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err.response?.data) {
        const data = err.response.data;
        if (data.message) {
          errorMessage = data.message;
        } else if (data.email && Array.isArray(data.email)) {
          errorMessage = `Email: ${data.email[0]}`;
        } else if (data.phone && Array.isArray(data.phone)) {
          errorMessage = `Phone: ${data.phone[0]}`;
        } else if (data.password && Array.isArray(data.password)) {
          errorMessage = `Password: ${data.password[0]}`;
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else {
          errorMessage = JSON.stringify(data);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
        px: 2,
      }}
    >
      <Card sx={{ maxWidth: 700, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Register
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Create your Cattle Health System account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="+91 9876543210"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    name="role"
                    value={formData.role}
                    onChange={(e) => handleSelectChange('role', e.target.value)}
                    label="Role"
                  >
                    <MenuItem value="owner">Cattle Owner</MenuItem>
                    <MenuItem value="veterinarian">Veterinarian</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>State</InputLabel>
                  <Select
                    name="state"
                    value={formData.state}
                    onChange={(e) => handleSelectChange('state', e.target.value)}
                    label="State"
                  >
                    <MenuItem value="">
                      <em>Select State</em>
                    </MenuItem>
                    {INDIAN_STATES.map((state) => (
                      <MenuItem key={state.id} value={state.id}>
                        {state.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required disabled={!formData.state}>
                  <InputLabel>City</InputLabel>
                  <Select
                    name="city"
                    value={formData.city}
                    onChange={(e) => handleSelectChange('city', e.target.value)}
                    label="City"
                  >
                    <MenuItem value="">
                      <em>{formData.state ? 'Select City' : 'Select State First'}</em>
                    </MenuItem>
                    {availableCities.map((city) => (
                      <MenuItem key={city.id} value={city.id}>
                        {city.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  multiline
                  rows={2}
                  placeholder="Enter your complete address"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="PIN Code"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                  placeholder="123456"
                  inputProps={{ maxLength: 6, pattern: '[0-9]{6}' }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  helperText="Minimum 8 characters, avoid common passwords"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ mt: 2, mb: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Register'}
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Typography variant="body2" align="center">
            Already have an account?{' '}
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/login')}
            >
              Login here
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RegisterForm;