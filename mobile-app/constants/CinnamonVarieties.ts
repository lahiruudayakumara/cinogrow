// Cinnamon variety constants extracted from yield dataset
export const CINNAMON_VARIETIES = [
  {
    value: 'Ceylon Cinnamon',
    label: 'Ceylon Cinnamon',
    description: 'Premium quality cinnamon, also known as "True Cinnamon"',
    scientificName: 'Cinnamomum verum',
    characteristics: 'Sweet, delicate flavor with low coumarin content'
  },
  {
    value: 'Alba',
    label: 'Alba',
    description: 'High-yielding variety with good commercial value',
    scientificName: 'Cinnamomum cassia var. Alba',
    characteristics: 'Robust growth, medium flavor intensity'
  },
  {
    value: 'Continental',
    label: 'Continental',
    description: 'Hardy variety suitable for various climatic conditions',
    scientificName: 'Cinnamomum cassia var. Continental',
    characteristics: 'Strong flavor, good for spice production'
  }
] as const;

// Extract just the values for easy usage
export const CINNAMON_VARIETY_VALUES = CINNAMON_VARIETIES.map(variety => variety.value);

// Default variety (most common in dataset)
export const DEFAULT_CINNAMON_VARIETY = 'Ceylon Cinnamon';

// Variety selection options for dropdowns
export const CINNAMON_VARIETY_OPTIONS = CINNAMON_VARIETIES.map(variety => ({
  label: variety.label,
  value: variety.value,
  description: variety.description
}));