import React, { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

function bearingDegrees(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLon = toRad(lon2 - lon1);
  const y = Math.sin(deltaLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function buildArrowPlacements(points, maxArrows = 48) {
  if (!Array.isArray(points) || points.length < 2) {
    return [];
  }

  const placements = [];
  const segmentCount = points.length - 1;
  const step = Math.max(1, Math.floor(segmentCount / maxArrows));

  for (let i = 0; i < segmentCount; i += step) {
    const start = points[i];
    const end = points[i + 1];
    const lat1 = start.latitude ?? start[0];
    const lon1 = start.longitude ?? start[1];
    const lat2 = end.latitude ?? end[0];
    const lon2 = end.longitude ?? end[1];

    if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
      continue;
    }

    placements.push({
      lat: (lat1 + lat2) / 2,
      lon: (lon1 + lon2) / 2,
      bearing: bearingDegrees(lat1, lon1, lat2, lon2)
    });
  }

  return placements;
}

const arrowIconCache = new Map();

function getArrowIcon(bearing) {
  const key = Math.round(bearing);
  if (!arrowIconCache.has(key)) {
    arrowIconCache.set(key, L.divIcon({
      className: 'track-flow-arrow-icon',
      html: `<svg width="18" height="18" viewBox="0 0 18 18" style="transform:rotate(${key}deg);transform-origin:9px 9px;">
        <path d="M9 2 L15 16 L9 12 L3 16 Z" fill="#1565c0" stroke="#0d47a1" stroke-width="0.5" opacity="0.95"/>
      </svg>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    }));
  }
  return arrowIconCache.get(key);
}

const TrackFlowArrows = ({ points }) => {
  const placements = useMemo(() => buildArrowPlacements(points), [points]);

  if (placements.length === 0) {
    return null;
  }

  return placements.map((placement, index) => (
    <Marker
      key={`track-arrow-${index}`}
      position={[placement.lat, placement.lon]}
      icon={getArrowIcon(placement.bearing)}
      interactive={false}
      zIndexOffset={-100}
    />
  ));
};

export default TrackFlowArrows;
