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

function progressColor(progress) {
  const hue = (1 - progress) * 120;
  return `hsl(${hue}, 82%, 40%)`;
}

function buildArrowPlacements(points, totalPoints, maxArrows = 36) {
  if (!Array.isArray(points) || points.length < 2) {
    return [];
  }

  const placements = [];
  const segmentCount = points.length - 1;
  const step = Math.max(1, Math.floor(segmentCount / maxArrows));
  const pointTotal = totalPoints || points.length;

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

    const progress = segmentCount > 0 ? i / segmentCount : 0;
    const pointNumber = Math.min(
      pointTotal,
      Math.max(1, Math.round(progress * (pointTotal - 1)) + 1)
    );

    placements.push({
      lat: (lat1 + lat2) / 2,
      lon: (lon1 + lon2) / 2,
      bearing: bearingDegrees(lat1, lon1, lat2, lon2),
      color: progressColor(progress),
      pointNumber,
      pointTotal
    });
  }

  return placements;
}

function createArrowIcon({ bearing, color, pointNumber, pointTotal }) {
  const label = `${pointNumber}`;
  const totalLabel = pointTotal > 0 ? `/${pointTotal}` : '';

  return L.divIcon({
    className: 'track-flow-arrow-icon',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;width:34px;">
        <div style="
          font-size:9px;
          font-weight:700;
          color:${color};
          background:rgba(255,255,255,0.95);
          border:1px solid ${color};
          border-radius:8px;
          padding:0 4px;
          line-height:1.3;
          white-space:nowrap;
          box-shadow:0 1px 2px rgba(0,0,0,0.25);
        ">${label}<span style="font-size:7px;font-weight:600;opacity:0.75;">${totalLabel}</span></div>
        <div style="transform:rotate(${bearing}deg);transform-origin:center center;margin-top:1px;">
          <svg width="20" height="20" viewBox="0 0 18 18">
            <path d="M9 2 L15 16 L9 12 L3 16 Z" fill="${color}" stroke="#1b1b1b" stroke-width="0.45" opacity="0.95"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
}

const TrackFlowArrows = ({ points, totalPoints }) => {
  const placements = useMemo(
    () => buildArrowPlacements(points, totalPoints),
    [points, totalPoints]
  );

  if (placements.length === 0) {
    return null;
  }

  return placements.map((placement, index) => (
    <Marker
      key={`track-arrow-${placement.pointNumber}-${index}`}
      position={[placement.lat, placement.lon]}
      icon={createArrowIcon(placement)}
      interactive={false}
      zIndexOffset={-100}
    />
  ));
};

export default TrackFlowArrows;
