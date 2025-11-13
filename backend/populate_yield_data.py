"""
Script to populate the yield dataset with sample cinnamon data for Sri Lanka
This can be used as a template for your actual dataset
"""

import sys
import os
import asyncio
from datetime import datetime

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db, create_db_and_tables
from app.models.yield_weather import YieldDataset
from sqlmodel import Session

# Sample cinnamon yield data for Sri Lanka
SAMPLE_YIELD_DATA = [
    # Ceylon Cinnamon data (Premium variety)
    {"location": "Matara", "variety": "Ceylon Cinnamon", "area": 1.0, "yield_amount": 2800, "rainfall": 2500, "temperature": 26, "age_years": 5},
    {"location": "Matara", "variety": "Ceylon Cinnamon", "area": 2.0, "yield_amount": 5200, "rainfall": 2400, "temperature": 27, "age_years": 7},
    {"location": "Matara", "variety": "Ceylon Cinnamon", "area": 0.5, "yield_amount": 1300, "rainfall": 2600, "temperature": 25, "age_years": 3},
    {"location": "Galle", "variety": "Ceylon Cinnamon", "area": 1.5, "yield_amount": 4100, "rainfall": 2300, "temperature": 26, "age_years": 6},
    {"location": "Galle", "variety": "Ceylon Cinnamon", "area": 3.0, "yield_amount": 7500, "rainfall": 2200, "temperature": 27, "age_years": 8},
    {"location": "Galle", "variety": "Ceylon Cinnamon", "area": 0.8, "yield_amount": 2100, "rainfall": 2400, "temperature": 25, "age_years": 4},
    
    # Cassia Cinnamon data (Higher yield variety)
    {"location": "Kandy", "variety": "Cassia Cinnamon", "area": 1.0, "yield_amount": 3200, "rainfall": 1800, "temperature": 24, "age_years": 5},
    {"location": "Kandy", "variety": "Cassia Cinnamon", "area": 2.0, "yield_amount": 6100, "rainfall": 1900, "temperature": 23, "age_years": 6},
    {"location": "Kandy", "variety": "Cassia Cinnamon", "area": 1.5, "yield_amount": 4700, "rainfall": 1700, "temperature": 25, "age_years": 7},
    {"location": "Nuwara Eliya", "variety": "Cassia Cinnamon", "area": 0.7, "yield_amount": 2200, "rainfall": 2000, "temperature": 20, "age_years": 4},
    {"location": "Nuwara Eliya", "variety": "Cassia Cinnamon", "area": 2.5, "yield_amount": 7800, "rainfall": 2100, "temperature": 21, "age_years": 8},
    
    # Mixed/Other locations
    {"location": "Colombo", "variety": "Ceylon Cinnamon", "area": 0.3, "yield_amount": 850, "rainfall": 2400, "temperature": 28, "age_years": 3},
    {"location": "Colombo", "variety": "Ceylon Cinnamon", "area": 1.2, "yield_amount": 3100, "rainfall": 2300, "temperature": 29, "age_years": 5},
    {"location": "Ratnapura", "variety": "Ceylon Cinnamon", "area": 2.2, "yield_amount": 5900, "rainfall": 3000, "temperature": 25, "age_years": 6},
    {"location": "Ratnapura", "variety": "Cassia Cinnamon", "area": 1.8, "yield_amount": 5500, "rainfall": 2800, "temperature": 24, "age_years": 5},
    
    # Additional variations with different conditions
    {"location": "Matara", "variety": "Ceylon Cinnamon", "area": 4.0, "yield_amount": 10200, "rainfall": 2200, "temperature": 27, "age_years": 10},
    {"location": "Galle", "variety": "Cassia Cinnamon", "area": 1.3, "yield_amount": 4000, "rainfall": 2000, "temperature": 26, "age_years": 4},
    {"location": "Kandy", "variety": "Ceylon Cinnamon", "area": 0.9, "yield_amount": 2300, "rainfall": 1800, "temperature": 23, "age_years": 4},
    {"location": "Badulla", "variety": "Ceylon Cinnamon", "area": 1.7, "yield_amount": 4200, "rainfall": 1600, "temperature": 22, "age_years": 6},
    {"location": "Badulla", "variety": "Cassia Cinnamon", "area": 2.3, "yield_amount": 7100, "rainfall": 1500, "temperature": 21, "age_years": 7},
    {"location": "Kurunegala", "variety": "Ceylon Cinnamon", "area": 1.1, "yield_amount": 2700, "rainfall": 1400, "temperature": 27, "age_years": 5},
]

