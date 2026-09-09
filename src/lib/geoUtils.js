// Haversine distance between two lat/lng points (meters)
export function haversineDistance(p1, p2) {
  const R = 6371000;
  const lat1 = p1.lat * Math.PI / 180;
  const lat2 = p2.lat * Math.PI / 180;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Spherical polygon area (square meters)
export function calculatePolygonArea(points) {
  if (points.length < 3) return 0;
  const R = 6371000;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    total += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs(total * R * R / 2);
}

// Polygon perimeter (meters)
export function calculatePerimeter(points) {
  if (points.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    perimeter += haversineDistance(p1, p2);
  }
  return perimeter;
}

// Get polygon centroid
export function getCentroid(points) {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

// Format area for display
export function formatArea(sqm) {
  if (!sqm || sqm === 0) return '—';
  if (sqm < 10000) return `${sqm.toFixed(0)} m²`;
  const hectares = sqm / 10000;
  if (hectares < 100) return `${hectares.toFixed(2)} ha`;
  return `${(hectares / 100).toFixed(2)} km²`;
}

// Format distance for display
export function formatDistance(m) {
  if (!m || m === 0) return '—';
  if (m < 1000) return `${m.toFixed(0)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

// Get real district name from GPS coordinates using reverse geocoding (Nominatim/OpenStreetMap)
// Falls back to nearest-point matching if the API is unavailable.
export async function estimateDistrict(lat, lng) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&format=json&zoom=10&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' }, signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    const addr = data.address || {};
    // Nominatim returns the Ugandan district in various fields depending on zoom level
    const district = addr.county || addr.state_district || addr.city || addr.town || addr.region || addr.state || 'Unknown District';
    return district;
  } catch (e) {
    return estimateDistrictFallback(lat, lng);
  }
}

// Fallback: nearest district centre from coordinates (used if reverse geocoding fails)
function estimateDistrictFallback(lat, lng) {
  const districts = [
    { name: 'Kampala', lat: 0.3476, lng: 32.5825 },
    { name: 'Wakiso', lat: 0.4, lng: 32.45 },
    { name: 'Mukono', lat: 0.35, lng: 32.75 },
    { name: 'Jinja', lat: 0.42, lng: 33.2 },
    { name: 'Mbarara', lat: -0.6, lng: 30.65 },
    { name: 'Gulu', lat: 2.77, lng: 32.3 },
    { name: 'Mbale', lat: 1.08, lng: 34.17 },
    { name: 'Kasese', lat: 0.18, lng: 30.09 },
    { name: 'Kabale', lat: -1.25, lng: 29.98 },
    { name: 'Lira', lat: 2.25, lng: 32.9 },
    { name: 'Soroti', lat: 1.72, lng: 33.6 },
    { name: 'Kaabong', lat: 3.98, lng: 34.13 },
    { name: 'Masaka', lat: -0.43, lng: 31.75 },
    { name: 'Kabarole', lat: 0.66, lng: 30.27 },
    { name: 'Hoima', lat: 1.47, lng: 31.35 },
    { name: 'Luwero', lat: 0.83, lng: 32.47 },
    { name: 'Entebbe', lat: 0.06, lng: 32.46 },
    { name: 'Masindi', lat: 1.67, lng: 31.72 },
    { name: 'Kamwenge', lat: 0.25, lng: 30.45 },
    { name: 'Ntungamo', lat: -0.9, lng: 30.27 },
  ];
  let nearest = districts[0];
  let minDist = Infinity;
  for (const d of districts) {
    const dist = (d.lat - lat) ** 2 + (d.lng - lng) ** 2;
    if (dist < minDist) { minDist = dist; nearest = d; }
  }
  return nearest.name;
}

// Capture GPS via browser geolocation API
export function captureGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ error: 'Geolocation not supported by this device' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => resolve({ error: err.message || 'GPS capture failed' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}