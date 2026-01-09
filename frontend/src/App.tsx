import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

// Components
import Header from './components/Layout/Header';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import Dashboard from './components/Dashboard/Dashboard';
import SymptomSubmissionForm from './components/Health/SymptomSubmissionForm';
import ProfilePage from './components/Profile/ProfilePage';
import AIDiseaseDetection from './components/Health/AIDiseaseDetection';
import EnhancedDiseaseDetection from './components/Health/EnhancedDiseaseDetection';
import HealthHistoryPage from './components/Health/HealthHistoryPage';
import VeterinarianBrowser from './components/Veterinarian/VeterinarianBrowser';
import ConsultationList from './components/Consultation/ConsultationList';
import ConsultationSession from './components/Consultation/ConsultationSession';
import NotificationsPage from './components/Notifications/NotificationsPage';
import NotificationPreferences from './components/Notifications/NotificationPreferences';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Types
import { User } from './types';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32',
    },
    secondary: {
      main: '#ff6f00',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Landing Page Component
const LandingPage: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        px: 3,
      }}
    >
      <Box sx={{ mb: 4 }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#2e7d32' }}>
          Cattle Health System
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#666', maxWidth: '600px' }}>
          AI-powered disease prediction and 24/7 veterinary consultation platform.
          Monitor your cattle's health, get instant AI analysis, and connect with
          certified veterinarians.
        </p>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ 
          padding: '2rem', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          maxWidth: '300px'
        }}>
          <h3 style={{ color: '#2e7d32', marginBottom: '1rem' }}>🤖 AI Disease Prediction</h3>
          <p>Upload symptoms and images for instant AI-powered disease analysis</p>
        </div>
        
        <div style={{ 
          padding: '2rem', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          maxWidth: '300px'
        }}>
          <h3 style={{ color: '#2e7d32', marginBottom: '1rem' }}>💊 Treatment Recommendations</h3>
          <p>Get both traditional and modern treatment options for your cattle</p>
        </div>
        
        <div style={{ 
          padding: '2rem', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          maxWidth: '300px'
        }}>
          <h3 style={{ color: '#2e7d32', marginBottom: '1rem' }}>👨‍⚕️ Expert Veterinarians</h3>
          <p>Connect with certified veterinarians for professional consultation</p>
        </div>
      </Box>
    </Box>
  );
};

// App Content Component (needs to be inside AuthProvider)
const AppContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header user={user} />
      
      <Box sx={{ flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/health/submit"
            element={
              <ProtectedRoute>
                <SymptomSubmissionForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/health/ai-detection"
            element={
              <ProtectedRoute>
                <AIDiseaseDetection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/health/enhanced-detection"
            element={
              <ProtectedRoute>
                <EnhancedDiseaseDetection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/health/history/:cattleId"
            element={
              <ProtectedRoute>
                <HealthHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/veterinarians"
            element={
              <ProtectedRoute>
                <VeterinarianBrowser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consultations"
            element={
              <ProtectedRoute>
                <ConsultationList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consultations/:consultationId"
            element={
              <ProtectedRoute>
                <ConsultationSession />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications/settings"
            element={
              <ProtectedRoute>
                <NotificationPreferences />
              </ProtectedRoute>
            }
          />
          
          {/* Redirect to dashboard if logged in, otherwise to landing */}
          <Route
            path="*"
            element={
              user ? <Navigate to="/dashboard" /> : <Navigate to="/" />
            }
          />
        </Routes>
      </Box>
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
