"""
Test the treatment recommendation engine directly.
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cattle_health.settings')
django.setup()

from health.treatment_engine import treatment_engine

def test_treatment_engine():
    """Test the treatment recommendation engine."""
    
    # Test data
    disease_predictions = [
        {
            "diseaseName": "Mastitis",
            "confidenceScore": 85.5,
            "severityLevel": "moderate",
            "description": "Inflammation of mammary gland"
        }
    ]
    
    cattle_metadata = {
        "breed": "Holstein",
        "age": 5,
        "gender": "female",
        "weight": 650.5
    }
    
    print("Testing Treatment Recommendation Engine...")
    print("=" * 50)
    
    try:
        recommendations = treatment_engine.get_recommendations(
            disease_predictions=disease_predictions,
            cattle_metadata=cattle_metadata,
            preference='balanced'
        )
        
        print("✅ Treatment engine working!")
        print(f"Traditional treatments: {len(recommendations.get('traditional', []))}")
        print(f"Allopathic treatments: {len(recommendations.get('allopathic', []))}")
        print(f"General care items: {len(recommendations.get('general_care', []))}")
        print(f"Has disclaimer: {'disclaimer' in recommendations}")
        print(f"Veterinary consultation recommended: {recommendations.get('veterinary_consultation', {}).get('recommended', False)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_treatment_engine()