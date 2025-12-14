"""
Flask AI Service for Disease Prediction
"""
from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv
from predictor import DiseasePredictor

load_dotenv()

app = Flask(__name__)

# Initialize predictor
predictor = DiseasePredictor()


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'AI Disease Prediction',
        'version': '1.0.0'
    }), 200


@app.route('/api/ai/predict', methods=['POST'])
def predict_disease():
    """
    Predict disease from symptoms and images.
    
    POST /api/ai/predict
    {
        "symptoms": "High fever, loss of appetite, discharge from nose",
        "images": ["base64_image1", "base64_image2"],
        "cattle_metadata": {
            "breed": "Holstein",
            "age": 3,
            "previous_diseases": []
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body is required'
                }
            }), 400
        
        symptoms = data.get('symptoms', '')
        images = data.get('images', [])
        cattle_metadata = data.get('cattle_metadata', {})
        
        if not symptoms and not images:
            return jsonify({
                'error': {
                    'code': 'MISSING_INPUT',
                    'message': 'Either symptoms or images must be provided',
                    'details': {
                        'symptoms': 'No symptoms provided',
                        'images': 'No images provided'
                    }
                }
            }), 400
        
        # Make prediction
        predictions = predictor.predict(
            symptoms=symptoms,
            images=images,
            metadata=cattle_metadata
        )
        
        return jsonify({
            'predictions': predictions,
            'model_version': predictor.get_model_version(),
            'timestamp': predictor.get_timestamp()
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': {
                'code': 'PREDICTION_ERROR',
                'message': 'Failed to process prediction',
                'details': str(e)
            }
        }), 500


@app.route('/api/ai/model/version', methods=['GET'])
def get_model_version():
    """Get current AI model version."""
    return jsonify({
        'version': predictor.get_model_version(),
        'loaded_at': predictor.get_loaded_at(),
        'diseases': predictor.get_supported_diseases()
    }), 200


@app.route('/api/ai/feedback', methods=['POST'])
def submit_feedback():
    """
    Submit feedback on prediction accuracy.
    
    POST /api/ai/feedback
    {
        "prediction_id": "uuid",
        "predicted_disease": "Disease Name",
        "actual_disease": "Actual Disease Name",
        "was_correct": true/false
    }
    """
    try:
        data = request.get_json()
        
        # Log feedback for model improvement
        predictor.log_feedback(data)
        
        return jsonify({
            'message': 'Feedback recorded successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': {
                'code': 'FEEDBACK_ERROR',
                'message': 'Failed to record feedback',
                'details': str(e)
            }
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'False') == 'True'
    app.run(host='0.0.0.0', port=port, debug=debug)
