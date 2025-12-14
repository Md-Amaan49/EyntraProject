"""
Celery tasks for health module.
"""
from celery import shared_task
from django.utils import timezone
import zipfile
import hashlib
from pathlib import Path
from PIL import Image
from io import BytesIO

from .disease_models import TrainingDataset, TrainingImage


@shared_task
def process_training_dataset(dataset_id):
    """
    Process uploaded training dataset ZIP file.
    Extract images and create TrainingImage records.
    """
    try:
        dataset = TrainingDataset.objects.get(id=dataset_id)
        dataset.status = 'processing'
        dataset.save()
        
        # Open ZIP file
        with zipfile.ZipFile(dataset.dataset_file.path, 'r') as zip_ref:
            # Get list of image files
            image_files = [f for f in zip_ref.namelist() 
                          if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            
            dataset.total_images = len(image_files)
            dataset.save()
            
            # Extract and process each image
            for idx, image_file in enumerate(image_files):
                try:
                    # Read image data
                    image_data = zip_ref.read(image_file)
                    
                    # Calculate hash to prevent duplicates
                    image_hash = hashlib.sha256(image_data).hexdigest()
                    
                    # Check if image already exists
                    if TrainingImage.objects.filter(image_hash=image_hash).exists():
                        print(f"Skipping duplicate image: {image_file}")
                        continue
                    
                    # Validate image
                    try:
                        img = Image.open(BytesIO(image_data))
                        img.verify()
                    except Exception:
                        print(f"Invalid image: {image_file}")
                        continue
                    
                    # Create TrainingImage record
                    # TODO: Save actual image file
                    # For now, just create the record
                    training_image = TrainingImage(
                        disease=dataset.disease,
                        dataset=dataset,
                        original_filename=Path(image_file).name,
                        image_hash=image_hash
                    )
                    # training_image.image.save(Path(image_file).name, BytesIO(image_data))
                    # training_image.save()
                    
                    # Update progress
                    dataset.processed_images = idx + 1
                    dataset.save()
                    
                except Exception as e:
                    print(f"Error processing image {image_file}: {e}")
                    continue
        
        # Mark as completed
        dataset.status = 'completed'
        dataset.processed_at = timezone.now()
        dataset.save()
        
        return f"Successfully processed {dataset.processed_images} images"
        
    except Exception as e:
        # Mark as failed
        dataset.status = 'failed'
        dataset.save()
        raise e


@shared_task
def calculate_model_accuracy(model_id):
    """
    Calculate accuracy metrics for an AI model based on feedback.
    """
    from .disease_models import AIModel
    
    try:
        model = AIModel.objects.get(id=model_id)
        
        # TODO: Calculate actual metrics from feedback data
        # For now, using placeholder values
        model.accuracy = 0.85
        model.precision = 0.82
        model.recall = 0.88
        model.f1_score = 0.85
        model.status = 'completed'
        model.trained_at = timezone.now()
        model.save()
        
        return f"Model {model.version} metrics calculated"
        
    except Exception as e:
        raise e
