export function decimateTrackPoints(points, maxPoints = 2000) {
  if (!Array.isArray(points) || points.length <= maxPoints) {
    return { points: points || [], decimated: false, originalCount: points?.length || 0 };
  }

  const step = Math.ceil(points.length / maxPoints);
  const result = [];

  for (let i = 0; i < points.length; i += step) {
    result.push(points[i]);
  }

  const lastPoint = points[points.length - 1];
  if (result[result.length - 1] !== lastPoint) {
    result.push(lastPoint);
  }

  return {
    points: result,
    decimated: true,
    originalCount: points.length
  };
}

export function resolveTrackTimestamp(point) {
  if (!point) return null;
  return point.datetime || point.timestamp || null;
}
