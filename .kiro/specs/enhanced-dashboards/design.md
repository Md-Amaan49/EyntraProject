# Design Document

## Overview

The Enhanced Dashboard System provides role-based interfaces for Farmers, Veterinarians, and Administrators. The system leverages existing Roboflow integration and extends the current React/Django architecture with analytics, real-time updates, and comprehensive data visualization.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Farmer     │  │     Vet      │  │    Admin     │      │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │  Dashboard API  │                        │
│                   │    Service      │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                    Backend (Django)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Predictions  │  │  Analytics   │  │   System     │       │
│  │   Service    │  │   Service    │  │  Monitoring  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                  │                  │               │
│         └──────────────────┴──────────────────┘               │
│                            │                                  │
│                   ┌────────▼────────┐                         │
│                   │    Database     │                         │
│                   │   (PostgreSQL)  │                         │
│                   └─────────────────┘                         │
└───────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Roboflow AI   │
                    │      Service    │
                    └─────────────────┘
```

### Technology Stack

**Frontend:**
- React 18+ with TypeScript
- Material-UI (MUI) for components
- Recharts for data visualization
- React Router for navigation
- Axios for API calls

**Backend:**
- Django 4.x with Django REST Framework
- PostgreSQL for data storage
- Celery for background tasks
- Redis for caching and real-time updates

**External Services:**
- Roboflow API for disease detection
- WebSocket for real-time dashboard updates

## Components and Interfaces

### Frontend Components

#### 1. Farmer Dashboard Components

**FarmerDashboard.tsx**
- Main container component
- Manages state for all child components
- Handles data fetching and refresh

**SummaryCards.tsx**
```typescript
interface SummaryCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: 'success' | 'error' | 'warning' | 'info';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}
```

**PredictionsTable.tsx**
```typescript
interface Prediction {
  id: string;
  cowId: string;
  imageUrl: string;
  predictedClass: string;
  confidence: number;
  timestamp: string;
  isHealthy: boolean;
}

interface PredictionsTableProps {
  predictions: Prediction[];
  onRefresh: () => void;
}
```

**ActionButtons.tsx**
```typescript
interface ActionButtonsProps {
  onUpload: (file: File) => void;
  onCamera: () => void;
  onDownload: () => void;
}
```

**AlertsSection.tsx**
```typescript
interface Alert {
  id: string;
  type: 'disease' | 'low_confidence' | 'recognition_failure';
  message: string;
  severity: 'error' | 'warning' | 'info';
  timestamp: string;
  cowId?: string;
}

interface AlertsSectionProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}
```

#### 2. Vet Dashboard Components

**VetDashboard.tsx**
- Analytics-focused layout
- Chart management and data aggregation

**AnalyticsCharts.tsx**
```typescript
interface ChartData {
  lineChart: {
    date: string;
    cases: number;
  }[];
  pieChart: {
    diseaseType: string;
    count: number;
    percentage: number;
  }[];
  barChart: {
    category: 'healthy' | 'infected';
    count: number;
  }[];
}

interface AnalyticsChartsProps {
  data: ChartData;
  timeRange: '7days' | '30days';
  onTimeRangeChange: (range: '7days' | '30days') => void;
}
```

**DiseaseRecordsTable.tsx**
```typescript
interface DiseaseRecord {
  id: string;
  cowId: string;
  ownerName: string;
  diseaseType: string;
  severity: 'high' | 'medium' | 'low';
  date: string;
  recommendedAction: string;
}

interface DiseaseRecordsTableProps {
  records: DiseaseRecord[];
  onFilter: (filters: FilterCriteria) => void;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
}
```

#### 3. Admin Dashboard Components

**AdminDashboard.tsx**
- System monitoring and performance metrics

**ModelMonitoringPanel.tsx**
```typescript
interface ModelMetrics {
  version: string;
  lastTrainingDate: string;
  accuracy: number;
  errorRate: number;
  predictionLatency: number;
}

