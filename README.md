# Cattle Health Monitoring System

A comprehensive AI-powered platform for cattle health monitoring, disease prediction, and veterinary consultation services. The system combines advanced machine learning models with real-time consultation capabilities to provide farmers with intelligent livestock health management.

## 🚀 Features

### Core Functionality
- **Cattle Profile Management**: Complete digital records for individual animals
- **AI Disease Detection**: Advanced image analysis using Roboflow models for disease identification
- **Symptom Analysis**: Text-based symptom evaluation and disease prediction
- **Treatment Recommendations**: Evidence-based treatment protocols for various conditions
- **Health History Tracking**: Comprehensive medical records with export capabilities
- **Real-time Notifications**: Automated alerts for health events and follow-ups

### AI Capabilities
- **Lumpy Skin Disease Detection**: Specialized Roboflow model for accurate LSD identification
- **Multi-modal Analysis**: Combined image and symptom analysis for improved accuracy
- **Confidence Scoring**: Reliability metrics for all AI predictions
- **Continuous Learning**: Feedback system for model improvement

### User Management
- **Role-based Access**: Farmers, Veterinarians, and Administrators
- **Secure Authentication**: JWT-based authentication with role permissions
- **Profile Management**: User profiles with specialized dashboards

## 🛠 Technology Stack

### Backend
- **Framework**: Django 4.2 with Django REST Framework
- **Database**: PostgreSQL 15 (production) / SQLite (development)
- **Cache**: Redis 7 for session management and caching
- **Task Queue**: Celery for asynchronous processing
- **Authentication**: JWT with role-based permissions
- **Testing**: Pytest with Hypothesis for property-based testing

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Real-time**: Socket.io client for live updates

### AI Service
- **Framework**: Flask 2.3
- **ML Platform**: Roboflow for disease detection models
- **Image Processing**: OpenCV, Pillow
- **Model Serving**: TensorFlow 2.13, scikit-learn
- **Computer Vision**: Specialized models for livestock disease detection

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL with health checks
- **Caching**: Redis with persistence
- **Process Management**: Celery workers for background tasks

## 📋 Prerequisites

- **Docker & Docker Compose** (recommended for deployment)
- **Python 3.11+** (for local development)
- **Node.js 18+** (for frontend development)
- **PostgreSQL 15** (for production database)
- **Redis 7** (for caching and task queue)

## 🚀 Quick Start (Docker - Recommended)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd cattle-health-system
cp .env.example .env
```

### 2. Configure Environment
Edit `.env` file with your settings:
```env
# Database
DB_NAME=cattle_health_db
DB_USER=postgres
DB_PASSWORD=your_secure_password

# AI Service
ROBOFLOW_API_KEY=your_roboflow_api_key
ROBOFLOW_MODEL_ID=your_model_id

# Security
SECRET_KEY=your_django_secret_key
JWT_SECRET_KEY=your_jwt_secret
```

### 3. Start All Services
```bash
docker-compose up -d
```

### 4. Initialize Database
```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

### 5. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin
- **AI Service**: http://localhost:5000

## 🔧 Local Development Setup

### Backend Development
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

### AI Service Development
```bash
cd ai_service
pip install -r requirements.txt
python app_roboflow.py
```

## 📁 Project Structure

```
cattle-health-system/
├── backend/                    # Django REST API
│   ├── cattle_health/         # Project settings
│   ├── users/                 # Authentication & user management
│   ├── cattle/                # Cattle profile management
│   ├── health/                # Health assessments & disease models
│   ├── ai_service/            # AI integration endpoints
│   ├── dashboard/             # Dashboard data aggregation
│   ├── consultations/         # Veterinary consultation system
│   ├── payments/              # Payment processing
│   └── notifications/         # Notification system
├── frontend/                   # React TypeScript application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Auth/         # Authentication components
│   │   │   ├── Cattle/       # Cattle management UI
│   │   │   ├── Health/       # Health assessment UI
│   │   │   ├── Dashboard/    # Dashboard components
│   │   │   └── Layout/       # Layout components
│   │   ├── services/         # API service layer
│   │   ├── types/            # TypeScript type definitions
│   │   └── App.tsx           # Main application component
│   └── package.json
├── ai_service/                # Flask AI microservice
│   ├── models/               # AI model implementations
│   │   ├── roboflow_detector.py    # Roboflow integration
│   │   ├── image_classifier.py     # Image classification
│   │   ├── symptom_analyzer.py     # Symptom analysis
│   │   └── multimodal_predictor.py # Combined analysis
│   ├── app_roboflow.py       # Main Flask application
│   └── requirements.txt
├── docker-compose.yml         # Multi-service orchestration
└── README.md
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest                        # Run all tests
pytest -m property           # Run property-based tests
pytest --cov                 # Run with coverage
```

### Frontend Tests
```bash
cd frontend
npm test                     # Run React tests
npm run test:coverage        # Run with coverage
```

### AI Service Tests
```bash
cd ai_service
python -m pytest tests/     # Run AI service tests
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/refresh/` - Token refresh

### Cattle Management
- `GET /api/cattle/` - List cattle
- `POST /api/cattle/` - Add new cattle
- `GET /api/cattle/{id}/` - Get cattle details
- `PUT /api/cattle/{id}/` - Update cattle

### Health Assessment
- `POST /api/health/assess/` - Create health assessment
- `GET /api/health/assessments/` - List assessments
- `POST /api/ai/predict/` - AI disease prediction

### Dashboard
- `GET /api/dashboard/stats/` - Dashboard statistics
- `GET /api/dashboard/recent-activities/` - Recent activities

## 🤖 AI Model Information

### Roboflow Integration
- **Model**: Lumpy Skin Disease Detection
- **Accuracy**: 85%+ confidence for positive detections
- **Input**: High-resolution cattle images
- **Output**: Disease classification with confidence scores

### Supported Diseases
- Lumpy Skin Disease (LSD)
- Foot and Mouth Disease (planned)
- Mastitis (planned)
- Respiratory infections (planned)

## 🚀 Deployment

### Production Deployment
1. Set up production environment variables
2. Configure PostgreSQL database
3. Set up Redis instance
4. Deploy using Docker Compose:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables
```env
# Production settings
DEBUG=False
ALLOWED_HOSTS=your-domain.com
DATABASE_URL=postgresql://user:pass@host:port/db

# AI Service
ROBOFLOW_API_KEY=your_production_key
AI_SERVICE_URL=https://ai.your-domain.com

# Security
SECRET_KEY=your_production_secret
CORS_ALLOWED_ORIGINS=https://your-domain.com
```

## 📊 Monitoring & Logging

- **Health Checks**: Built-in health check endpoints
- **Logging**: Structured logging for all services
- **Metrics**: Performance monitoring for AI predictions
- **Error Tracking**: Comprehensive error logging and reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Follow the coding standards and write tests
4. Ensure all tests pass: `pytest && npm test`
5. Submit a pull request

### Development Guidelines
- Follow PEP 8 for Python code
- Use TypeScript for all frontend code
- Write tests for new features
- Update documentation for API changes

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in `/docs`

## 🔄 Version History

- **v2.0.0** - Roboflow AI integration, enhanced UI
- **v1.5.0** - Multi-modal disease prediction
- **v1.0.0** - Initial release with basic functionality

---

**Built with ❤️ for livestock health management**