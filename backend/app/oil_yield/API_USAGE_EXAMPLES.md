# Example API Request for Oil Yield Prediction

## Test the API endpoint with curl or Python

### Example 1: Sri Gemunu, Leaves & Twigs
```bash
curl -X POST "http://localhost:8000/oil_yield/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "dried_mass_kg": 300,
    "species_variety": "Sri Gemunu",
    "plant_part": "Leaves & Twigs",
    "age_years": 4.0,
    "harvesting_season": "October–December/January"
  }'
```

### Example 2: Sri Vijaya, Featherings & Chips
```bash
curl -X POST "http://localhost:8000/oil_yield/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "dried_mass_kg": 150,
    "species_variety": "Sri Vijaya",
    "plant_part": "Featherings & Chips",
    "age_years": 3.5,
    "harvesting_season": "May–August"
  }'
```

### Python Example:
```python
import requests

url = "http://localhost:8000/oil_yield/predict"
data = {
    "dried_mass_kg": 300,
    "species_variety": "Sri Gemunu",
    "plant_part": "Leaves & Twigs",
    "age_years": 4.0,
    "harvesting_season": "October–December/January"
}

response = requests.post(url, json=data)
print(response.json())
```

### Expected Response Format:
```json
{
  "predicted_yield_liters": 5.30,
  "input_summary": {
    "dried_mass_kg": 300.0,
    "species_variety": "Sri Gemunu",
    "plant_part": "Leaves & Twigs",
    "age_years": 4.0,
    "harvesting_season": "October–December/January"
  }
}
```

## Valid Input Values:

- **species_variety**: "Sri Gemunu" or "Sri Vijaya"
- **plant_part**: "Leaves & Twigs" or "Featherings & Chips"
- **harvesting_season**: "May–August" or "October–December/January"
- **dried_mass_kg**: Any positive number (kg)
- **age_years**: Any positive number (years)

## Model Performance:
- Mean Absolute Error: 0.168 L
- R² Score: 0.969
- Training samples: 80
- Test samples: 20
