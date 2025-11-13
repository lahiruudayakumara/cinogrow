# Cinnamon variety constants extracted from yield dataset
# These should match the frontend constants

CINNAMON_VARIETIES = [
    {
        'value': 'Ceylon Cinnamon',
        'label': 'Ceylon Cinnamon',
        'description': 'Premium quality cinnamon, also known as "True Cinnamon"',
        'scientific_name': 'Cinnamomum verum',
        'characteristics': 'Sweet, delicate flavor with low coumarin content'
    },
    {
        'value': 'Alba',
        'label': 'Alba',
        'description': 'High-yielding variety with good commercial value',
        'scientific_name': 'Cinnamomum cassia var. Alba',
        'characteristics': 'Robust growth, medium flavor intensity'
    },
    {
        'value': 'Continental',
        'label': 'Continental',
        'description': 'Hardy variety suitable for various climatic conditions',
        'scientific_name': 'Cinnamomum cassia var. Continental',
        'characteristics': 'Strong flavor, good for spice production'
    }
]

# Extract just the values for easy usage
CINNAMON_VARIETY_VALUES = [variety['value'] for variety in CINNAMON_VARIETIES]

# Default variety (most common in dataset)
DEFAULT_CINNAMON_VARIETY = 'Ceylon Cinnamon'

def validate_cinnamon_variety(variety: str) -> bool:
    """Validate if the given variety is one of the supported types"""
    return variety in CINNAMON_VARIETY_VALUES

def get_variety_info(variety: str) -> dict:
    """Get detailed information about a specific variety"""
    for var in CINNAMON_VARIETIES:
        if var['value'] == variety:
            return var
    return None