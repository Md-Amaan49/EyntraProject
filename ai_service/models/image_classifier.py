"""
CNN-based image classifier for cattle disease detection.
"""
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import cv2
from PIL import Image
import base64
from io import BytesIO
import logging

logger = logging.getLogger(__name__)


class CattleDiseaseImageClassifier:
    """CNN model for classifying cattle diseases from images."""
    
    def __init__(self, model_path=None, input_shape=(224, 224, 3), num_classes=10):
        """
        Initialize the image classifier.
        
        Args:
            model_path: Path to pre-trained model file
            input_shape: Input image shape (height, width, channels)
            num_classes: Number of disease classes
        """
        self.input_shape = input_shape
        self.num_classes = num_classes
        self.model = None
        self.class_names = []
        
        if model_path:
            self.load_model(model_path)
        else:
            self.model = self._create_model()
    
    def _create_model(self):
        """Create a CNN model for disease classification."""
        model = keras.Sequential([
            # Data augmentation layers
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.1),
            layers.RandomZoom(0.1),
            
            # Rescaling
            layers.Rescaling(1./255),
            
            # Convolutional base
            layers.Conv2D(32, 3, activation='relu', input_shape=self.input_shape),
            layers.MaxPooling2D(),
            layers.Conv2D(64, 3, activation='relu'),
            layers.MaxPooling2D(),
            layers.Conv2D(128, 3, activation='relu'),
            layers.MaxPooling2D(),
            layers.Conv2D(256, 3, activation='relu'),
            layers.MaxPooling2D(),
            
            # Classifier head
            layers.Flatten(),
            layers.Dropout(0.5),
            layers.Dense(512, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(self.num_classes, activation='softmax')
        ])
        
        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy', 'top_k_categorical_accuracy']
        )
        
        return model
    
    def _create_transfer_learning_model(self):
        """Create a model using transfer learning with MobileNetV2."""
        # Load pre-trained MobileNetV2
        base_model = keras.applications.MobileNetV2(
            input_shape=self.input_shape,
            include_top=False,
            weights='imagenet'
        )
        
        # Freeze base model
        base_model.trainable = False
        
        # Add custom classifier
        model = keras.Sequential([
            layers.Rescaling(1./255),
            base_model,
            layers.GlobalAveragePooling2D(),
            layers.Dropout(0.2),
            layers.Dense(128, activation='relu'),
            layers.Dropout(0.2),
            layers.Dense(self.num_classes, activation='softmax')
        ])
        
        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy', 'top_k_categorical_accuracy']
        )
        
        return model
    
    def preprocess_image(self, image_data):
        """
        Preprocess image for model input.
        
        Args:
            image_data: Base64 encoded image or PIL Image
            
        Returns:
            Preprocessed numpy array
        """
        try:
            # Handle base64 encoded images
            if isinstance(image_data, str):
                image_bytes = base64.b64decode(image_data)
                image = Image.open(BytesIO(image_bytes))
            elif isinstance(image_data, Image.Image):
                image = image_data
            else:
                raise ValueError("Unsupported image format")
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize to model input size
            image = image.resize((self.input_shape[1], self.input_shape[0]))
            
            # Convert to numpy array
            image_array = np.array(image)
            
            # Add batch dimension
            image_array = np.expand_dims(image_array, axis=0)
            
            return image_array
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            raise ValueError(f"Failed to preprocess image: {str(e)}")
    
    def predict(self, images, return_probabilities=True):
        """
        Predict diseases from images.
        
        Args:
            images: List of image data (base64 or PIL Images)
            return_probabilities: Whether to return class probabilities
            
        Returns:
            List of predictions with confidence scores
        """
        if not self.model:
            raise ValueError("Model not loaded")
        
        predictions = []
        
        for i, image_data in enumerate(images):
            try:
                # Preprocess image
                processed_image = self.preprocess_image(image_data)
                
                # Make prediction
                pred_probs = self.model.predict(processed_image, verbose=0)
                
                # Get top predictions
                top_indices = np.argsort(pred_probs[0])[::-1][:3]  # Top 3
                
                image_predictions = []
                for idx in top_indices:
                    confidence = float(pred_probs[0][idx])
                    if confidence > 0.1:  # Only include predictions with >10% confidence
                        disease_name = self.class_names[idx] if idx < len(self.class_names) else f"Disease_{idx}"
                        
                        image_predictions.append({
                            'disease_name': disease_name,
                            'confidence_score': confidence * 100,  # Convert to percentage
                            'prediction_method': 'cnn_image_classification',
                            'image_index': i
                        })
                
                predictions.extend(image_predictions)
                
            except Exception as e:
                logger.error(f"Error predicting image {i}: {e}")
                continue
        
        return predictions
    
    def extract_features(self, images):
        """
        Extract features from images using the CNN.
        
        Args:
            images: List of image data
            
        Returns:
            Feature vectors for each image
        """
        if not self.model:
            raise ValueError("Model not loaded")
        
        # Create feature extraction model (without final classification layer)
        feature_model = keras.Model(
            inputs=self.model.input,
            outputs=self.model.layers[-3].output  # Before final dense layer
        )
        
        features = []
        for image_data in images:
            try:
                processed_image = self.preprocess_image(image_data)
                feature_vector = feature_model.predict(processed_image, verbose=0)
                features.append(feature_vector.flatten())
            except Exception as e:
                logger.error(f"Error extracting features: {e}")
                features.append(np.zeros(512))  # Default feature vector
        
        return np.array(features)
    
    def load_model(self, model_path):
        """Load a pre-trained model."""
        try:
            self.model = keras.models.load_model(model_path)
            logger.info(f"Loaded model from {model_path}")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise ValueError(f"Failed to load model from {model_path}")
    
    def save_model(self, model_path):
        """Save the current model."""
        if self.model:
            self.model.save(model_path)
            logger.info(f"Model saved to {model_path}")
        else:
            raise ValueError("No model to save")
    
    def set_class_names(self, class_names):
        """Set the class names for predictions."""
        self.class_names = class_names
        logger.info(f"Set {len(class_names)} class names")
    
    def get_model_summary(self):
        """Get model architecture summary."""
        if self.model:
            return self.model.summary()
        return "No model loaded"


