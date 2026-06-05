export function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateDistance(points) {
  if (points.length < 2) return 0;
  let totalDistance = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    totalDistance += getDistanceFromLatLonInKm(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
  }
  return totalDistance;
}

export function calculateAverageSpeed(points) {
  if (points.length < 2) return 0;
  const speeds = points.map((p) => p.speed || 0).filter((s) => s > 0);
  if (speeds.length === 0) return 0;
  return speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
}

export function calculateCourseChanges(points) {
  if (points.length < 3) return 0;
  let changes = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    if (prev.direction && curr.direction && next.direction) {
      const change1 = Math.abs(curr.direction - prev.direction);
      const change2 = Math.abs(next.direction - curr.direction);
      if (change1 > 10 || change2 > 10) changes += 1;
    }
  }
  return changes;
}
