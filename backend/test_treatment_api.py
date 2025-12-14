"""
Simple test script for treatment recommendation API endpoints.
"""
import requests
import json

# Test data
test_predictions = [
    {
        "diseaseName": "Mastitis",
        "confidenceScore": 85.5,
        "severityLevel": "moderate",
        "description": "Inflammation of mammary gland"
    },
    {
        "diseaseName": "Foot and Mouth Disease",
        "confidenceScore": 72.3,
        "severityLevel": "high",
        "description": "Viral infection affecting hooves and mouth"
    }
]

test_cattle_metadata = {
    "breed": "Holstein",
    "age": 5,
    "gender": "female",
    "weight": 650.5
}

# Test general treatment recommendations
def test_general_recommendations():
    url = "http://localhost:8000/api/health/treatments/recommend/"
    
    payload = {
        "disease_predictions": test_predictions,
        "cattle_metadata": test_cattle_metadata,
        "preference": "balanced"
    }
    
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Testing Treatment Recommendation API...")
    print("=" * 50)
    
    success = test_general_recommendations()
    
    if success:
        print("\n✅ Treatment recommendation API is working!")
    else:
        print("\n❌ Treatment recommendation API test failed!")