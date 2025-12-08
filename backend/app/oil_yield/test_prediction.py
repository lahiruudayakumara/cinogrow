# app/oil_yield/test_prediction.py
"""
Test script to demonstrate oil yield prediction with real data examples
"""
from .model import load_model
import numpy as np

def test_predictions():
    """Test the model with sample inputs"""
    model = load_model()
    
    print("\n" + "="*60)
    print("CINNAMON OIL YIELD PREDICTION - TEST CASES")
    print("="*60)
    
    # Test Case 1: Sri Gemunu, Leaves & Twigs, October-December season
    print("\n📋 Test Case 1:")
    print("   Species: Sri Gemunu")
    print("   Plant Part: Leaves & Twigs")
    print("   Dried Mass: 300 kg")
    print("   Age: 4.0 years")
    print("   Season: October–December/January")
    
    X1 = np.array([[300, 0, 1, 4.0, 1]])  # [mass, species, part, age, season]
    pred1 = model.predict(X1)[0]
    print(f"   ➜ Predicted Oil Yield: {pred1:.2f} L")
    
    # Test Case 2: Sri Vijaya, Featherings & Chips, May-August season
    print("\n📋 Test Case 2:")
    print("   Species: Sri Vijaya")
    print("   Plant Part: Featherings & Chips")
    print("   Dried Mass: 150 kg")
    print("   Age: 3.5 years")
    print("   Season: May–August")
    
    X2 = np.array([[150, 1, 0, 3.5, 0]])
    pred2 = model.predict(X2)[0]
    print(f"   ➜ Predicted Oil Yield: {pred2:.2f} L")
    
    # Test Case 3: Sri Gemunu, Leaves & Twigs, high mass
    print("\n📋 Test Case 3:")
    print("   Species: Sri Gemunu")
    print("   Plant Part: Leaves & Twigs")
    print("   Dried Mass: 500 kg")
    print("   Age: 5.0 years")
    print("   Season: October–December/January")
    
    X3 = np.array([[500, 0, 1, 5.0, 1]])
    pred3 = model.predict(X3)[0]
    print(f"   ➜ Predicted Oil Yield: {pred3:.2f} L")
    
    # Test Case 4: Sri Vijaya, Leaves & Twigs, young plant
    print("\n📋 Test Case 4:")
    print("   Species: Sri Vijaya")
    print("   Plant Part: Leaves & Twigs")
    print("   Dried Mass: 200 kg")
    print("   Age: 2.5 years")
    print("   Season: May–August")
    
    X4 = np.array([[200, 1, 1, 2.5, 0]])
    pred4 = model.predict(X4)[0]
    print(f"   ➜ Predicted Oil Yield: {pred4:.2f} L")
    
    print("\n" + "="*60)
    print("KEY INSIGHTS:")
    print("- Leaves & Twigs generally produce more oil than Featherings & Chips")
    print("- Higher dried mass typically results in higher oil yield")
    print("- Season and plant age also influence the yield")
    print("="*60 + "\n")

if __name__ == "__main__":
    test_predictions()
