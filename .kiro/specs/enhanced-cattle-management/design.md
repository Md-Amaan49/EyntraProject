# Enhanced Cattle Management Design

## Overview

This design document outlines the technical approach for enhancing the cattle management system with image upload capabilities and owner-scoped identification numbers. The solution will modify existing backend models, API endpoints, and frontend components to support these new features while maintaining backward compatibility.

## Architecture

The enhancement follows the existing three-tier architecture:

1. **Frontend (React/TypeScript)**: Enhanced forms and components for image upload and display
2. **Backend (Django REST)**: Modified models, serializers, and API endpoints
3. **Storage**: File system storage for cattle images with database references

## Components and Interfaces

### Backend Components

#### Modified Models
- **Cattle Model**: Add image field and modify identification_number uniqueness constraint
- **Database Migration**: Update constraints to be owner-scoped

#### API Endpoints
- **POST /api/cattle/**: Enhanced to handle multipart form data with image upload
- **PUT/PATCH /api/cattle/{id}/**: Support image updates
- **GET /api/cattle/**: Include image URLs in responses

#### File Storage
- **Media Storage**: Configure Django media handling for cattle images
- **Image Processing**: Implement image compression and validation

### Frontend Components

#### Enhanced Forms
- **AddCattleForm**: Add image upload field with preview
- **EditCattleForm**: Support image replacement and removal
- **ImageUpload Component**: Reusable image upload with validation

#### Display Components
- **CattleCard**: Display cattle images prominently
- **CattleDetail**: Enhanced view with image gallery
- **VeterinarianView**: Show cattle images in consultation context

## Data Models

### Updated Cattle Model

```python
class Cattle(models.Model):
    # Existing fields...
    identification_number = models.CharField(max_length=50, db_index=True)  # Remove unique=True
    image = models.ImageField(upload_to='cattle_images/', null=True, blank=True)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['owner', 'identification_number'],
                name='unique_identification_per_owner'
            )
        ]
```

### Image Storage Structure
```
media/
└── cattle_images/
    ├── {owner_id}/
    │   ├── {cattle_id}_original.jpg
    │   ├── {cattle_id}_thumbnail.jpg
    │   └── {cattle_id}_medium.jpg
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework

<function_calls>
<invoke name="prework">
<parameter name="featureName">enhanced-cattle-management

Property 1: Image validation consistency
*For any* uploaded file, the validation should consistently accept valid image formats (JPEG, PNG, WebP) under size limits and reject invalid formats or oversized files
**Validates: Requirements 1.2**

Property 2: Image storage association
*For any* valid cattle record with an uploaded image, the image should be correctly stored and retrievable through the cattle record
**Validates: Requirements 1.3**

Property 3: Image display consistency
*For any* cattle record with an associated image, displaying the cattle information should include the image
**Validates: Requirements 1.5**

Property 4: Owner-scoped identification uniqueness
*For any* owner and identification number, the system should allow the same identification number for different owners but prevent duplicates within the same owner's collection
**Validates: Requirements 2.1, 2.2, 2.3**

Property 5: Scoped display consistency
*For any* cattle list or display, identification numbers should be shown with proper owner context and scope
**Validates: Requirements 2.4, 2.5**

Property 6: Veterinarian context display
*For any* cattle viewed by veterinarians, the display should include owner attribution alongside the owner-scoped identification number
**Validates: Requirements 3.2, 3.4, 4.2, 4.3**

Property 7: Image compression preservation
*For any* uploaded image, the compression and optimization process should maintain visual quality while reducing file size
**Validates: Requirements 5.1**

Property 8: Database constraint enforcement
*For any* attempt to create cattle with duplicate identification numbers within an owner's scope, the database should prevent the creation
**Validates: Requirements 5.2**

## Error Handling

### Image Upload Errors
- **File size exceeded**: Clear error message with size limits
- **Invalid format**: Specific error about supported formats
- **Upload failure**: Retry mechanism with fallback

### Identification Number Errors
- **Duplicate within owner scope**: Clear error with suggestion to use different number
- **Invalid characters**: Validation with allowed character set
- **Length constraints**: Error message with character limits

### Database Errors
- **Constraint violations**: User-friendly error messages
- **Connection issues**: Graceful degradation with retry logic
- **Migration failures**: Rollback mechanisms

## Testing Strategy

### Unit Testing
- Model validation logic
- API endpoint responses
- Image processing functions
- Constraint enforcement

### Property-Based Testing
Using **Hypothesis** for Python backend and **fast-check** for TypeScript frontend:

- **Image validation properties**: Test across various file types, sizes, and formats
- **Owner-scoped uniqueness properties**: Test with multiple owners and identification patterns
- **Display consistency properties**: Test rendering across different data combinations
- **Database constraint properties**: Test constraint enforcement under various scenarios

Each property-based test will run a minimum of 100 iterations to ensure comprehensive coverage.

### Integration Testing
- End-to-end image upload workflow
- Multi-user identification number scenarios
- Veterinarian-owner data sharing flows
- Database migration testing

## Implementation Plan

### Phase 1: Backend Changes
1. Update Cattle model with image field and constraints
2. Create database migration
3. Modify serializers for image handling
4. Update API endpoints for multipart data

### Phase 2: Frontend Enhancements
1. Create image upload component
2. Update AddCattleForm with image field
3. Enhance CattleCard with image display
4. Update veterinarian views

### Phase 3: Integration & Testing
1. Implement property-based tests
2. End-to-end testing
3. Performance optimization
4. Documentation updates