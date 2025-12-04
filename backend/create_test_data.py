#!/usr/bin/env python3
"""Create test data for hybrid yield testing"""

import sys
import os
from datetime import datetime, timedelta

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import get_session
from app.models.yield_weather.farm import Farm, Plot
from app.models.yield_weather.tree import Tree

def create_test_data():
    """Create basic test data for testing hybrid yield APIs"""
    
    session = next(get_session())
    
    try:
        # Check if test data already exists
        existing_farm = session.query(Farm).filter(Farm.id == 1).first()
        if existing_farm:
            print("✅ Test farm already exists")
        else:
            # Create test farm
            test_farm = Farm(
                name="Test Cinnamon Farm",
                owner_name="Test Farmer",
                total_area=10.0,
                num_plots=3,
                location="Colombo, Sri Lanka",
                latitude=6.9271,
                longitude=79.8612
            )
            session.add(test_farm)
            session.commit()
            print("✅ Created test farm")
        
        # Check if test plot exists
        existing_plot = session.query(Plot).filter(Plot.id == 1).first()
        if existing_plot:
            print("✅ Test plot already exists")
            plot_id = existing_plot.id
        else:
            # Create test plot
            test_plot = Plot(
                farm_id=1,
                name="Test Plot A",
                area=2.5,
                crop_type="Ceylon Cinnamon",
                status="MATURE",
                cinnamon_variety="Ceylon",
                total_trees=50,
                seedling_count=50,
                planting_date=datetime.now() - timedelta(days=365*5)  # 5 years old
            )
            session.add(test_plot)
            session.commit()
            plot_id = test_plot.id
            print(f"✅ Created test plot with ID: {plot_id}")
        
        # Check if test trees exist
        existing_trees = session.query(Tree).filter(Tree.plot_id == plot_id).count()
        if existing_trees > 0:
            print(f"✅ {existing_trees} test trees already exist")
        else:
            # Create some test trees
            test_trees = []
            for i in range(5):  # Create 5 sample trees
                tree = Tree(
                    plot_id=plot_id,
                    tree_code=f"TR-001-{i+1:03d}",
                    location_x=i * 2.0,
                    location_y=1.5,
                    planting_date=datetime.now() - timedelta(days=365*5),
                    variety="Ceylon",
                    tree_age_years=5,
                    stem_count=8,
                    stem_diameter_mm=15.5,
                    is_active=True
                )
                test_trees.append(tree)
            
            session.add_all(test_trees)
            session.commit()
            print(f"✅ Created {len(test_trees)} test trees")
        
        print("\n🎉 Test data setup complete!")
        print(f"📊 Database now has:")
        print(f"   • Farm ID 1: 'Test Cinnamon Farm'")
        print(f"   • Plot ID {plot_id}: 'Test Plot A' (2.5 ha, 50 trees)")
        print(f"   • Trees: {session.query(Tree).filter(Tree.plot_id == plot_id).count()} trees")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        session.rollback()
        return False
    finally:
        session.close()

if __name__ == "__main__":
    if create_test_data():
        print("\n✅ Test data created successfully!")
        print("🧪 You can now test the hybrid yield prediction APIs!")
    else:
        print("\n❌ Failed to create test data")
        sys.exit(1)