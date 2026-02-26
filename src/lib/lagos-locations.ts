// Known Lagos locations with approximate coordinates
// Used for ETA calculations when delivery addresses don't have geocoded coordinates

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

// Major markets and malls in Lagos with their approximate coordinates
export const LAGOS_LOCATIONS: Record<string, LocationCoordinates> = {
  // Markets
  "balogun-market": { latitude: 6.4539, longitude: 3.3920 },
  "computer-village": { latitude: 6.6018, longitude: 3.3515 },
  "alaba-market": { latitude: 6.4624, longitude: 3.1958 },
  "tejuosho-market": { latitude: 6.5144, longitude: 3.3565 },
  "oyingbo-market": { latitude: 6.4827, longitude: 3.3861 },
  "mile-12-market": { latitude: 6.5890, longitude: 3.3977 },
  "ladipo-market": { latitude: 6.5294, longitude: 3.3419 },
  "idumota-market": { latitude: 6.4569, longitude: 3.3875 },
  "yaba-market": { latitude: 6.5095, longitude: 3.3711 },
  "trade-fair": { latitude: 6.4627, longitude: 3.2045 },
  
  // Malls
  "ikeja-city-mall": { latitude: 6.6018, longitude: 3.3425 },
  "palms-shopping-mall": { latitude: 6.4378, longitude: 3.4242 },
  "shoprite-surulere": { latitude: 6.4899, longitude: 3.3514 },
  "shoprite-ikeja": { latitude: 6.6018, longitude: 3.3425 },
  "maryland-mall": { latitude: 6.5684, longitude: 3.3679 },
  "circle-mall": { latitude: 6.4489, longitude: 3.4748 },
  "adeniran-ogunsanya": { latitude: 6.4899, longitude: 3.3524 },
  "jara-mall": { latitude: 6.4890, longitude: 3.3569 },
  "leisure-mall": { latitude: 6.4899, longitude: 3.3524 },
  "novare-gateway": { latitude: 6.4627, longitude: 3.2045 },
};

// Default Lagos center coordinates
export const LAGOS_DEFAULT: LocationCoordinates = {
  latitude: 6.5244,
  longitude: 3.3792,
};

// Port Harcourt store coordinates
export const PORT_HARCOURT_LOCATIONS: Record<string, LocationCoordinates> = {
  // Malls & Supermarkets
  "port-harcourt-mall": { latitude: 4.8156, longitude: 7.0498 },
  "genesis-mall": { latitude: 4.8472, longitude: 7.0194 },
  "market-square": { latitude: 4.8563, longitude: 7.0275 },
  "spar-ph": { latitude: 4.8205, longitude: 7.0342 },

  // Major Markets
  "mile-1-market": { latitude: 4.7748, longitude: 7.0134 },
  "mile-3-market": { latitude: 4.7942, longitude: 7.0089 },
  "oil-mill-market": { latitude: 4.8103, longitude: 7.0653 },
  "rumuokoro-market": { latitude: 4.8621, longitude: 6.9987 },
  "creek-road-market": { latitude: 4.7817, longitude: 7.0201 },
  "slaughter-market": { latitude: 4.8189, longitude: 7.0378 },

  // Plazas
  "polo-club-plaza": { latitude: 4.7965, longitude: 7.0312 },
  "ada-george-plaza": { latitude: 4.8341, longitude: 7.0023 },
};

// Default Port Harcourt center coordinates
export const PORT_HARCOURT_DEFAULT: LocationCoordinates = {
  latitude: 4.8156,
  longitude: 7.0498,
};

// All locations combined for lookup
const ALL_STORE_LOCATIONS: Record<string, LocationCoordinates> = {
  ...LAGOS_LOCATIONS,
  ...PORT_HARCOURT_LOCATIONS,
};

