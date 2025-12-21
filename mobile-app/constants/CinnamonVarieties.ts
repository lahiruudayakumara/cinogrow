// Cinnamon variety constants for Sri Lankan varieties
export const CINNAMON_VARIETIES = [
  {
    value: 'Sri Gemunu',
    label: 'Sri Gemunu', // Will be translated in UI
    translationKey: 'yield_weather.common.sri_gemunu',
    description: 'High-yielding Sri Lankan cinnamon variety with excellent commercial value',
    scientificName: 'Cinnamomum zeylanicum var. Sri Gemunu',
    characteristics: 'Superior bark quality, good peeling characteristics, high oil content'
  },
  {
    value: 'Sri Wijaya',
    label: 'Sri Wijaya', // Will be translated in UI
    translationKey: 'yield_weather.common.sri_wijaya',
    description: 'Premium Sri Lankan variety known for superior quality and aroma',
    scientificName: 'Cinnamomum zeylanicum var. Sri Wijaya',
    characteristics: 'Excellent flavor profile, fine bark texture, disease resistant'
  }
] as const;

// Extract just the values for easy usage
export const CINNAMON_VARIETY_VALUES = CINNAMON_VARIETIES.map(variety => variety.value);

// Default variety (most common in dataset)
export const DEFAULT_CINNAMON_VARIETY = 'Sri Gemunu';

// Variety selection options for dropdowns
export const CINNAMON_VARIETY_OPTIONS = CINNAMON_VARIETIES.map(variety => ({
  label: variety.label,
  value: variety.value,
  description: variety.description
}));