interface ModelMonitoringPanelProps {
  metrics: ModelMetrics;
  onRefresh: () => void;
}
```

**APIUsageStats.tsx**
```typescript
interface APIStats {
  totalRequests: number;
  requestsPerDay: number;
  successRate: number;
  errorRate: number;
  averageResponseTime: number;
}

interface APIUsageStatsProps {
  stats: APIStats;
  timeRange: 'today' | 'week' | 'month';
}
```

**LogsViewer.tsx**
```typescript
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  category: 'failed_prediction' | 'invalid_image' | 'low_confidence';
  message: string;
  details: Record<string, any>;
}

interface LogsViewerProps {
  logs: LogEntry[];
  onFilter: (filters: LogFilterCriteria) => void;
  onExport: () => void;
}
```

### Backend API Endpoints

#### Dashboard Analytics API

```python
# GET /api/dashboard/farmer/summary
Response: {
  "total_scanned": int,
  "healthy_count": int,
  "suspected_diseased": int,
  "confirmed_diseased": int,
  "recent_predictions": [Prediction],
  "alerts": [Alert]
}

# GET /api/dashboard/vet/analytics
Query Params: time_range (7days|30days)
Response: {
  "cases_per_day": [{date, count}],
  "disease_distribution": [{type, count, percentage}],
  "healthy_vs_infected": {healthy, infected},
  "disease_records": [DiseaseRecord]
}

# GET /api/dashboard/admin/monitoring
Response: {
  "model_metrics": ModelMetrics,
  "api_stats": APIStats,
  "system_health": SystemHealth
}

# GET /api/dashboard/admin/logs
Query Params: level, category, start_date, end_date
Response: {
  "logs": [LogEntry],
  "total_count": int,
  "page": int,
  "page_size": int
}
```

#### Prediction Management API

```python
# POST /api/predictions/upload
Body: {file: File, cow_id: string}
Response: {prediction_id, result, confidence}

# POST /api/predictions/camera
Body: {image_data: base64, cow_id: string}
Response: {prediction_id, result, confidence}

# GET /api/predictions/report/{prediction_id}
Response: PDF file download
```

## Data Models

### Database Schema

#### 1. Predictions Table
```sql
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cow_id VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    image_url TEXT NOT NULL,
    predicted_class VARCHAR(100) NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    is_healthy BOOLEAN NOT NULL,
    raw_response JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (cow_id) REFERENCES cattle(tag_number)
);

CREATE INDEX idx_predictions_cow_id ON predictions(cow_id);
CREATE INDEX idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX idx_predictions_user_id ON predictions(user_id);
```

#### 2. Disease Records Table
```sql
CREATE TABLE disease_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cow_id VARCHAR(50) NOT NULL,
    prediction_id UUID REFERENCES predictions(id),
    disease_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('high', 'medium', 'low')),
    recommendation TEXT,
    confirmed_by_vet BOOLEAN DEFAULT FALSE,
    vet_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (cow_id) REFERENCES cattle(tag_number)
);

CREATE INDEX idx_disease_records_cow_id ON disease_records(cow_id);
CREATE INDEX idx_disease_records_created_at ON disease_records(created_at DESC);
```

#### 3. Alerts Table
```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id),
    prediction_id UUID REFERENCES predictions(id),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('error', 'warning', 'info')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
```

#### 4. API Usage Logs Table
```sql
CREATE TABLE api_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_logs_created_at ON api_usage_logs(created_at DESC);
CREATE INDEX idx_api_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX idx_api_logs_status_code ON api_usage_logs(status_code);
```

#### 5. System Logs Table
```sql
CREATE TABLE system_logs (
    id BIGSERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    prediction_id UUID REFERENCES predictions(id),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_category ON system_logs(category);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
```

### Django Models

```python
# backend/dashboard/models.py

from django.db import models
from django.contrib.auth.models import User
from cattle.models import Cattle
import uuid

class Prediction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cow = models.ForeignKey(Cattle, on_delete=models.CASCADE, related_name='predictions')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    image_url = models.TextField()
    predicted_class = models.CharField(max_length=100)
    confidence = models.DecimalField(max_digits=5, decimal_places=2)
    is_healthy = models.BooleanField()
    raw_response = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['cow']),
            models.Index(fields=['user']),
        ]