// Get coordinates for a location by slug or name
export const getLocationCoordinates = (locationName: string): LocationCoordinates => {
  // Try exact match first
  const slug = locationName.toLowerCase().replace(/\s+/g, "-");
  if (ALL_STORE_LOCATIONS[slug]) {
    return ALL_STORE_LOCATIONS[slug];
  }
  
  // Try partial match
  for (const [key, coords] of Object.entries(ALL_STORE_LOCATIONS)) {
    if (locationName.toLowerCase().includes(key.replace(/-/g, " "))) {
      return coords;
    }
  }
  
  // Detect city for default
  const lower = locationName.toLowerCase();
  if (lower.includes("port harcourt") || lower.includes("ph") || lower.includes("rivers")) {
    return PORT_HARCOURT_DEFAULT;
  }
  
  return LAGOS_DEFAULT;
};

// Common areas in Lagos for delivery with approximate coordinates
export const LAGOS_AREAS: Record<string, LocationCoordinates> = {
  "Victoria Island": { latitude: 6.4281, longitude: 3.4219 },
  "Lekki": { latitude: 6.4698, longitude: 3.5852 },
  "Ikoyi": { latitude: 6.4518, longitude: 3.4362 },
  "Ikeja": { latitude: 6.6018, longitude: 3.3515 },
  "Yaba": { latitude: 6.5095, longitude: 3.3711 },
  "Surulere": { latitude: 6.4899, longitude: 3.3524 },
  "Festac": { latitude: 6.4684, longitude: 3.2844 },
  "Ajah": { latitude: 6.4667, longitude: 3.5833 },
  "Marina": { latitude: 6.4474, longitude: 3.3903 },
  "Apapa": { latitude: 6.4488, longitude: 3.3587 },
  "Maryland": { latitude: 6.5684, longitude: 3.3679 },
  "Ogba": { latitude: 6.6254, longitude: 3.3389 },
  "Gbagada": { latitude: 6.5556, longitude: 3.3877 },
  "Magodo": { latitude: 6.6157, longitude: 3.3952 },
  "Berger": { latitude: 6.6245, longitude: 3.3287 },
};

// Common areas in Port Harcourt for delivery
export const PORT_HARCOURT_AREAS: Record<string, LocationCoordinates> = {
  "GRA": { latitude: 4.7965, longitude: 7.0312 },
  "Woji": { latitude: 4.8234, longitude: 7.0567 },
  "Trans Amadi": { latitude: 4.8205, longitude: 7.0342 },
  "Rumuola": { latitude: 4.8472, longitude: 7.0194 },
  "D-Line": { latitude: 4.7817, longitude: 7.0201 },
  "Rumuokoro": { latitude: 4.8621, longitude: 6.9987 },
  "Eleme Junction": { latitude: 4.8103, longitude: 7.0653 },
  "Ada George": { latitude: 4.8341, longitude: 7.0023 },
  "Peter Odili": { latitude: 4.8563, longitude: 7.0275 },
  "Diobu": { latitude: 4.7748, longitude: 7.0134 },
  "Rumuomasi": { latitude: 4.8312, longitude: 7.0145 },
  "Eliozu": { latitude: 4.8589, longitude: 7.0412 },
};

// Get approximate coordinates for an area/city
export const getAreaCoordinates = (city: string): LocationCoordinates => {
  // Check Lagos areas
  for (const [area, coords] of Object.entries(LAGOS_AREAS)) {
    if (city.toLowerCase().includes(area.toLowerCase())) {
      return coords;
    }
  }
  // Check Port Harcourt areas
  for (const [area, coords] of Object.entries(PORT_HARCOURT_AREAS)) {
    if (city.toLowerCase().includes(area.toLowerCase())) {
      return coords;
    }
  }
  // Detect city for default
  const lower = city.toLowerCase();
  if (lower.includes("port harcourt") || lower.includes("ph") || lower.includes("rivers")) {
    return PORT_HARCOURT_DEFAULT;
  }
  return LAGOS_DEFAULT;
};
