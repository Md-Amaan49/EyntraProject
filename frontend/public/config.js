// Debug configuration
window.APP_CONFIG = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  AI_SERVICE_URL: process.env.REACT_APP_AI_SERVICE_URL || 'http://localhost:5000',
  NODE_ENV: process.env.NODE_ENV || 'development'
};