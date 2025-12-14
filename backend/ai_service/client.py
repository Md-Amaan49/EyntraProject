"""
Client for communicating with the Flask AI service.
"""
import requests
import logging
from django.conf import settings
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class AIServiceClient:
    """Client for the Flask AI prediction service."""
    
    def __init__(self):
        self.base_url = getattr(settings, 'AI_SERVICE_URL', 'http://localhost:5000')
        self.timeout = getattr(settings, 'AI_SERVICE_TIMEOUT', 30)
        self.api_key = getattr(settings, 'AI_SERVICE_API_KEY', None)
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Dict:
        """Make HTTP request to AI service."""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=self.timeout)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=self.timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.Timeout:
            logger.error(f"AI service timeout for {endpoint}")
            raise AIServiceException("AI service is taking too long to respond")
        except requests.exceptions.ConnectionError:
            logger.error(f"Cannot connect to AI service at {url}")
            raise AIServiceException("AI service is unavailable")
        except requests.exceptions.HTTPError as e:
            logger.error(f"AI service HTTP error: {e}")
            if e.response.status_code == 400:
                error_data = e.response.json() if e.response.content else {}
                raise AIServiceException(f"Invalid request: {error_data.get('message', str(e))}")
            elif e.response.status_code == 500:
                raise AIServiceException("AI service internal error")
            else:
                raise AIServiceException(f"AI service error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error calling AI service: {e}")
            raise AIServiceException(f"Unexpected error: {str(e)}")
    
    def health_check(self) -> Dict:
        """Check if AI service is healthy."""
        return self._make_request('GET', '/health')
    
    def predict_disease(
        self, 
        symptoms: str, 
        images: List[str] = None, 
        cattle_metadata: Dict = None
    ) -> Dict:
        """
        Predict disease from symptoms and images.
        
        Args:
            symptoms: Text description of symptoms
            images: List of base64 encoded images
            cattle_metadata: Additional cattle information
        
        Returns:
            Dictionary containing predictions and metadata
        """
        data = {
            'symptoms': symptoms,
            'images': images or [],
            'cattle_metadata': cattle_metadata or {}
        }
        
        return self._make_request('POST', '/api/ai/predict', data)
    
    def get_model_version(self) -> Dict:
        """Get current AI model version information."""
        return self._make_request('GET', '/api/ai/model/version')
    
    def submit_feedback(
        self, 
        prediction_id: str, 
        predicted_disease: str, 
        actual_disease: str, 
        was_correct: bool
    ) -> Dict:
        """
        Submit feedback on prediction accuracy.
        
        Args:
            prediction_id: Unique identifier for the prediction
            predicted_disease: Disease predicted by AI
            actual_disease: Actual disease diagnosed
            was_correct: Whether the prediction was correct
        
        Returns:
            Confirmation of feedback submission
        """
        data = {
            'prediction_id': prediction_id,
            'predicted_disease': predicted_disease,
            'actual_disease': actual_disease,
            'was_correct': was_correct
        }
        
        return self._make_request('POST', '/api/ai/feedback', data)


class AIServiceException(Exception):
    """Exception raised when AI service encounters an error."""
    pass


# Global client instance
ai_client = AIServiceClient()