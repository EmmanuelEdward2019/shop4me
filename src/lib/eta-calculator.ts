// Haversine formula to calculate distance between two coordinates in kilometers
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

const toRad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// Estimate travel time based on distance and traffic conditions
export const estimateTravelTime = (
  distanceKm: number,
  isRushHour: boolean = false
): { minutes: number; formatted: string } => {
  // Average speeds in km/h for Lagos traffic
  const averageSpeedKmh = isRushHour ? 15 : 25; // Lagos traffic is notoriously slow
  
  const timeHours = distanceKm / averageSpeedKmh;
  const timeMinutes = Math.round(timeHours * 60);
  
  // Add buffer for parking, building access, etc.
  const totalMinutes = timeMinutes + 5;
  
  return {
    minutes: totalMinutes,
    formatted: formatDuration(totalMinutes),
  };
};

const formatDuration = (minutes: number): string => {
  if (minutes < 1) {
    return "< 1 min";
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${remainingMinutes} min`;
};

// Check if current time is rush hour (7-10am or 4-8pm on weekdays)
export const isRushHour = (): boolean => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  
  // Weekdays only
  if (day === 0 || day === 6) return false;
  
  // Morning rush: 7-10am
  if (hour >= 7 && hour < 10) return true;
  
  // Evening rush: 4-8pm
  if (hour >= 16 && hour < 20) return true;
  
  return false;
};

export interface ETAResult {
  distanceKm: number;
  distanceFormatted: string;
  etaMinutes: number;
  etaFormatted: string;
  arrivalTime: Date;
  arrivalTimeFormatted: string;
}

export const calculateETA = (
  agentLat: number,
  agentLon: number,
  deliveryLat: number,
  deliveryLon: number
): ETAResult => {
  const distanceKm = calculateDistance(agentLat, agentLon, deliveryLat, deliveryLon);
  const { minutes, formatted } = estimateTravelTime(distanceKm, isRushHour());
  
  const arrivalTime = new Date();
  arrivalTime.setMinutes(arrivalTime.getMinutes() + minutes);
  
  return {
    distanceKm,
    distanceFormatted: distanceKm < 1 
      ? `${Math.round(distanceKm * 1000)} m` 
      : `${distanceKm.toFixed(1)} km`,
    etaMinutes: minutes,
    etaFormatted: formatted,
    arrivalTime,
    arrivalTimeFormatted: arrivalTime.toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};
