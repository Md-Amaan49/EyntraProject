"""
Utility functions for cattle management.
"""
import os
from PIL import Image, ImageOps
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import io


def compress_image(image_file, max_size=(800, 600), quality=85):
    """
    Compress and resize an image while maintaining aspect ratio.
    
    Args:
        image_file: Django UploadedFile object
        max_size: Tuple of (max_width, max_height)
        quality: JPEG quality (1-100)
    
    Returns:
        ContentFile with compressed image
    """
    try:
        # Open the image
        with Image.open(image_file) as img:
            # Convert to RGB if necessary (for PNG with transparency)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Create a white background
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Auto-rotate based on EXIF data
            img = ImageOps.exif_transpose(img)
            
            # Resize while maintaining aspect ratio
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save to bytes
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=quality, optimize=True)
            output.seek(0)
            
            # Create new filename with .jpg extension
            original_name = os.path.splitext(image_file.name)[0]
            new_filename = f"{original_name}_compressed.jpg"
            
            return ContentFile(output.getvalue(), name=new_filename)
            
    except Exception as e:
        # If compression fails, return original file
        print(f"Image compression failed: {e}")
        return image_file


def create_thumbnail(image_file, size=(200, 200)):
    """
    Create a thumbnail from an image file.
    
    Args:
        image_file: Django UploadedFile object or file path
        size: Tuple of (width, height) for thumbnail
    
    Returns:
        ContentFile with thumbnail image
    """
    try:
        with Image.open(image_file) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Auto-rotate based on EXIF data
            img = ImageOps.exif_transpose(img)
            
            # Create thumbnail (crops to exact size)
            img = ImageOps.fit(img, size, Image.Resampling.LANCZOS)
            
            # Save to bytes
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=90, optimize=True)
            output.seek(0)
            
            # Create thumbnail filename
            original_name = os.path.splitext(image_file.name)[0]
            thumbnail_filename = f"{original_name}_thumb.jpg"
            
            return ContentFile(output.getvalue(), name=thumbnail_filename)
            
    except Exception as e:
        print(f"Thumbnail creation failed: {e}")
        return None


def validate_image_dimensions(image_file, min_size=(100, 100), max_size=(4000, 4000)):
    """
    Validate image dimensions.
    
    Args:
        image_file: Django UploadedFile object
        min_size: Tuple of (min_width, min_height)
        max_size: Tuple of (max_width, max_height)
    
    Returns:
        tuple: (is_valid, error_message)
    """
    try:
        with Image.open(image_file) as img:
            width, height = img.size
            
            if width < min_size[0] or height < min_size[1]:
                return False, f"Image too small. Minimum size: {min_size[0]}x{min_size[1]} pixels"
            
            if width > max_size[0] or height > max_size[1]:
                return False, f"Image too large. Maximum size: {max_size[0]}x{max_size[1]} pixels"
            
            return True, None
            
    except Exception as e:
        return False, f"Invalid image file: {str(e)}"


def get_image_info(image_file):
    """
    Get information about an image file.
    
    Args:
        image_file: Django UploadedFile object
    
    Returns:
        dict: Image information
    """
    try:
        with Image.open(image_file) as img:
            return {
                'format': img.format,
                'mode': img.mode,
                'size': img.size,
                'width': img.size[0],
                'height': img.size[1],
                'has_transparency': img.mode in ('RGBA', 'LA', 'P'),
            }
    except Exception as e:
        return {'error': str(e)}