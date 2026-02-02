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

// Get coordinates for a location by slug or name
export const getLocationCoordinates = (locationName: string): LocationCoordinates => {
  // Try exact match first
  const slug = locationName.toLowerCase().replace(/\s+/g, "-");
  if (LAGOS_LOCATIONS[slug]) {
    return LAGOS_LOCATIONS[slug];
  }
  
  // Try partial match
  for (const [key, coords] of Object.entries(LAGOS_LOCATIONS)) {
    if (locationName.toLowerCase().includes(key.replace(/-/g, " "))) {
      return coords;
    }
  }
  
  // Return Lagos default
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

// Get approximate coordinates for an area/city
export const getAreaCoordinates = (city: string): LocationCoordinates => {
  for (const [area, coords] of Object.entries(LAGOS_AREAS)) {
    if (city.toLowerCase().includes(area.toLowerCase())) {
      return coords;
    }
  }
  return LAGOS_DEFAULT;
};
