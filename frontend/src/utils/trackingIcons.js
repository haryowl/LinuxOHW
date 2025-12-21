import L from 'leaflet';

// Custom icon definitions
const createCustomIcon = (iconType, color = '#1976d2') => {
  const iconSize = [32, 32];
  const iconAnchor = [16, 16];
  const popupAnchor = [0, -16];

  // SVG icons for different vehicle types
  const iconSVGs = {
    boat: `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2L20 8H24L26 12L28 16L26 20L24 24H20L16 30L12 24H8L6 20L4 16L6 12L8 8H12L16 2Z" fill="${color}" stroke="white" stroke-width="1"/>
        <circle cx="16" cy="16" r="4" fill="white"/>
      </svg>
    `,
    ship: `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 20L12 16L16 20L20 16L24 20L26 22L24 24H8L6 22L8 20Z" fill="${color}" stroke="white" stroke-width="1"/>
        <rect x="12" y="8" width="8" height="8" fill="${color}" stroke="white" stroke-width="1"/>
        <circle cx="16" cy="16" r="3" fill="white"/>
      </svg>
    `,
    vehicle: `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="12" width="20" height="8" rx="2" fill="${color}" stroke="white" stroke-width="1"/>
        <rect x="8" y="16" width="4" height="4" rx="2" fill="white"/>
        <rect x="20" y="16" width="4" height="4" rx="2" fill="white"/>
        <path d="M10 12L12 8H20L22 12" fill="${color}" stroke="white" stroke-width="1"/>
        <circle cx="16" cy="18" r="2" fill="white"/>
      </svg>
    `,
    default: `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
    `
  };

  const svg = iconSVGs[iconType] || iconSVGs.default;
  const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;

  return L.icon({
    iconUrl: dataUrl,
    iconSize,
    iconAnchor,
    popupAnchor
  });
};

// Create icon instances
export const trackingIcons = {
  boat: createCustomIcon('boat', '#1976d2'),
  ship: createCustomIcon('ship', '#2e7d32'),
  vehicle: createCustomIcon('vehicle', '#ed6c02'),
  default: createCustomIcon('default', '#1976d2')
};

// Create colored variants for different speeds
export const getSpeedBasedIcon = (iconType, speed) => {
  let color = '#1976d2'; // default blue
  
  if (speed > 50) {
    color = '#d32f2f'; // red for high speed
  } else if (speed > 20) {
    color = '#ed6c02'; // orange for medium speed
  } else if (speed > 0) {
    color = '#2e7d32'; // green for low speed
  }
  
  return createCustomIcon(iconType, color);
};

export default trackingIcons; 