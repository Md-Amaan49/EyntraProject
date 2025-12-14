"""
Management command to seed treatment database with sample data.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from health.treatment_models import TreatmentCategory, Treatment, TreatmentRecommendation
from health.disease_models import Disease

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed treatment database with sample data'
    
    def handle(self, *args, **options):
        self.stdout.write('Seeding treatment database...')
        
        # Create treatment categories
        self.create_categories()
        
        # Create sample treatments
        self.create_treatments()
        
        self.stdout.write(
            self.style.SUCCESS('Successfully seeded treatment database')
        )
    
    def create_categories(self):
        """Create treatment categories."""
        categories = [
            {
                'name': 'Herbal Remedies',
                'category_type': 'traditional',
                'description': 'Traditional herbal treatments using local plants and herbs'
            },
            {
                'name': 'Home Remedies',
                'category_type': 'traditional',
                'description': 'Traditional home-based treatments using common household items'
            },
            {
                'name': 'Antibiotics',
                'category_type': 'allopathic',
                'description': 'Modern antibiotic medications'
            },
            {
                'name': 'Anti-inflammatory',
                'category_type': 'allopathic',
                'description': 'Modern anti-inflammatory medications'
            },
            {
                'name': 'Supportive Care',
                'category_type': 'supportive',
                'description': 'General supportive care measures'
            },
            {
                'name': 'Preventive Measures',
                'category_type': 'preventive',
                'description': 'Preventive treatments and vaccinations'
            }
        ]
        
        for cat_data in categories:
            category, created = TreatmentCategory.objects.get_or_create(
                name=cat_data['name'],
                defaults=cat_data
            )
            if created:
                self.stdout.write(f'Created category: {category.name}')
    
    def create_treatments(self):
        """Create sample treatments."""
        # Get categories
        herbal = TreatmentCategory.objects.get(name='Herbal Remedies')
        home = TreatmentCategory.objects.get(name='Home Remedies')
        antibiotics = TreatmentCategory.objects.get(name='Antibiotics')
        anti_inflammatory = TreatmentCategory.objects.get(name='Anti-inflammatory')
        supportive = TreatmentCategory.objects.get(name='Supportive Care')
        
        treatments = [
            # Traditional treatments
            {
                'name': 'Neem and Turmeric Paste',
                'category': herbal,
                'description': 'Traditional herbal remedy for skin conditions and infections',
                'ingredients': ['Fresh neem leaves', 'Turmeric powder', 'Coconut oil'],
                'dosage': 'Apply paste to affected area',
                'administration_method': 'topical',
                'frequency': 'Twice daily',
                'duration': '5-7 days',
                'preparation_method': 'Grind fresh neem leaves with turmeric powder and mix with coconut oil to form a paste',
                'precautions': ['Test on small area first', 'Avoid contact with eyes'],
                'side_effects': ['Mild skin irritation in sensitive animals'],
                'effectiveness': 'moderate',
                'availability': 'Locally available herbs',
                'estimated_cost': 'Very low cost'
            },
            {
                'name': 'Ginger and Honey Mixture',
                'category': herbal,
                'description': 'Traditional remedy for digestive issues and respiratory problems',
                'ingredients': ['Fresh ginger', 'Pure honey', 'Warm water'],
                'dosage': '2-3 tablespoons for adult cattle',
                'administration_method': 'oral',
                'frequency': 'Three times daily',
                'duration': '3-5 days',
                'preparation_method': 'Extract ginger juice and mix with equal amount of honey, dilute with warm water',
                'precautions': ['Ensure honey is pure', 'Monitor for allergic reactions'],
                'side_effects': ['Rare allergic reactions'],
                'effectiveness': 'moderate',
                'availability': 'Common household items',
                'estimated_cost': 'Low cost'
            },
            {
                'name': 'Salt Water Solution',
                'category': home,
                'description': 'Simple saline solution for wound cleaning and minor infections',
                'ingredients': ['Clean salt', 'Boiled water'],
                'dosage': 'As needed for cleaning',
                'administration_method': 'topical',
                'frequency': 'As needed',
                'duration': 'Until healing',
                'preparation_method': 'Dissolve 1 teaspoon salt in 1 cup of boiled, cooled water',
                'precautions': ['Use only clean, boiled water', 'Ensure proper salt ratio'],
                'side_effects': ['Mild stinging sensation'],
                'effectiveness': 'moderate',
                'availability': 'Household items',
                'estimated_cost': 'Very low cost'
            },
            
            # Allopathic treatments
            {
                'name': 'Amoxicillin',
                'category': antibiotics,
                'description': 'Broad-spectrum antibiotic for bacterial infections',
                'ingredients': ['Amoxicillin trihydrate'],
                'dosage': '15-20 mg/kg body weight',
                'administration_method': 'oral',
                'frequency': 'Twice daily',
                'duration': '5-7 days',
                'precautions': ['Complete full course', 'Monitor for allergic reactions', 'Veterinary supervision required'],
                'side_effects': ['Diarrhea', 'Allergic reactions', 'Digestive upset'],
                'contraindications': ['Known penicillin allergy'],
                'effectiveness': 'high',
                'requires_prescription': True,
                'availability': 'Veterinary pharmacies',
                'estimated_cost': 'Moderate cost'
            },
            {
                'name': 'Meloxicam',
                'category': anti_inflammatory,
                'description': 'Non-steroidal anti-inflammatory drug for pain and inflammation',
                'ingredients': ['Meloxicam'],
                'dosage': '0.5 mg/kg body weight',
                'administration_method': 'oral',
                'frequency': 'Once daily',
                'duration': '3-5 days',
                'precautions': ['Monitor kidney function', 'Avoid in dehydrated animals', 'Veterinary supervision required'],
                'side_effects': ['Gastrointestinal upset', 'Kidney problems with prolonged use'],
                'contraindications': ['Kidney disease', 'Severe dehydration'],
                'effectiveness': 'high',
                'requires_prescription': True,
                'availability': 'Veterinary pharmacies',
                'estimated_cost': 'Moderate cost'
            },
            
            # Supportive care
            {
                'name': 'Electrolyte Solution',
                'category': supportive,
                'description': 'Oral rehydration solution for dehydrated animals',
                'ingredients': ['Sodium chloride', 'Potassium chloride', 'Glucose', 'Water'],
                'dosage': '50-100 ml/kg body weight',
                'administration_method': 'oral',
                'frequency': 'As needed',
                'duration': 'Until rehydrated',
                'precautions': ['Monitor hydration status', 'Ensure solution is fresh'],
                'side_effects': ['Rare - electrolyte imbalance if overdosed'],
                'effectiveness': 'high',
                'availability': 'Veterinary supplies or pharmacy',
                'estimated_cost': 'Low to moderate cost'
            }
        ]
        
        for treatment_data in treatments:
            treatment, created = Treatment.objects.get_or_create(
                name=treatment_data['name'],
                defaults=treatment_data
            )
            if created:
                self.stdout.write(f'Created treatment: {treatment.name}')