class ImagePreprocessor:
    """Utility class for advanced image preprocessing."""
    
    @staticmethod
    def enhance_image(image_array):
        """Apply image enhancement techniques."""
        # Convert to OpenCV format
        cv_image = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        lab = cv2.cvtColor(cv_image, cv2.COLOR_BGR2LAB)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        lab[:, :, 0] = clahe.apply(lab[:, :, 0])
        enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        
        # Convert back to RGB
        enhanced_rgb = cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB)
        
        return enhanced_rgb
    
    @staticmethod
    def detect_regions_of_interest(image_array):
        """Detect potential disease regions in the image."""
        # Convert to grayscale
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        
        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Edge detection
        edges = cv2.Canny(blurred, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours by area
        min_area = 100
        regions = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > min_area:
                x, y, w, h = cv2.boundingRect(contour)
                regions.append({
                    'bbox': (x, y, w, h),
                    'area': area,
                    'contour': contour
                })
        
        # Sort by area (largest first)
        regions.sort(key=lambda x: x['area'], reverse=True)
        
        return regions[:5]  # Return top 5 regions
    
    @staticmethod
    def calculate_image_quality_score(image_array):
        """Calculate image quality score based on various metrics."""
        # Convert to grayscale
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        
        # Calculate sharpness (Laplacian variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness_score = min(laplacian_var / 1000, 1.0)  # Normalize
        
        # Calculate brightness
        brightness = np.mean(gray) / 255.0
        brightness_score = 1.0 - abs(brightness - 0.5) * 2  # Prefer mid-range brightness
        
        # Calculate contrast
        contrast = np.std(gray) / 255.0
        contrast_score = min(contrast * 2, 1.0)  # Normalize
        
        # Overall quality score
        quality_score = (sharpness_score * 0.5 + brightness_score * 0.3 + contrast_score * 0.2)
        
        return {
            'overall_score': quality_score,
            'sharpness': sharpness_score,
            'brightness': brightness_score,
            'contrast': contrast_score
        }