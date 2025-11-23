"""
Script to load the CSV template data into the database
"""
import pandas as pd
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db
from app.models.yield_weather import YieldDataset
from sqlmodel import select

def load_csv_data():
    """Load data from the CSV template file"""
    print("📁 Loading data from yield_dataset_template.csv...")
    
    # Read CSV
    df = pd.read_csv('yield_dataset_template.csv')
    print(f"📊 Found {len(df)} records in CSV file")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Check existing data
        existing_records = len(db.exec(select(YieldDataset)).all())
        print(f"🗄️ Existing records in database: {existing_records}")
        
        # Add CSV data
        records_added = 0
        for _, row in df.iterrows():
            # Check if record already exists (basic duplicate check)
            existing = db.exec(
                select(YieldDataset).where(
                    (YieldDataset.location == row['location']) &
                    (YieldDataset.variety == row['variety']) &
                    (YieldDataset.area == row['area']) &
                    (YieldDataset.yield_amount == row['yield_amount'])
                )
            ).first()
            
            if not existing:
                record = YieldDataset(
                    location=row['location'],
                    variety=row['variety'],
                    area=row['area'],
                    yield_amount=row['yield_amount'],
                    soil_type=row['soil_type'] if pd.notna(row['soil_type']) else 'Loamy',
                    rainfall=row['rainfall'] if pd.notna(row['rainfall']) else 2500,
                    temperature=row['temperature'] if pd.notna(row['temperature']) else 26,
                    age_years=row['age_years'] if pd.notna(row['age_years']) else 5
                )
                db.add(record)
                records_added += 1
        
        db.commit()
        
        print(f"✅ Added {records_added} new records from CSV")
        print(f"📊 Total records now: {existing_records + records_added}")
        
        # Show some statistics
        all_records = db.exec(select(YieldDataset)).all()
        locations = set(r.location for r in all_records)
        varieties = set(r.variety for r in all_records)
        
        print(f"\n📈 Dataset Statistics:")
        print(f"   • Locations: {len(locations)} - {', '.join(list(locations)[:5])}{'...' if len(locations) > 5 else ''}")
        print(f"   • Varieties: {len(varieties)} - {', '.join(varieties)}")
        print(f"   • Total Area: {sum(r.area for r in all_records):.1f} ha")
        print(f"   • Avg Yield/ha: {sum(r.yield_amount/r.area for r in all_records)/len(all_records):.1f} kg/ha")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error loading CSV data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    load_csv_data()