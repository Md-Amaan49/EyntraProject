"""
Roboflow-based cattle disease detection for Lumpy Skin Disease.
"""
from roboflow import Roboflow
import base64
from io import BytesIO
from PIL import Image
import os
import logging
import tempfile

logger = logging.getLogger(__name__)


class RoboflowLumpyDetector:
    """Lumpy Skin Disease detection using Roboflow trained model."""
    
    def __init__(self, api_key=None, workspace=None, project=None, version=None):
        """
        Initialize Roboflow detector.
        
        Args:
            api_key: Roboflow API key
            workspace: Roboflow workspace name
            project: Project name (e.g., 'lumpy-skin-disease')
            version: Model version number
        """
        self.api_key = api_key or os.getenv('ROBOFLOW_API_KEY')
        self.workspace = workspace or os.getenv('ROBOFLOW_WORKSPACE')
        self.project = project or os.getenv('ROBOFLOW_PROJECT')
        self.version = version or int(os.getenv('ROBOFLOW_VERSION', '1'))
        
        self.model = None
        self.model_loaded = False
        
        # Initialize Roboflow
        self._load_model()
    
    def _load_model(self):
        """Load the Roboflow model."""
        try:
            if not self.api_key:
                logger.warning("ROBOFLOW_API_KEY not set. Roboflow detection disabled.")
                return
            
            rf = Roboflow(api_key=self.api_key)
            project = rf.workspace(self.workspace).project(self.project)
            self.model = project.version(self.version).model
            self.model_loaded = True
            
            logger.info(f"✅ Loaded Roboflow model: {self.workspace}/{self.project}/v{self.version}")
            
        except Exception as e:
            logger.error(f"❌ Failed to load Roboflow model: {e}")
            logger.error("Make sure ROBOFLOW_API_KEY, ROBOFLOW_WORKSPACE, ROBOFLOW_PROJECT are set correctly")
            self.model_loaded = False
    
    def is_available(self):
        """Check if Roboflow model is loaded and available."""
        return self.model_loaded and self.model is not None
    
    def predict_from_base64(self, base64_image, confidence=40, overlap=30):
        """
        Predict Lumpy Skin Disease from base64 encoded image.
        
        Args:
            base64_image: Base64 encoded image string
            confidence: Minimum confidence threshold (0-100) - for object detection only
            overlap: Overlap threshold for NMS (0-100) - for object detection only
            
        Returns:
            List of predictions with disease information
        """
        if not self.is_available():
            raise ValueError("Roboflow model not loaded. Check API key and configuration.")
        
        try:
            # Decode base64 to image
            image_bytes = base64.b64decode(base64_image)
            image = Image.open(BytesIO(image_bytes))
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                temp_path = temp_file.name
                image.save(temp_path, format='JPEG')
            
            # Make prediction - try with confidence/overlap first (object detection)
            # If that fails, try without parameters (classification)
            try:
                predictions = self.model.predict(
                    temp_path,
                    confidence=confidence,
                    overlap=overlap
                ).json()
            except TypeError:
                # Classification model - doesn't accept confidence/overlap
                logger.info("Using classification model (no confidence/overlap params)")
                predictions = self.model.predict(temp_path).json()
            
            # Clean up temp file
            try:
                os.remove(temp_path)
            except:
                pass
            
            return self._format_predictions(predictions)
            
        except Exception as e:
            logger.error(f"Roboflow prediction error: {e}")
            raise
    
    def predict_from_file(self, image_path, confidence=40, overlap=30):
        """
        Predict Lumpy Skin Disease from image file.
        
        Args:
            image_path: Path to image file
            confidence: Minimum confidence threshold (0-100)
            overlap: Overlap threshold for NMS (0-100)
            
        Returns:
            List of predictions
        """
        if not self.is_available():
            raise ValueError("Roboflow model not loaded")
        
        try:
            predictions = self.model.predict(
                image_path,
                confidence=confidence,
                overlap=overlap
            ).json()
            
            return self._format_predictions(predictions)
            
        except Exception as e:
            logger.error(f"Roboflow prediction error: {e}")
            raise
    
    def _format_predictions(self, roboflow_response):
        """
        Format Roboflow predictions to match our system format.
        Handles both object detection and classification models.
        
        Args:
            roboflow_response: Raw response from Roboflow API
            
        Returns:
            Formatted predictions list
        """
        formatted_predictions = []
        
        # Debug: Log the raw response
        logger.info(f"Raw Roboflow response: {roboflow_response}")
        print(f"\n{'='*60}")
        print(f"📋 RAW ROBOFLOW RESPONSE:")
        print(f"{'='*60}")
        import json
        print(json.dumps(roboflow_response, indent=2))
        print(f"{'='*60}\n")
        
        # Check if this is a classification response (top prediction) or detection response (predictions array)
        if 'top' in roboflow_response:
            # Classification model response
            logger.info("Processing classification model response")
            top_class = roboflow_response.get('top')
            confidence = roboflow_response.get('confidence', 0) * 100
            
            if top_class and confidence > 0:
                # Check if it's a healthy classification
                is_healthy = top_class.lower() in ['healthy', 'normal', 'no_disease', 'nodisease']
                
                formatted_pred = {
                    'disease_name': self._format_disease_name(top_class),
                    'confidence_score': confidence,
                    'detection_count': 0 if is_healthy else 1,
                    'bounding_boxes': [],
                    'prediction_method': 'roboflow_classification',
                    'source': 'roboflow',
                    'is_healthy': is_healthy,
                    'model_info': {
                        'workspace': self.workspace,
                        'project': self.project,
                        'version': self.version
                    }
                }
                formatted_predictions.append(formatted_pred)
                logger.info(f"Roboflow classified as {top_class} with {confidence:.1f}% confidence")
            
            return formatted_predictions
        
        # Handle predictions array format (could be classification or detection)
        if 'predictions' in roboflow_response:
            predictions_list = roboflow_response.get('predictions', [])
            
            if predictions_list and isinstance(predictions_list, list) and len(predictions_list) > 0:
                # Check if first prediction has bounding box (object detection) or just class (classification)
                first_pred = predictions_list[0]
                
                if 'x' in first_pred and 'y' in first_pred:
                    # Object detection format - handled below
                    logger.info("Processing object detection response")
                else:
                    # Classification format in predictions array
                    logger.info("Processing classification response (predictions array format)")
                    for pred in predictions_list:
                        # Extract class name - try 'class' first, then 'className', then 'top'
                        disease_class = pred.get('class') or pred.get('className') or pred.get('top') or 'Unknown'
                        confidence = pred.get('confidence', 0)
                        
                        # Convert confidence to percentage if it's a decimal
                        if confidence <= 1.0:
                            confidence = confidence * 100
                        
                        if confidence > 0:
                            # Check if it's a healthy classification
                            is_healthy = disease_class.lower() in ['healthy', 'normal', 'no_disease', 'nodisease']
                            
                            formatted_pred = {
                                'disease_name': self._format_disease_name(disease_class),
                                'confidence_score': confidence,
                                'detection_count': 0 if is_healthy else 1,
                                'bounding_boxes': [],
                                'prediction_method': 'roboflow_classification',
                                'source': 'roboflow',
                                'is_healthy': is_healthy,
                                'model_info': {
                                    'workspace': self.workspace,
                                    'project': self.project,
                                    'version': self.version
                                }
                            }
                            formatted_predictions.append(formatted_pred)
                            logger.info(f"Added prediction: {disease_class} with {confidence:.1f}% confidence ({'healthy' if is_healthy else 'disease'})")
                    
                    if formatted_predictions:
                        logger.info(f"Formatted {len(formatted_predictions)} classification predictions")
                        return formatted_predictions
            else:
                logger.warning("Predictions array is empty or invalid")
        
        # Object detection model response
        predictions = roboflow_response.get('predictions', [])
        
        if not predictions:
            logger.info("No Lumpy Skin Disease detected in image")
            return []
        
        # Group detections by class
        disease_detections = {}
        
        for pred in predictions:
            # Extract class name - try 'class' first, then 'className'
            disease_class = pred.get('class') or pred.get('className') or 'Unknown'
            confidence = pred.get('confidence', 0) * 100  # Convert to percentage
            
            # Get bounding box coordinates
            bbox = {
                'x': pred.get('x'),
                'y': pred.get('y'),
                'width': pred.get('width'),
                'height': pred.get('height')
            }
            
            if disease_class not in disease_detections:
                disease_detections[disease_class] = {
                    'detections': [],
                    'max_confidence': confidence,
                    'count': 0
                }
            
            disease_detections[disease_class]['detections'].append({
                'confidence': confidence,
                'bbox': bbox
            })
            disease_detections[disease_class]['count'] += 1
            disease_detections[disease_class]['max_confidence'] = max(
                disease_detections[disease_class]['max_confidence'],
                confidence
            )
        
        # Format for our system
        for disease_class, data in disease_detections.items():
            formatted_pred = {
                'disease_name': self._format_disease_name(disease_class),
                'confidence_score': data['max_confidence'],
                'detection_count': data['count'],
                'bounding_boxes': [d['bbox'] for d in data['detections']],
                'prediction_method': 'roboflow_object_detection',
                'source': 'roboflow',
                'model_info': {
                    'workspace': self.workspace,
                    'project': self.project,
                    'version': self.version
                }
            }
            
            formatted_predictions.append(formatted_pred)
        
        # Sort by confidence
        formatted_predictions.sort(
            key=lambda x: x['confidence_score'],
            reverse=True
        )
        
        logger.info(f"Roboflow detected {len(formatted_predictions)} disease(s) with {sum(p['detection_count'] for p in formatted_predictions)} total lesions")
        
        return formatted_predictions
    
    def _format_disease_name(self, class_name):
        """Return the class name as-is from Roboflow."""
        if not class_name:
            return 'Unknown'
        
        # Return the exact class name from Roboflow without any transformation
        return class_name
    
    def get_model_info(self):
        """Get information about the loaded model."""
        return {
            'model_type': 'roboflow',
            'workspace': self.workspace,
            'project': self.project,
            'version': self.version,
            'status': 'active' if self.model_loaded else 'inactive',
            'disease_focus': 'Lumpy Skin Disease',
            'detection_type': 'object_detection'
        }
    
    def visualize_predictions(self, image_path, predictions, output_path=None):
        """
        Draw bounding boxes on image to visualize detections.
        
        Args:
            image_path: Path to original image
            predictions: Predictions from predict_from_file or predict_from_base64
            output_path: Where to save annotated image (optional)
            
        Returns:
            PIL Image with bounding boxes drawn
        """
        from PIL import ImageDraw, ImageFont
        
        image = Image.open(image_path) if isinstance(image_path, str) else image_path
        draw = ImageDraw.Draw(image)
        
        # Try to load a font
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple']
        
        for idx, pred in enumerate(predictions):
            color = colors[idx % len(colors)]
            disease_name = pred['disease_name']
            confidence = pred['confidence_score']
            
            for bbox in pred['bounding_boxes']:
                # Calculate box coordinates
                x, y, w, h = bbox['x'], bbox['y'], bbox['width'], bbox['height']
                left = x - w/2
                top = y - h/2
                right = x + w/2
                bottom = y + h/2
                
                # Draw rectangle
                draw.rectangle([left, top, right, bottom], outline=color, width=3)
                
                # Draw label
                label = f"{disease_name} ({confidence:.1f}%)"
                draw.text((left, top-25), label, fill=color, font=font)
        
        if output_path:
            image.save(output_path)
        
        return image
