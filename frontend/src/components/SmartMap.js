import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import OfflineMapLayer from './OfflineMapLayer';

const SmartMap = ({ 
  center = [0, 0], 
  zoom = 2, 
  children, 
  height = '400px',
  width = '100%',
  style = {},
  mapType = 'osm' // 'osm', 'openseamap', 'satellite'
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mapTilesLoaded, setMapTilesLoaded] = useState(false);
  const [showOfflineMode, setShowOfflineMode] = useState(false);

  // Map tile configurations
  const mapConfigs = {
    osm: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      name: "OpenStreetMap"
    },
    openseamap: {
      url: "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openseamap.org/">OpenSeaMap</a> contributors',
      name: "OpenSeaMap"
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
      name: "Satellite"
    },
    // Marine chart alternatives with different working tile sources
    marine_traffic: {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: "Marine Traffic Style"
    },
    noaa_charts: {
      url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: "NOAA Style Charts"
    },
    emodnet_bathymetry: {
      url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: "Bathymetry Style"
    },
    opencpn_charts: {
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: "OpenCPN Style"
    },
    // Additional working alternatives
    cartodb_dark: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: "Dark Marine"
    },
    cartodb_light: {
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: "Light Marine"
    },
    // Additional marine-specific styles
    marine_blue: {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: "Marine Blue"
    },
    nautical_style: {
      url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: "Nautical Style"
    },
    // Marine Traffic Web Integration
    marine_traffic_web: {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: "Marine Traffic Web"
    },
    // Weather and marine conditions
    windy: {
      url: "https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=YOUR_API_KEY",
      attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>',
      name: "Wind Conditions"
    }
  };

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMode(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMode(true);
    };

    // Check if map tiles can be loaded
    const checkMapTiles = () => {
      const testImage = new Image();
      testImage.onload = () => {
        setMapTilesLoaded(true);
        setShowOfflineMode(false);
      };
      testImage.onerror = () => {
        setMapTilesLoaded(false);
        setShowOfflineMode(true);
      };
      testImage.src = 'https://tile.openstreetmap.org/0/0/0.png';
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check map tiles availability
    checkMapTiles();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Determine if we should show offline mode
  const shouldShowOffline = !isOnline || !mapTilesLoaded || showOfflineMode;

  // Get current map configuration
  const currentMapConfig = mapConfigs[mapType] || mapConfigs.osm;

  return (
    <div style={{ position: 'relative', height, width, ...style }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        {shouldShowOffline ? (
          <OfflineMapLayer />
        ) : (
          <>
            {/* Base layers for different chart types */}
            {mapType === 'osm' && (
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                eventHandlers={{
                  load: () => setMapTilesLoaded(true),
                  error: () => {
                    setMapTilesLoaded(false);
                    setShowOfflineMode(true);
                  }
                }}
              />
            )}
            
            {/* Marine Traffic Style */}
            {mapType === 'marine_traffic' && (
              <TileLayer
                url={currentMapConfig.url}
                attribution={currentMapConfig.attribution}
                eventHandlers={{
                  load: () => setMapTilesLoaded(true),
                  error: () => {
                    setMapTilesLoaded(false);
                    setShowOfflineMode(true);
                  }
                }}
              />
            )}
            
            {/* NOAA Style Charts */}
            {mapType === 'noaa_charts' && (
              <TileLayer
                url={currentMapConfig.url}
                attribution={currentMapConfig.attribution}
                eventHandlers={{
                  load: () => setMapTilesLoaded(true),
                  error: () => {
                    setMapTilesLoaded(false);
                    setShowOfflineMode(true);
                  }
                }}
              />
            )}
            
            {/* Bathymetry Style */}
            {mapType === 'emodnet_bathymetry' && (
              <TileLayer
                url={currentMapConfig.url}
                attribution={currentMapConfig.attribution}
                eventHandlers={{
                  load: () => setMapTilesLoaded(true),
                  error: () => {
                    setMapTilesLoaded(false);
                    setShowOfflineMode(true);
                  }
                }}
              />
            )}
            
            {/* OpenCPN Style */}
            {mapType === 'opencpn_charts' && (
              <TileLayer
                url={currentMapConfig.url}
                attribution={currentMapConfig.attribution}
                eventHandlers={{
                  load: () => setMapTilesLoaded(true),
                  error: () => {
                    setMapTilesLoaded(false);
                    setShowOfflineMode(true);
                  }
                }}
              />
            )}
            
            {/* CARTO Dark Marine */}
            {mapType === 'cartodb_dark' && (
              <TileLayer
                url={currentMapConfig.url}
                attribution={currentMapConfig.attribution}
                eventHandlers={{
                  load: () => setMapTilesLoaded(true),
                  error: () => {
                    setMapTilesLoaded(false);
                    setShowOfflineMode(true);
                  }
                }}
              />
            )}
            
            {/* CARTO Light Marine */}
            {mapType === 'cartodb_light' && (
              <TileLayer
                url={currentMapConfig.url}
                attribution={currentMapConfig.attribution}
                eventHandlers={{
                  load: () => setMapTilesLoaded(true),
                  error: () => {
                    setMapTilesLoaded(false);
                    setShowOfflineMode(true);
                  }
                }}
              />
            )}
            
            {/* Marine Blue */}
            {mapType === 'marine_blue' && (
              <TileLayer
                url={currentMapConfig.url}
                attribution={currentMapConfig.attribution}
                eventHandlers={{
                  load: () => setMapTilesLoaded(true),
                  error: () => {
                    setMapTilesLoaded(false);
                    setShowOfflineMode(true);
                  }
                }}
              />
            )}
            
            {/* Nautical Style */}
            {mapType === 'nautical_style' && (
              <TileLayer
                url={currentMapConfig.url}
                attribution={currentMapConfig.attribution}
                eventHandlers={{
                  load: () => setMapTilesLoaded(true),
                  error: () => {
                    setMapTilesLoaded(false);
                    setShowOfflineMode(true);
                  }
                }}
              />
            )}
            
            {/* Marine Traffic Web */}
            {mapType === 'marine_traffic_web' && (
              <TileLayer
                url={currentMapConfig.url}
                attribution={currentMapConfig.attribution}
                eventHandlers={{
                  load: () => setMapTilesLoaded(true),
                  error: () => {
                    setMapTilesLoaded(false);
                    setShowOfflineMode(true);
                  }
                }}
              />
            )}
            
            {/* Satellite layer */}
            {mapType === 'satellite' && (
              <TileLayer
                url={currentMapConfig.url}
                attribution={currentMapConfig.attribution}
                eventHandlers={{
                  load: () => setMapTilesLoaded(true),
                  error: () => {
                    setMapTilesLoaded(false);
                    setShowOfflineMode(true);
                  }
                }}
              />
            )}
            
            {/* OpenSeaMap overlay - only for OSM base */}
            {mapType === 'openseamap' && (
              <>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  eventHandlers={{
                    load: () => setMapTilesLoaded(true),
                    error: () => {
                      setMapTilesLoaded(false);
                      setShowOfflineMode(true);
                    }
                  }}
                />
                <TileLayer
                  url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openseamap.org/">OpenSeaMap</a> contributors'
                  opacity={0.8}
                  zIndex={1}
                />
              </>
            )}
          </>
        )}
        
        {/* Render children (markers, polylines, etc.) with higher z-index */}
        <div style={{ position: 'relative', zIndex: 1000 }}>
          {children}
        </div>
      </MapContainer>
      
      {/* Offline mode indicator */}
      {shouldShowOffline && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(255, 193, 7, 0.9)',
          color: '#000',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 2000,
          pointerEvents: 'none'
        }}>
          📡 Offline Mode - Grid View
        </div>
      )}
      
      {/* Map type indicator */}
      {!shouldShowOffline && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 2000,
          pointerEvents: 'none'
        }}>
          🗺️ {currentMapConfig.name}
        </div>
      )}
      
      {/* Marine Traffic Web Integration Indicator */}
      {!shouldShowOffline && mapType === 'marine_traffic_web' && (
        <div style={{
          position: 'absolute',
          top: '50px',
          right: '10px',
          backgroundColor: 'rgba(25, 118, 210, 0.9)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 2000,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}
        onClick={() => {
          const centerLat = 51.6;
          const centerLon = 1.9;
          const zoom = 6;
          const url = `https://www.marinetraffic.com/en/ais/home/centerx:${centerLon}/centery:${centerLat}/zoom:${zoom}`;
          window.open(url, '_blank');
        }}
        title="Click to open Marine Traffic web interface"
        >
          🌊 Open Marine Traffic Web
        </div>
      )}
      
      {/* Manual toggle button */}
      <button
        onClick={() => setShowOfflineMode(!showOfflineMode)}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
          zIndex: 2000
        }}
        title="Toggle between online map and offline grid"
      >
        {shouldShowOffline ? '🌐 Online' : '📐 Grid'}
      </button>
    </div>
  );
};

export default SmartMap; 