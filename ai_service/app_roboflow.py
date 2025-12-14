"""
Flask AI Service for Disease Prediction using Roboflow
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import base64
from datetime import datetime
from dotenv import load_dotenv
from models.roboflow_detector import RoboflowLumpyDetector

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Initialize Roboflow detector
roboflow_detector = None

try:
    roboflow_detector = RoboflowLumpyDetector()
    if roboflow_detector.is_available():
        print("✅ Roboflow Lumpy Skin Disease detector loaded successfully!")
    else:
        print("⚠️ Roboflow detector initialized but not available")
except Exception as e:
    print(f"❌ Failed to load Roboflow detector: {e}")


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'AI Disease Prediction (Roboflow)',
        'version': '2.0.0-roboflow',
        'roboflow_available': roboflow_detector is not None and roboflow_detector.is_available()
    }), 200


@app.route('/api/ai/predict', methods=['POST'])
def predict_disease():
    """
    Predict disease from symptoms and images using Roboflow.
    
    POST /api/ai/predict
    {
        "symptoms": "Skin nodules and lumps",
        "images": ["base64_image1", "base64_image2"],
        "cattle_metadata": {
            "breed": "Holstein",
            "age": 3
        }
    }
    """
    try:
        data = request.get_json()
        
        print(f"📥 Received request data keys: {data.keys() if data else 'None'}")
        
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
        
        # Check if we have valid input (non-empty symptoms or at least one image)
        has_symptoms = symptoms and symptoms.strip()
        has_images = images and len(images) > 0
        
        if not has_symptoms and not has_images:
            return jsonify({
                'error': {
                    'code': 'MISSING_INPUT',
                    'message': 'Either symptoms or images must be provided'
                }
            }), 400
        
        predictions = []
        raw_roboflow_responses = []
        
        # Use Roboflow for image analysis
        if images and roboflow_detector and roboflow_detector.is_available():
            print(f"🔍 Analyzing {len(images)} image(s) with Roboflow...")
            
            for image_data in images:
                try:
                    # Get raw Roboflow response
                    from models.roboflow_detector import RoboflowLumpyDetector
                    import tempfile
                    from PIL import Image
                    from io import BytesIO
                    
                    # Decode and save image temporarily
                    image_bytes = base64.b64decode(image_data)
                    image = Image.open(BytesIO(image_bytes))
                    
                    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                        temp_path = temp_file.name
                        image.save(temp_path, format='JPEG')
                    
                    # Get raw response from Roboflow
                    try:
                        raw_response = roboflow_detector.model.predict(temp_path).json()
                        raw_roboflow_responses.append(raw_response)
                        print("="*60)
                        print("📋 RAW ROBOFLOW RESPONSE:")
                        print("="*60)
                        import json
                        print(json.dumps(raw_response, indent=2))
                        print("="*60)
                    except:
                        pass
                    
                    # Clean up temp file
                    try:
                        os.remove(temp_path)
                    except:
                        pass
                    
                    roboflow_preds = roboflow_detector.predict_from_base64(
                        image_data,
                        confidence=40  # 40% minimum confidence
                    )
                    
                    # Convert to expected format
                    for pred in roboflow_preds:
                        formatted_pred = {
                            'diseaseName': pred['disease_name'],
                            'confidenceScore': pred['confidence_score'],
                            'severityLevel': 'high',  # Lumpy Skin Disease is always high severity
                            'description': f"Detected using Roboflow AI model - {pred['detection_count']} lesion(s) found",
                            'detection_count': pred['detection_count'],
                            'recommendation': get_recommendation(pred['confidence_score']),
                            'source': 'roboflow',
                            'reliability': 'high'
                        }
                        predictions.append(formatted_pred)
                    
                    print(f"✅ Roboflow detected {len(roboflow_preds)} disease(s)")
                    
                except Exception as e:
                    print(f"❌ Roboflow prediction failed: {e}")
                    continue
        
        # If no predictions, return empty result
        if not predictions:
            print("ℹ️ No diseases detected")
        
        return jsonify({
            'predictions': predictions,
            'raw_roboflow_response': raw_roboflow_responses[0] if raw_roboflow_responses else None,
            'model_version': '2.0.0-roboflow',
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({
            'error': {
                'code': 'PREDICTION_ERROR',
                'message': 'Failed to process prediction',
                'details': str(e)
            }
        }), 500


def get_recommendation(confidence):
    """Get recommendation based on confidence score."""
    if confidence >= 80:
        return (
            "High confidence Lumpy Skin Disease detection. "
            "IMMEDIATE ACTION REQUIRED: Isolate affected cattle, contact veterinarian urgently, "
            "and report to local animal health authorities. This is a notifiable disease."
        )
    elif confidence >= 60:
        return (
            "Moderate confidence Lumpy Skin Disease detection. "
            "Isolate suspected cattle and contact veterinarian for confirmation. "
            "Monitor closely for additional symptoms."
        )
    else:
        return (
            "Possible Lumpy Skin Disease detected. "
            "Veterinary examination recommended for accurate diagnosis."
        )


@app.route('/api/ai/model/version', methods=['GET'])
def get_model_version():
    """Get current AI model version."""
    model_info = {}
    if roboflow_detector:
        model_info = roboflow_detector.get_model_info()
    
    return jsonify({
        'version': '2.0.0-roboflow',
        'loaded_at': datetime.now().isoformat(),
        'model_info': model_info,
        'diseases': ['Lumpy Skin Disease']
    }), 200


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'True') == 'True'
    print(f"\n🚀 Starting AI Service on port {port}...")
    print(f"🔧 Debug mode: {debug}")
    print(f"🤖 Roboflow available: {roboflow_detector is not None and roboflow_detector.is_available()}\n")
    app.run(host='0.0.0.0', port=port, debug=debug)