async def populate_yield_dataset():
    """Populate the yield dataset with sample data"""
    print("🌱 Populating yield dataset with sample cinnamon data...")
    
    # Create database and tables
    create_db_and_tables()
    
    # Get database session
    session_gen = get_db()
    session = next(session_gen)
    
    try:
        # Check if data already exists
        from sqlmodel import select
        existing_records = session.exec(select(YieldDataset)).all()
        existing_count = len(existing_records)
        
        if existing_count > 0:
            print(f"⚠️  Dataset already contains {existing_count} records")
            response = input("Do you want to add more sample data? (y/n): ")
            if response.lower() != 'y':
                print("Skipping data population")
                return
        
        # Add sample data
        records_added = 0
        for data in SAMPLE_YIELD_DATA:
            record = YieldDataset(
                location=data["location"],
                variety=data["variety"], 
                area=data["area"],
                yield_amount=data["yield_amount"],
                rainfall=data["rainfall"],
                temperature=data["temperature"],
                age_years=data["age_years"],
                soil_type="Loamy"  # Default soil type for Sri Lankan cinnamon farms
            )
            session.add(record)
            records_added += 1
        
        session.commit()
        
        print(f"✅ Successfully added {records_added} yield dataset records")
        print(f"📊 Total records in dataset: {existing_count + records_added}")
        
        # Display some statistics
        print("\n📈 Dataset Statistics:")
        print(f"   • Locations: {len(set([d['location'] for d in SAMPLE_YIELD_DATA]))}")
        print(f"   • Varieties: {len(set([d['variety'] for d in SAMPLE_YIELD_DATA]))}")
        print(f"   • Total Area: {sum([d['area'] for d in SAMPLE_YIELD_DATA])} ha")
        print(f"   • Average Yield: {sum([d['yield_amount'] for d in SAMPLE_YIELD_DATA])/len(SAMPLE_YIELD_DATA):.1f} kg")
        
        # Calculate yield per hectare by variety
        ceylon_yields = [d['yield_amount']/d['area'] for d in SAMPLE_YIELD_DATA if 'Ceylon' in d['variety']]
        cassia_yields = [d['yield_amount']/d['area'] for d in SAMPLE_YIELD_DATA if 'Cassia' in d['variety']]
        
        if ceylon_yields:
            print(f"   • Ceylon Cinnamon avg: {sum(ceylon_yields)/len(ceylon_yields):.1f} kg/ha")
        if cassia_yields:
            print(f"   • Cassia Cinnamon avg: {sum(cassia_yields)/len(cassia_yields):.1f} kg/ha")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error populating dataset: {e}")
        raise
    finally:
        session.close()

def create_csv_template():
    """Create a CSV template for uploading your own dataset"""
    import csv
    
    csv_filename = "yield_dataset_template.csv"
    
    with open(csv_filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['location', 'variety', 'area', 'yield_amount', 'soil_type', 'rainfall', 'temperature', 'age_years']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        # Add a few sample rows
        for data in SAMPLE_YIELD_DATA[:5]:
            row = dict(data)
            row['soil_type'] = 'Loamy'
            writer.writerow(row)
    
    print(f"📁 Created CSV template: {csv_filename}")
    print("   You can modify this file with your actual data and upload it via the API")
    print("   Required columns: location, variety, area, yield_amount")
    print("   Optional columns: soil_type, rainfall, temperature, age_years")

if __name__ == "__main__":
    print("🌿 Cinnamon Yield Dataset Setup")
    print("=" * 40)
    
    choice = input("""
Choose an option:
1. Populate database with sample data
2. Create CSV template for your own data
3. Both

Enter choice (1-3): """)
    
    if choice in ['1', '3']:
        asyncio.run(populate_yield_dataset())
    
    if choice in ['2', '3']:
        create_csv_template()
    
    print("\n✨ Setup complete! You can now:")
    print("   • Train the ML model via API: POST /api/v1/ml/train-model")
    print("   • Make predictions via API: POST /api/v1/ml/predict-single")
    print("   • Upload your own data via API: POST /api/v1/yield-dataset/bulk-upload")