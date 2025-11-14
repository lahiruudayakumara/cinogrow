import sys
sys.path.insert(0, 'c:/Users/nimsa/OneDrive/Desktop/Research/cinogrow/backend')

from app.database import get_db
from app.models.yield_weather.farm import Farm
from sqlmodel import select

try:
    print("Testing database connection...")
    db = next(get_db())
    
    print("Querying farms...")
    farms = db.exec(select(Farm)).all()
    
    print(f"✅ Success! Found {len(farms)} farms")
    for farm in farms:
        print(f"  - {farm.name} (ID: {farm.id})")
        print(f"    Owner: {farm.owner_name}")
        print(f"    Area: {farm.total_area} ha")
        print(f"    Plots: {farm.num_plots}")
        print(f"    Location: {farm.location}")
        print()
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
