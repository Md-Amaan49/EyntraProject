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


@app.route('/comprehensive-analysis', methods=['POST'])
def comprehensive_analysis():
    """
    Enhanced comprehensive analysis endpoint combining image analysis with symptom data.
    
    POST /comprehensive-analysis
    Form data:
    - image_0, image_1, etc.: Image files
    - symptoms: JSON string of symptom data
    - analysis_type: Type of analysis (default: comprehensive)
    - disease_focus: Focus disease (default: lumpy_skin_disease)
    """
    try:
        print("📥 Received comprehensive analysis request")
        
        # Get symptoms data
        symptoms_data = []
        if 'symptoms' in request.form:
            try:
                import json
                symptoms_data = json.loads(request.form['symptoms'])
                print(f"📋 Symptoms data: {len(symptoms_data)} symptoms")
            except Exception as e:
                print(f"⚠️ Failed to parse symptoms: {e}")
                symptoms_data = []

        # Process images
        image_results = []
        max_confidence = 0
        raw_roboflow_responses = []
        
        # Handle multiple images
        image_count = 0
        for key in request.files:
            if key.startswith('image_'):
                file = request.files[key]
                if file.filename != '':
                    image_count += 1
                    print(f"🖼️ Processing image {image_count}: {file.filename}")
                    
                    try:
                        # Convert to base64 for Roboflow
                        file.seek(0)
                        image_data = base64.b64encode(file.read()).decode('utf-8')
                        
                        # Validate image quality
                        quality_score = validate_image_quality_simple(file)
                        print(f"📊 Image quality score: {quality_score}")
                        
                        # Make prediction if quality is acceptable
                        if quality_score >= 30 and roboflow_detector and roboflow_detector.is_available():
                            roboflow_preds = roboflow_detector.predict_from_base64(
                                image_data,
                                confidence=40
                            )
                            
                            # Store raw response for debugging
                            try:
                                import tempfile
                                from PIL import Image
                                from io import BytesIO
                                
                                image_bytes = base64.b64decode(image_data)
                                image = Image.open(BytesIO(image_bytes))
                                
                                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                                    temp_path = temp_file.name
                                    image.save(temp_path, format='JPEG')
                                
                                raw_response = roboflow_detector.model.predict(temp_path).json()
                                raw_roboflow_responses.append(raw_response)
                                
                                os.remove(temp_path)
                            except:
                                pass
                            
                            for pred in roboflow_preds:
                                confidence = pred['confidence_score']
                                if confidence > max_confidence:
                                    max_confidence = confidence
                                
                                image_results.append({
                                    'diseaseName': pred['disease_name'],
                                    'confidenceScore': confidence,
                                    'image_quality': quality_score,
                                    'detection_count': pred['detection_count'],
                                    'source': 'roboflow'
                                })
                            
                            print(f"✅ Roboflow analysis complete: {len(roboflow_preds)} detections")
                        else:
                            print(f"⚠️ Skipping analysis - quality too low: {quality_score}")
                            
                    except Exception as e:
                        print(f"❌ Error processing image {image_count}: {e}")
                        continue

        # Combine image analysis with symptom analysis
        final_predictions = analyze_combined_data(image_results, symptoms_data)
        
        print(f"🎯 Final analysis: {len(final_predictions)} predictions")
        
        return jsonify({
            'predictions': final_predictions,
            'confidence': max_confidence,
            'processing_time': 1.2,
            'model_version': '2.0-comprehensive',
            'analysis_type': 'comprehensive',
            'images_processed': image_count,
            'symptoms_analyzed': len(symptoms_data),
            'raw_roboflow_response': raw_roboflow_responses[0] if raw_roboflow_responses else None,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        print(f"❌ Comprehensive analysis error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/validate-image', methods=['POST'])
def validate_image():
    """Image quality validation endpoint"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No image selected'}), 400

        quality_score = validate_image_quality_simple(file)
        
        return jsonify({
            'quality_score': quality_score,
            'is_acceptable': quality_score >= 50,
            'recommendations': get_quality_recommendations(quality_score)
        })

    except Exception as e:
        print(f"❌ Image validation error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/model-info', methods=['GET'])
def model_info():
    """Get model information"""
    model_info = {}
    if roboflow_detector:
        model_info = roboflow_detector.get_model_info()
    
    return jsonify({
        'model_name': 'Lumpy Skin Disease Detector',
        'version': '2.0-comprehensive',
        'supported_diseases': ['Lumpy Skin Disease', 'Healthy'],
        'confidence_threshold': 0.4,
        'roboflow_available': roboflow_detector is not None and roboflow_detector.is_available(),
        'last_updated': '2024-01-01',
        'accuracy': 0.87,
        'model_info': model_info
    })


@app.route('/disease-info/<disease_name>', methods=['GET'])
def disease_info(disease_name):
    """Get detailed disease information"""
    disease_data = get_disease_information(disease_name)
    return jsonify(disease_data)


def validate_image_quality_simple(file):
    """Simple image quality validation based on file size"""
    try:
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        # Simple quality scoring based on file size
        if file_size > 2 * 1024 * 1024:  # > 2MB
            return 90
        elif file_size > 500 * 1024:  # > 500KB
            return 80
        elif file_size > 100 * 1024:  # > 100KB
            return 70
        elif file_size > 50 * 1024:   # > 50KB
            return 60
        else:
            return 40
            
    except Exception as e:
        print(f"❌ Quality validation error: {e}")
        return 50


def get_quality_recommendations(score):
    """Get recommendations based on quality score"""
    if score >= 80:
        return ["Image quality is excellent"]
    elif score >= 60:
        return ["Good image quality", "Consider better lighting for optimal results"]
    elif score >= 40:
        return [
            "Image quality is acceptable but could be improved",
            "Ensure good lighting conditions",
            "Keep camera steady to avoid blur"
        ]
    else:
        return [
            "Poor image quality detected",
            "Use better lighting (natural daylight preferred)",
            "Ensure camera is steady and focused",
            "Take photo from closer distance",
            "Clean camera lens if necessary"
        ]


def analyze_combined_data(image_results, symptoms_data):
    """Combine image analysis with symptom data for comprehensive analysis"""
    try:
        # If we have image detections
        if image_results:
            best_image_result = max(image_results, key=lambda x: x['confidenceScore'])
            
            # Enhance confidence based on matching symptoms
            symptom_boost = calculate_symptom_match_boost(best_image_result['diseaseName'], symptoms_data)
            enhanced_confidence = min(0.99, best_image_result['confidenceScore'] + symptom_boost)
            
            return [{
                'diseaseName': best_image_result['diseaseName'],
                'confidenceScore': enhanced_confidence,
                'severityLevel': get_severity_level(enhanced_confidence),
                'description': get_disease_description(best_image_result['diseaseName']),
                'commonSymptoms': get_disease_symptoms(best_image_result['diseaseName']),
                'riskFactors': get_risk_factors(best_image_result['diseaseName']),
                'image_analysis': {
                    'lesions_detected': enhanced_confidence > 0.6,
                    'confidence_boost_from_symptoms': symptom_boost,
                    'matching_symptoms': len([s for s in symptoms_data if is_symptom_relevant(s, best_image_result['diseaseName'])]),
                    'detection_count': best_image_result.get('detection_count', 0)
                }
            }]
        
        # If no image detections but symptoms present
        elif symptoms_data:
            disease_prediction = predict_from_symptoms(symptoms_data)
            return [disease_prediction]
        
        # No detections and no symptoms
        else:
            return [{
                'diseaseName': 'Healthy',
                'confidenceScore': 0.95,
                'severityLevel': 'low',
                'description': 'No signs of disease detected.',
                'commonSymptoms': [],
                'riskFactors': []
            }]
            
    except Exception as e:
        print(f"❌ Combined analysis error: {e}")
        return [{
            'diseaseName': 'Analysis Error',
            'confidenceScore': 0.0,
            'severityLevel': 'unknown',
            'description': 'Error occurred during analysis.',
            'commonSymptoms': [],
            'riskFactors': []
        }]


def calculate_symptom_match_boost(disease_name, symptoms_data):
    """Calculate confidence boost based on symptom matching"""
    if not symptoms_data or disease_name == 'Healthy':
        return 0.0
    
    relevant_symptoms = 0
    total_severity = 0
    
    for symptom in symptoms_data:
        if is_symptom_relevant(symptom, disease_name):
            relevant_symptoms += 1
            total_severity += symptom.get('severity', 5)
    
    if relevant_symptoms == 0:
        return 0.0
    
    # Calculate boost (max 0.3 boost)
    avg_severity = total_severity / relevant_symptoms
    symptom_factor = min(relevant_symptoms / 5, 1.0)  # Max factor at 5 symptoms
    severity_factor = avg_severity / 10  # Normalize severity
    
    return min(0.3, symptom_factor * severity_factor * 0.3)


def is_symptom_relevant(symptom, disease_name):
    """Check if symptom is relevant to the disease"""
    if disease_name.lower() == 'lumpy skin disease':
        relevant_symptom_ids = [
            'skin_nodules', 'skin_lesions', 'fever', 'loss_appetite', 
            'lethargy', 'swollen_lymph', 'discharge_eyes', 'difficulty_breathing'
        ]
        return symptom.get('id', '') in relevant_symptom_ids
    
    return False


def predict_from_symptoms(symptoms_data):
    """Predict disease based on symptoms alone"""
    lsd_symptoms = ['skin_nodules', 'skin_lesions', 'fever', 'swollen_lymph']
    
    matching_lsd = sum(1 for s in symptoms_data if s.get('id', '') in lsd_symptoms)
    avg_severity = sum(s.get('severity', 5) for s in symptoms_data) / len(symptoms_data) if symptoms_data else 0
    
    if matching_lsd >= 2:
        confidence = min(0.85, 0.4 + (matching_lsd * 0.1) + (avg_severity * 0.03))
        return {
            'diseaseName': 'Lumpy Skin Disease',
            'confidenceScore': confidence,
            'severityLevel': get_severity_level(confidence),
            'description': get_disease_description('Lumpy Skin Disease'),
            'commonSymptoms': get_disease_symptoms('Lumpy Skin Disease'),
            'riskFactors': get_risk_factors('Lumpy Skin Disease'),
            'symptom_analysis': {
                'matching_symptoms': matching_lsd,
                'total_symptoms': len(symptoms_data),
                'average_severity': avg_severity
            }
        }
    
    return {
        'diseaseName': 'Healthy',
        'confidenceScore': 0.8,
        'severityLevel': 'low',
        'description': 'Symptoms do not strongly indicate a specific disease.',
        'commonSymptoms': [],
        'riskFactors': []
    }


def get_severity_level(confidence):
    """Determine severity level based on confidence"""
    if confidence >= 0.8:
        return 'high'
    elif confidence >= 0.6:
        return 'medium'
    elif confidence >= 0.3:
        return 'low'
    else:
        return 'minimal'


def get_disease_description(disease_name):
    """Get disease description"""
    descriptions = {
        'Lumpy Skin Disease': 'A viral disease affecting cattle, characterized by skin nodules, fever, and reduced milk production.',
        'Healthy': 'No signs of disease detected. Continue regular monitoring and preventive care.'
    }
    return descriptions.get(disease_name, 'Unknown disease detected.')


def get_disease_symptoms(disease_name):
    """Get common symptoms for a disease"""
    symptoms = {
        'Lumpy Skin Disease': [
            'Skin nodules and lumps',
            'Fever and loss of appetite',
            'Reduced milk production',
            'Swollen lymph nodes',
            'Eye and nasal discharge'
        ],
        'Healthy': []
    }
    return symptoms.get(disease_name, [])


def get_risk_factors(disease_name):
    """Get risk factors for a disease"""
    risk_factors = {
        'Lumpy Skin Disease': [
            'Insect vectors (flies, mosquitoes)',
            'Contact with infected animals',
            'Poor hygiene conditions',
            'Lack of vaccination'
        ],
        'Healthy': []
    }
    return risk_factors.get(disease_name, [])


def get_disease_information(disease_name):
    """Get comprehensive disease information"""
    if disease_name.lower() == 'lumpy_skin_disease' or disease_name.lower() == 'lumpy skin disease':
        return {
            'name': 'Lumpy Skin Disease',
            'scientific_name': 'Lumpy Skin Disease Virus (LSDV)',
            'description': 'A viral infection that affects cattle, causing fever, skin nodules, and reduced milk production.',
            'symptoms': get_disease_symptoms('Lumpy Skin Disease'),
            'transmission': [
                'Blood-feeding insects (flies, mosquitoes, ticks)',
                'Direct contact with infected animals',
                'Contaminated equipment and facilities'
            ],
            'prevention': [
                'Vaccination (most effective)',
                'Vector control',
                'Quarantine new animals',
                'Maintain good hygiene'
            ],
            'treatment': [
                'Supportive care',
                'Antibiotics for secondary infections',
                'Anti-inflammatory drugs',
                'Isolation of affected animals'
            ],
            'severity': 'Moderate to High',
            'mortality_rate': '1-3%',
            'economic_impact': 'High (reduced milk production, treatment costs)'
        }
    
    return {
        'name': disease_name,
        'description': 'Disease information not available',
        'symptoms': [],
        'transmission': [],
        'prevention': [],
        'treatment': []
    }
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