class DiseaseRecord(models.Model):
    SEVERITY_CHOICES = [
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cow = models.ForeignKey(Cattle, on_delete=models.CASCADE)
    prediction = models.ForeignKey(Prediction, on_delete=models.SET_NULL, null=True)
    disease_type = models.CharField(max_length=100)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    recommendation = models.TextField()
    confirmed_by_vet = models.BooleanField(default=False)
    vet_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

class Alert(models.Model):
    ALERT_TYPES = [
        ('disease', 'Disease Detected'),
        ('low_confidence', 'Low Confidence'),
        ('recognition_failure', 'Recognition Failure'),
    ]
    
    SEVERITY_CHOICES = [
        ('error', 'Error'),
        ('warning', 'Warning'),
        ('info', 'Info'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    prediction = models.ForeignKey(Prediction, on_delete=models.CASCADE, null=True)
    alert_type = models.CharField(max_length=50, choices=ALERT_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

class APIUsageLog(models.Model):
    endpoint = models.CharField(max_length=255)
    method = models.CharField(max_length=10)
    status_code = models.IntegerField()
    response_time_ms = models.IntegerField()
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

class SystemLog(models.Model):
    LEVEL_CHOICES = [
        ('error', 'Error'),
        ('warning', 'Warning'),
        ('info', 'Info'),
    ]
    
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    category = models.CharField(max_length=50)
    message = models.TextField()
    details = models.JSONField(null=True, blank=True)
    prediction = models.ForeignKey(Prediction, on_delete=models.SET_NULL, null=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Summary card counts are consistent
*For any* user dashboard, the sum of healthy cows and diseased cows should equal the total cows scanned
**Validates: Requirements 1.1**

### Property 2: Prediction confidence bounds
*For any* prediction record, the confidence score should be between 0 and 100 inclusive
**Validates: Requirements 2.4**

### Property 3: Color coding consistency
*For any* UI element displaying health status, green should indicate healthy, red should indicate infected, and yellow should indicate low confidence
**Validates: Requirements 9.1, 9.2, 9.3**

### Property 4: Alert generation for disease detection
*For any* prediction where is_healthy is false, an alert of type 'disease' should be generated
**Validates: Requirements 4.1**

### Property 5: Alert generation for low confidence
*For any* prediction where confidence is below 60%, an alert of type 'low_confidence' should be generated
**Validates: Requirements 4.2**

### Property 6: Chart data aggregation accuracy
*For any* time range selection, the sum of daily case counts in the line chart should equal the total cases in that period
**Validates: Requirements 5.1**

### Property 7: Disease distribution percentages
*For any* pie chart display, the sum of all disease type percentages should equal 100%
**Validates: Requirements 5.2**

### Property 8: Table sorting consistency
*For any* sortable table column, sorting ascending then descending should return rows to original order
**Validates: Requirements 6.5**

### Property 9: API metrics calculation
*For any* time period, success rate plus error rate should equal 100% of total requests
**Validates: Requirements 7.2**

### Property 10: Responsive layout adaptation
*For any* screen size change, all dashboard components should remain visible and functional without horizontal scrolling
**Validates: Requirements 10.3**

## Error Handling

### Frontend Error Handling

1. **Network Errors**
   - Display user-friendly error messages
   - Implement retry logic with exponential backoff
   - Show offline indicator when API is unreachable

2. **Data Loading Errors**
   - Show skeleton loaders during data fetch
   - Display error state with retry button
   - Cache last successful data for offline viewing

3. **Image Upload Errors**
   - Validate file type and size before upload
   - Show progress indicator during upload
   - Handle upload failures with clear error messages

### Backend Error Handling

1. **Roboflow API Failures**
   - Log all API errors to system_logs table
   - Return graceful error response to frontend
   - Implement circuit breaker pattern for repeated failures

2. **Database Errors**
   - Use database transactions for data consistency
   - Log all database errors
   - Return appropriate HTTP status codes

3. **Invalid Input Handling**
   - Validate all input data
   - Return detailed validation errors
   - Sanitize user input to prevent injection attacks

## Testing Strategy

### Unit Testing

**Frontend Unit Tests:**
- Component rendering tests for all dashboard components
- State management tests for data fetching and updates
- Utility function tests for data formatting and calculations
- Chart rendering tests with mock data

**Backend Unit Tests:**
- Model validation tests
- API endpoint tests with various input scenarios
- Data aggregation function tests
- Permission and authentication tests

### Property-Based Testing

Use **Hypothesis** (Python) for backend property tests:

**Property Test 1: Summary card consistency**
```python
@given(
    healthy=st.integers(min_value=0, max_value=1000),
    diseased=st.integers(min_value=0, max_value=1000)
)
def test_summary_card_totals(healthy, diseased):
    total = healthy + diseased
    summary = calculate_summary(healthy, diseased)
    assert summary['total_scanned'] == total
```

**Property Test 2: Confidence bounds**
```python
@given(confidence=st.floats(min_value=0, max_value=100))
def test_confidence_within_bounds(confidence):
    prediction = create_prediction(confidence=confidence)
    assert 0 <= prediction.confidence <= 100
```

**Property Test 3: Color coding**
```python
@given(is_healthy=st.booleans())
def test_color_coding(is_healthy):
    color = get_status_color(is_healthy)
    if is_healthy:
        assert color == 'green'
    else:
        assert color == 'red'
```

### Integration Testing

- Test complete user flows (upload → prediction → alert generation)
- Test dashboard data refresh cycles
- Test role-based access control
- Test real-time update mechanisms

## Performance Considerations

### Frontend Optimization

1. **Code Splitting**
   - Lazy load dashboard components
   - Split vendor bundles
   - Use React.lazy() for route-based splitting

2. **Data Caching**
   - Cache API responses with React Query
   - Implement stale-while-revalidate strategy
   - Use local storage for user preferences

3. **Chart Optimization**
   - Limit data points for large datasets
   - Use virtualization for large tables
   - Debounce filter and search inputs

### Backend Optimization

1. **Database Optimization**
   - Add indexes on frequently queried columns
   - Use database views for complex aggregations
   - Implement query result caching with Redis

2. **API Response Optimization**
   - Implement pagination for large datasets
   - Use select_related() and prefetch_related() for Django queries
   - Compress API responses with gzip

3. **Background Processing**
   - Use Celery for heavy computations
   - Process analytics calculations asynchronously
   - Schedule periodic cache updates

## Security Considerations

1. **Authentication & Authorization**
   - Enforce role-based access control
   - Validate user permissions for each dashboard
   - Use JWT tokens for API authentication

2. **Data Protection**
   - Encrypt sensitive data at rest
   - Use HTTPS for all communications
   - Sanitize all user inputs

3. **API Security**
   - Implement rate limiting
   - Use CORS policies
   - Validate all API requests

## Deployment Strategy

1. **Database Migrations**
   - Create migrations for new tables
   - Add indexes in separate migrations
   - Test migrations on staging environment

2. **Frontend Deployment**
   - Build optimized production bundle
   - Deploy to CDN for static assets
   - Implement progressive rollout

3. **Backend Deployment**
   - Deploy with zero-downtime strategy
   - Run database migrations before code deployment
   - Monitor error rates post-deployment

## Monitoring and Logging

1. **Application Monitoring**
   - Track API response times
   - Monitor error rates
   - Set up alerts for anomalies

2. **User Analytics**
   - Track dashboard usage patterns
   - Monitor feature adoption
   - Collect user feedback

3. **System Health**
   - Monitor database performance
   - Track Roboflow API usage
   - Monitor server resources
