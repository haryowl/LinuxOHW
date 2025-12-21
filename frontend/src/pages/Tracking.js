import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Card,
  CardContent,
  Chip,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Map as MapIcon,
  Satellite as SatelliteIcon,
  DirectionsBoat as BoatIcon,
  Visibility as VisibilityIcon,
  Water as WaterIcon,
  Public as PublicIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  OpenInNew as OpenInNewIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  SkipNext as NextIcon,
  SkipPrevious as PrevIcon,
  Speed as SpeedIcon,
  DirectionsCar as CarIcon,
  DirectionsBoat as ShipIcon
} from '@mui/icons-material';
import { useMapEvents, Marker, Popup, Polyline } from 'react-leaflet';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import SmartMap from '../components/SmartMap';
import { BASE_URL, fetchDevices } from '../services/api';
import { advancedGPSFilter } from '../utils/gpsFilter';
import { trackingIcons, getSpeedBasedIcon } from '../utils/trackingIcons';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const Tracking = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000)); // 24 hours ago
  const [endDate, setEndDate] = useState(new Date());
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [mapZoom, setMapZoom] = useState(2);
  const [debugInfo, setDebugInfo] = useState('');
  const [mapType, setMapType] = useState('osm'); // 'osm', 'openseamap', 'satellite'
  // const [deviceLocations, setDeviceLocations] = useState({});
  const [filteringEnabled, setFilteringEnabled] = useState(true);
  const [filteringStats, setFilteringStats] = useState(null);
  const [filteringOptions, setFilteringOptions] = useState({
    maxDistanceKm: 50,
    maxSpeedKmh: 200,
    enableSpeedFilter: true,
    enableDistanceFilter: true,
    enableCoordinateValidation: true
  });

  // Replay functionality state
  const [isReplaying, setIsReplaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [currentReplayIndex, setCurrentReplayIndex] = useState(0);
  const [replayProgress, setReplayProgress] = useState(0);
  const replayIntervalRef = useRef(null);
  const [replayData, setReplayData] = useState([]);

  // GPS icon customization
  const [gpsIconType, setGpsIconType] = useState('default');
  const [showSpeedColors, setShowSpeedColors] = useState(false);

  // Load devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        console.log('Loading devices...');
        const response = await fetchDevices();
        
        if (!response.ok) {
          if (response.status === 401) {
            console.log('User not authenticated, using empty devices array');
            setDevices([]);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const devicesData = await response.json();
        console.log('Devices loaded:', devicesData);
        setDevices(Array.isArray(devicesData) ? devicesData : []);
        setDebugInfo(`Loaded ${devicesData.length} devices`);
      } catch (error) {
        console.error('Error loading devices:', error);
        setError(`Failed to load devices: ${error.message}`);
        setDebugInfo(`Error: ${error.message}`);
        setDevices([]); // Ensure devices is always an array
      }
    };
    loadDevices();
  }, []);

  // Apply GPS filtering to existing data
  const applyFiltering = () => {
    if (!trackingData || trackingData.length === 0) return;
    
    if (filteringEnabled) {
      const result = advancedGPSFilter(trackingData, filteringOptions);
      setTrackingData(result.filteredData);
      setFilteringStats(result.stats);
      setDebugInfo(`Reapplied filtering: ${result.stats.totalPoints} total points → ${result.stats.filteredPoints} valid points (${result.stats.removalPercentage}% removed)`);
    } else {
      setFilteringStats(null);
      setDebugInfo('Filtering disabled');
    }
  };

  // Load tracking data
  const loadTrackingData = async () => {
    if (!selectedDevice) {
      setError('Please select a device');
      return;
    }

    setLoading(true);
    setError('');
    setDebugInfo('Loading tracking data...');

    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      // Use the new IMEI-based endpoint that only requires read permission
      const url = `${BASE_URL}/api/data/imei/${selectedDevice}/tracking?${params}`;
      console.log('Fetching tracking data from:', url);

      const response = await fetch(url, {
        credentials: 'include' // Include cookies in the request
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Tracking data received:', data);
      const rawData = Array.isArray(data) ? data : [];
      
      // Apply GPS filtering if enabled
      let processedData = rawData;
      let stats = null;
      
      if (filteringEnabled && rawData.length > 0) {
        const result = advancedGPSFilter(rawData, filteringOptions);
        processedData = result.filteredData;
        stats = result.stats;
        setFilteringStats(stats);
        console.log('GPS filtering applied:', stats);
      } else {
        setFilteringStats(null);
      }
      
      setTrackingData(processedData);
      setDebugInfo(`Loaded ${rawData.length} tracking points${stats ? `, filtered to ${stats.filteredPoints} points (${stats.removalPercentage}% removed)` : ''}`);

      // Set map center to first point or default
      if (processedData.length > 0) {
        setMapCenter([processedData[0].latitude, processedData[0].longitude]);
        setMapZoom(13);
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
      setError(`Failed to load tracking data: ${error.message}`);
      setDebugInfo(`Error: ${error.message}`);
      setTrackingData([]); // Ensure trackingData is always an array
    } finally {
      setLoading(false);
    }
  };

  // Create polyline coordinates for the track
  const trackCoordinates = trackingData.map(point => [point.latitude, point.longitude]);

  // Helper functions for marine navigation calculations
  const calculateDistance = (points) => {
    if (points.length < 2) return 0;
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const distance = getDistanceFromLatLonInKm(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
      totalDistance += distance;
    }
    return totalDistance;
  };

  const calculateAverageSpeed = (points) => {
    if (points.length < 2) return 0;
    const speeds = points.map(p => p.speed || 0).filter(s => s > 0);
    if (speeds.length === 0) return 0;
    return speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  };

  const calculateCourseChanges = (points) => {
    if (points.length < 3) return 0;
    let changes = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      if (prev.direction && curr.direction && next.direction) {
        const change1 = Math.abs(curr.direction - prev.direction);
        const change2 = Math.abs(next.direction - curr.direction);
        if (change1 > 10 || change2 > 10) changes++;
      }
    }
    return changes;
  };

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Function to open Marine Traffic with current coordinates
  const openMarineTraffic = () => {
    if (trackingData.length > 0) {
      const centerLat = trackingData[0].latitude;
      const centerLon = trackingData[0].longitude;
      const zoom = 10; // Default zoom level
      const url = `https://www.marinetraffic.com/en/ais/home/centerx:${centerLon}/centery:${centerLat}/zoom:${zoom}`;
      window.open(url, '_blank');
    } else {
      // Default to a general marine traffic view
      const url = 'https://www.marinetraffic.com/en/ais/home/centerx:1.9/centery:51.6/zoom:6';
      window.open(url, '_blank');
    }
  };

  // const fetchDeviceLocations = useCallback(async () => {
  //   try {
  //     const response = await fetch(`${BASE_URL}/api/devices/locations`, {
  //       credentials: 'include' // Include cookies in the request
  //     });
  //     
  //     if (response.ok) {
  //       const locations = await response.json();
  //       setDeviceLocations(locations);
  //     } else {
  //       console.error('Failed to fetch device locations:', response.status);
  //       setDeviceLocations([]);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching device locations:', error);
  //     setDeviceLocations([]);
  //   }
  // };

  // Replay control functions
  const startReplay = () => {
    if (trackingData.length === 0) return;
    
    setIsReplaying(true);
    setCurrentReplayIndex(0);
    setReplayProgress(0);
    setReplayData(trackingData);
    
    const interval = setInterval(() => {
      setCurrentReplayIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= trackingData.length) {
          setIsReplaying(false);
          clearInterval(interval);
          return prevIndex;
        }
        setReplayProgress((nextIndex / trackingData.length) * 100);
        return nextIndex;
      });
    }, 1000 / replaySpeed); // Adjust interval based on speed
    
    replayIntervalRef.current = interval;
  };

  const pauseReplay = () => {
    setIsReplaying(false);
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
  };

  const stopReplay = () => {
    setIsReplaying(false);
    setCurrentReplayIndex(0);
    setReplayProgress(0);
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
  };

  const nextPoint = () => {
    if (currentReplayIndex < trackingData.length - 1) {
      setCurrentReplayIndex(prev => prev + 1);
      setReplayProgress(((currentReplayIndex + 1) / trackingData.length) * 100);
    }
  };

  const prevPoint = () => {
    if (currentReplayIndex > 0) {
      setCurrentReplayIndex(prev => prev - 1);
      setReplayProgress(((currentReplayIndex - 1) / trackingData.length) * 100);
    }
  };

  const handleReplaySpeedChange = (event, newValue) => {
    setReplaySpeed(newValue);
    if (isReplaying) {
      pauseReplay();
      startReplay();
    }
  };

  const handleReplayProgressChange = (event, newValue) => {
    const newIndex = Math.floor((newValue / 100) * trackingData.length);
    setCurrentReplayIndex(newIndex);
    setReplayProgress(newValue);
  };

  // Get current replay point
  const getCurrentReplayPoint = () => {
    if (trackingData.length === 0 || currentReplayIndex >= trackingData.length) {
      return null;
    }
    return trackingData[currentReplayIndex];
  };

  // Get icon for current point
  const getCurrentIcon = (point) => {
    if (!point) return trackingIcons.default;
    
    if (showSpeedColors) {
      return getSpeedBasedIcon(gpsIconType, point.speed || 0);
    }
    
    return trackingIcons[gpsIconType] || trackingIcons.default;
  };

  // Update map center when replaying
  useEffect(() => {
    if (isReplaying && getCurrentReplayPoint()) {
      setMapCenter([getCurrentReplayPoint().latitude, getCurrentReplayPoint().longitude]);
      setMapZoom(15); // Zoom in during replay for better visibility
    }
  }, [isReplaying, getCurrentReplayPoint]);

  // Cleanup replay interval on unmount
  useEffect(() => {
    return () => {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
      }
    };
  }, []);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Device Tracking
            </Typography>
            
            {/* Debug Info */}
            {debugInfo && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Debug: {debugInfo}
              </Alert>
            )}
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Device</InputLabel>
                  <Select
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    label="Device"
                  >
                    {devices.map((device) => (
                      <MenuItem key={device.imei} value={device.imei}>
                        {device.name || device.imei}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="Start Date"
                    value={startDate}
                    onChange={setStartDate}
                    slotProps={{
                      textField: {
                        fullWidth: true
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="End Date"
                    value={endDate}
                    onChange={setEndDate}
                    slotProps={{
                      textField: {
                        fullWidth: true
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Button
                  variant="contained"
                  onClick={loadTrackingData}
                  disabled={loading || !selectedDevice}
                  fullWidth
                >
                  {loading ? 'Loading...' : 'Load Track'}
                </Button>
              </Grid>
            </Grid>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {/* GPS Filtering Controls */}
            <Box sx={{ mt: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
              <Typography variant="h6" gutterBottom>
                GPS Filtering Options
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Filter out invalid GPS coordinates that are too far from other points or have unrealistic speeds
              </Typography>
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Enable Filtering</InputLabel>
                    <Select
                      value={filteringEnabled ? 'enabled' : 'disabled'}
                      onChange={(e) => setFilteringEnabled(e.target.value === 'enabled')}
                      label="Enable Filtering"
                    >
                      <MenuItem value="enabled">Enabled</MenuItem>
                      <MenuItem value="disabled">Disabled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Max Distance (km)</InputLabel>
                    <Select
                      value={filteringOptions.maxDistanceKm}
                      onChange={(e) => setFilteringOptions(prev => ({ ...prev, maxDistanceKm: e.target.value }))}
                      label="Max Distance (km)"
                      disabled={!filteringEnabled}
                    >
                      <MenuItem value={10}>10 km</MenuItem>
                      <MenuItem value={25}>25 km</MenuItem>
                      <MenuItem value={50}>50 km</MenuItem>
                      <MenuItem value={100}>100 km</MenuItem>
                      <MenuItem value={200}>200 km</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Max Speed (km/h)</InputLabel>
                    <Select
                      value={filteringOptions.maxSpeedKmh}
                      onChange={(e) => setFilteringOptions(prev => ({ ...prev, maxSpeedKmh: e.target.value }))}
                      label="Max Speed (km/h)"
                      disabled={!filteringEnabled}
                    >
                      <MenuItem value={50}>50 km/h</MenuItem>
                      <MenuItem value={100}>100 km/h</MenuItem>
                      <MenuItem value={200}>200 km/h</MenuItem>
                      <MenuItem value={500}>500 km/h</MenuItem>
                      <MenuItem value={1000}>1000 km/h</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label="Coordinate Validation"
                      color={filteringOptions.enableCoordinateValidation ? "primary" : "default"}
                      onClick={() => setFilteringOptions(prev => ({ 
                        ...prev, 
                        enableCoordinateValidation: !prev.enableCoordinateValidation 
                      }))}
                      disabled={!filteringEnabled}
                      variant={filteringOptions.enableCoordinateValidation ? "filled" : "outlined"}
                    />
                    <Chip
                      label="Distance Filter"
                      color={filteringOptions.enableDistanceFilter ? "primary" : "default"}
                      onClick={() => setFilteringOptions(prev => ({ 
                        ...prev, 
                        enableDistanceFilter: !prev.enableDistanceFilter 
                      }))}
                      disabled={!filteringEnabled}
                      variant={filteringOptions.enableDistanceFilter ? "filled" : "outlined"}
                    />
                    <Chip
                      label="Speed Filter"
                      color={filteringOptions.enableSpeedFilter ? "primary" : "default"}
                      onClick={() => setFilteringOptions(prev => ({ 
                        ...prev, 
                        enableSpeedFilter: !prev.enableSpeedFilter 
                      }))}
                      disabled={!filteringEnabled}
                      variant={filteringOptions.enableSpeedFilter ? "filled" : "outlined"}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <Button
                    variant="outlined"
                    onClick={applyFiltering}
                    disabled={!trackingData || trackingData.length === 0}
                    fullWidth
                  >
                    Reapply Filter
                  </Button>
                </Grid>
              </Grid>

              {/* Filtering Statistics */}
              {filteringStats && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Filtering Results:</strong> {filteringStats.totalPoints} total points → {filteringStats.filteredPoints} valid points 
                    ({filteringStats.removedPoints} removed, {filteringStats.removalPercentage}% filtered out)
                  </Typography>
                </Alert>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* GPS Icon Customization */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              GPS Icon Customization
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose the icon type and appearance for GPS markers on the map
            </Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Icon Type</InputLabel>
                  <Select
                    value={gpsIconType}
                    onChange={(e) => setGpsIconType(e.target.value)}
                    label="Icon Type"
                  >
                    <MenuItem value="default">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#1976d2' }} />
                        Default
                      </Box>
                    </MenuItem>
                    <MenuItem value="boat">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BoatIcon sx={{ color: '#1976d2' }} />
                        Boat
                      </Box>
                    </MenuItem>
                    <MenuItem value="ship">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ShipIcon sx={{ color: '#2e7d32' }} />
                        Ship
                      </Box>
                    </MenuItem>
                    <MenuItem value="vehicle">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CarIcon sx={{ color: '#ed6c02' }} />
                        Vehicle
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Speed Colors</InputLabel>
                  <Select
                    value={showSpeedColors ? 'enabled' : 'disabled'}
                    onChange={(e) => setShowSpeedColors(e.target.value === 'enabled')}
                    label="Speed Colors"
                  >
                    <MenuItem value="enabled">Enabled</MenuItem>
                    <MenuItem value="disabled">Disabled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  {showSpeedColors ? 
                    'Icons will change color based on speed: Green (slow), Orange (medium), Red (fast)' :
                    'Icons will use the default color for the selected type'
                  }
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Map Type Selector */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Map Type
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Choose your preferred map layer for tracking visualization
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  onClick={openMarineTraffic}
                  size="small"
                  sx={{ 
                    backgroundColor: '#1976d2',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#1565c0',
                    }
                  }}
                >
                  Marine Traffic
                </Button>
              </Box>
            </Box>
            <ToggleButtonGroup
              value={mapType}
              exclusive
              onChange={(event, newValue) => {
                if (newValue !== null) {
                  setMapType(newValue);
                }
              }}
              sx={{
                '& .MuiToggleButton-root': {
                  px: 2,
                  py: 1,
                  fontWeight: 600,
                  textTransform: 'none',
                  minWidth: 120,
                  fontSize: '0.8rem'
                },
                flexWrap: 'wrap',
                gap: 1
              }}
            >
              <ToggleButton value="osm" aria-label="osm">
                <MapIcon sx={{ mr: 0.5, fontSize: 16 }} />
                OSM
              </ToggleButton>
              <ToggleButton value="openseamap" aria-label="openseamap">
                <BoatIcon sx={{ mr: 0.5, fontSize: 16 }} />
                SeaMap
              </ToggleButton>
              <ToggleButton value="marine_traffic" aria-label="marine_traffic">
                <VisibilityIcon sx={{ mr: 0.5, fontSize: 16 }} />
                Traffic
              </ToggleButton>
              <ToggleButton value="noaa_charts" aria-label="noaa_charts">
                <PublicIcon sx={{ mr: 0.5, fontSize: 16 }} />
                NOAA
              </ToggleButton>
              <ToggleButton value="emodnet_bathymetry" aria-label="emodnet_bathymetry">
                <WaterIcon sx={{ mr: 0.5, fontSize: 16 }} />
                Bathymetry
              </ToggleButton>
              <ToggleButton value="opencpn_charts" aria-label="opencpn_charts">
                <BoatIcon sx={{ mr: 0.5, fontSize: 16 }} />
                OpenCPN
              </ToggleButton>
              <ToggleButton value="cartodb_dark" aria-label="cartodb_dark">
                <DarkModeIcon sx={{ mr: 0.5, fontSize: 16 }} />
                Dark Marine
              </ToggleButton>
              <ToggleButton value="cartodb_light" aria-label="cartodb_light">
                <LightModeIcon sx={{ mr: 0.5, fontSize: 16 }} />
                Light Marine
              </ToggleButton>
              <ToggleButton value="satellite" aria-label="satellite">
                <SatelliteIcon sx={{ mr: 0.5, fontSize: 16 }} />
                Satellite
              </ToggleButton>
              <ToggleButton value="marine_traffic_web" aria-label="marine_traffic_web">
                <OpenInNewIcon sx={{ mr: 0.5, fontSize: 16 }} />
                Marine Traffic
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {mapType === 'osm' && 'Standard street map with roads and landmarks'}
              {mapType === 'openseamap' && 'Marine navigation map with nautical features and sea marks'}
              {mapType === 'marine_traffic' && 'Voyager style map optimized for marine traffic visualization'}
              {mapType === 'noaa_charts' && 'Light nautical chart style without labels for clean navigation'}
              {mapType === 'emodnet_bathymetry' && 'Dark nautical chart style for depth and bathymetry data'}
              {mapType === 'opencpn_charts' && 'Light nautical chart style with all features for marine navigation'}
              {mapType === 'cartodb_dark' && 'Dark marine chart theme for low-light conditions'}
              {mapType === 'cartodb_light' && 'Light marine chart theme for clear visibility'}
              {mapType === 'satellite' && 'High-resolution satellite imagery'}
              {mapType === 'marine_traffic_web' && 'Open Marine Traffic web interface with real-time vessel tracking'}
            </Typography>
          </Paper>
        </Grid>

        {/* Replay Controls */}
        {trackingData.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Track Replay
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Replay the tracking history with customizable speed and controls
              </Typography>
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={2}>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Tooltip title="Previous Point">
                      <IconButton 
                        onClick={prevPoint} 
                        disabled={currentReplayIndex === 0}
                        size="small"
                      >
                        <PrevIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title={isReplaying ? "Pause" : "Play"}>
                      <IconButton 
                        onClick={isReplaying ? pauseReplay : startReplay}
                        disabled={trackingData.length === 0}
                        color="primary"
                        size="small"
                      >
                        {isReplaying ? <PauseIcon /> : <PlayIcon />}
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Stop">
                      <IconButton 
                        onClick={stopReplay}
                        disabled={!isReplaying && currentReplayIndex === 0}
                        size="small"
                      >
                        <StopIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Next Point">
                      <IconButton 
                        onClick={nextPoint}
                        disabled={currentReplayIndex >= trackingData.length - 1}
                        size="small"
                      >
                        <NextIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SpeedIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ minWidth: 60 }}>
                      Speed: {replaySpeed}x
                    </Typography>
                    <Slider
                      value={replaySpeed}
                      onChange={handleReplaySpeedChange}
                      min={0.1}
                      max={10}
                      step={0.1}
                      marks={[
                        { value: 0.1, label: '0.1x' },
                        { value: 1, label: '1x' },
                        { value: 5, label: '5x' },
                        { value: 10, label: '10x' }
                      ]}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ minWidth: 80 }}>
                      Progress: {Math.round(replayProgress)}%
                    </Typography>
                    <Slider
                      value={replayProgress}
                      onChange={handleReplayProgressChange}
                      min={0}
                      max={100}
                      step={0.1}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    {getCurrentReplayPoint() ? (
                      <>
                        Point {currentReplayIndex + 1} of {trackingData.length}<br />
                        Time: {new Date(getCurrentReplayPoint().timestamp).toLocaleString()}<br />
                        Speed: {getCurrentReplayPoint().speed || 0} km/h
                      </>
                    ) : (
                      'No data available'
                    )}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Map */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 600 }}>
            <Typography variant="h6" gutterBottom>
              Track Map
            </Typography>
            <SmartMap
              center={mapCenter}
              zoom={mapZoom}
              height="100%"
              mapType={mapType}
            >
              {/* Track line */}
              {trackCoordinates.length > 1 && (
                <Polyline
                  positions={trackCoordinates}
                  color="blue"
                  weight={3}
                  opacity={0.7}
                />
              )}
              
              {/* Replay marker (current position) */}
              {getCurrentReplayPoint() && (
                <Marker 
                  position={[getCurrentReplayPoint().latitude, getCurrentReplayPoint().longitude]}
                  icon={getCurrentIcon(getCurrentReplayPoint())}
                >
                  <Popup>
                    <div>
                      <strong>Current Position</strong><br />
                      Time: {new Date(getCurrentReplayPoint().timestamp).toLocaleString()}<br />
                      Speed: {getCurrentReplayPoint().speed || 0} km/h<br />
                      Direction: {getCurrentReplayPoint().direction || 0}°<br />
                      Point: {currentReplayIndex + 1} of {trackingData.length}
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* Start marker (only show when not replaying) */}
              {trackingData.length > 0 && !isReplaying && currentReplayIndex === 0 && (
                <Marker 
                  position={[trackingData[0].latitude, trackingData[0].longitude]}
                  icon={getCurrentIcon(trackingData[0])}
                >
                  <Popup>
                    <div>
                      <strong>Start Point</strong><br />
                      Time: {new Date(trackingData[0].timestamp).toLocaleString()}<br />
                      Speed: {trackingData[0].speed || 0} km/h<br />
                      Direction: {trackingData[0].direction || 0}°
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* End marker (only show when not replaying) */}
              {trackingData.length > 1 && !isReplaying && currentReplayIndex === 0 && (
                <Marker 
                  position={[trackingData[trackingData.length - 1].latitude, trackingData[trackingData.length - 1].longitude]}
                  icon={getCurrentIcon(trackingData[trackingData.length - 1])}
                >
                  <Popup>
                    <div>
                      <strong>End Point</strong><br />
                      Time: {new Date(trackingData[trackingData.length - 1].timestamp).toLocaleString()}<br />
                      Speed: {trackingData[trackingData.length - 1].speed || 0} km/h<br />
                      Direction: {trackingData[trackingData.length - 1].direction || 0}°
                    </div>
                  </Popup>
                </Marker>
              )}
            </SmartMap>
          </Paper>
        </Grid>

        {/* Track Info */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 600, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Track Information
            </Typography>
            
            {trackingData.length > 0 ? (
              <Box>
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Track Summary
                    </Typography>
                    <Typography variant="body2">
                      <strong>Points:</strong> {trackingData.length}<br />
                      <strong>Duration:</strong> {trackingData.length > 1 
                        ? `${Math.round((new Date(trackingData[trackingData.length - 1].timestamp) - new Date(trackingData[0].timestamp)) / (1000 * 60 * 60))} hours`
                        : 'N/A'}<br />
                      <strong>Start:</strong> {new Date(trackingData[0].timestamp).toLocaleString()}<br />
                      <strong>End:</strong> {new Date(trackingData[trackingData.length - 1].timestamp).toLocaleString()}
                      {(mapType === 'openseamap' || mapType === 'marine_traffic' || mapType === 'noaa_charts' || mapType === 'emodnet_bathymetry' || mapType === 'opencpn_charts' || mapType === 'cartodb_dark' || mapType === 'cartodb_light' || mapType === 'marine_traffic_web') && trackingData.length > 1 && (
                        <>
                          <br /><br />
                          <Typography variant="subtitle2" color="primary" gutterBottom>
                            🚢 Marine Navigation Info
                          </Typography>
                          <strong>Distance:</strong> {calculateDistance(trackingData).toFixed(2)} km<br />
                          <strong>Average Speed:</strong> {calculateAverageSpeed(trackingData).toFixed(1)} km/h<br />
                          <strong>Course Changes:</strong> {calculateCourseChanges(trackingData)}<br />
                          <strong>Max Speed:</strong> {Math.max(...trackingData.map(p => p.speed || 0)).toFixed(1)} km/h
                        </>
                      )}
                    </Typography>
                  </CardContent>
                </Card>

                <Typography variant="subtitle1" gutterBottom>
                  Recent Points
                </Typography>
                
                {trackingData.slice(-10).reverse().map((point, index) => (
                  <Card key={index} sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 1 }}>
                      <Typography variant="body2">
                        <strong>{new Date(point.timestamp).toLocaleString()}</strong><br />
                        <Chip 
                          label={`${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`} 
                          size="small" 
                          sx={{ mr: 1, mb: 1 }}
                        />
                        {point.speed && (
                          <Chip 
                            label={`${point.speed} km/h`} 
                            size="small" 
                            color="primary" 
                            sx={{ mr: 1, mb: 1 }}
                          />
                        )}
                        {point.direction && (
                          <Chip 
                            label={`${point.direction}°`} 
                            size="small" 
                            color="secondary" 
                            sx={{ mb: 1 }}
                          />
                        )}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No tracking data available. Select a device and time period to view the track.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Tracking; 