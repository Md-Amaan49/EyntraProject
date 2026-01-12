from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

# Roboflow configuration
ROBOFLOW_API_KEY = os.getenv('ROBOFLOW_API_KEY')
ROBOFLOW_WORKSPACE = os.getenv('ROBOFLOW_WORKSPACE')
ROBOFLOW_PROJECT = os.getenv('ROBOFLOW_PROJECT')
ROBOFLOW_VERSION = os.getenv('ROBOFLOW_VERSION')

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "cattle-health-ai"})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        image_file = request.files['image']
        
        # Use Roboflow API directly (no local TensorFlow)
        if ROBOFLOW_API_KEY:
            try:
                # Prepare the image for Roboflow
                files = {'file': image_file.read()}
                
                roboflow_url = f"https://detect.roboflow.com/{ROBOFLOW_WORKSPACE}/{ROBOFLOW_PROJECT}/{ROBOFLOW_VERSION}"
                params = {'api_key': ROBOFLOW_API_KEY}
                
                response = requests.post(roboflow_url, files=files, params=params)
                
                if response.status_code == 200:
                    roboflow_data = response.json()
                    
                    # Process Roboflow response
                    predictions = []
                    if 'predictions' in roboflow_data:
                        for pred in roboflow_data['predictions']:
                            predictions.append({
                                'class': pred.get('class', 'unknown'),
                                'confidence': pred.get('confidence', 0),
                                'is_healthy': pred.get('class', '').lower() in ['healthy', 'normal']
                            })
                    
                    return jsonify({
                        "predictions": predictions,
                        "source": "roboflow",
                        "status": "success"
                    })
                else:
                    return jsonify({"error": "Roboflow API error"}), 500
                    
            except Exception as e:
                return jsonify({"error": f"Roboflow error: {str(e)}"}), 500
        
        # Fallback response if no API key
        return jsonify({
            "predictions": [{
                "class": "analysis_unavailable",
                "confidence": 0.0,
                "is_healthy": True
            }],
            "source": "fallback",
            "status": "limited"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port, debug=False)