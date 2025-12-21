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
  Tooltip,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  TextField,
  Switch
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
  DirectionsBoat as ShipIcon,
  Palette as PaletteIcon,
  VisibilityOff as VisibilityOffIcon,
  FilterList as FilterIcon,
  LocationOn as LocationIcon,
  GpsFixed as GpsIcon,
  Terrain as TerrainIcon,
  Streetview as StreetviewIcon
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

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Color palette for devices
const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
  '#A9DFBF', '#F9E79F', '#D5DBDB', '#FADBD8', '#D6EAF8'
];

// Custom marker icons for different devices
const createCustomIcon = (color, deviceName) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: white;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
      ">
        ${deviceName ? deviceName.charAt(0).toUpperCase() : 'D'}
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const MultiTracking = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [deviceTrackingData, setDeviceTrackingData] = useState({}); // Store tracking data per device
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([-6.200000, 106.816666]); // Jakarta
  const [mapZoom, setMapZoom] = useState(10);
  const [mapType, setMapType] = useState('satellite');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000)); // 24 hours ago
  const [endDate, setEndDate] = useState(new Date());
  const [showPaths, setShowPaths] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedDeviceColors, setSelectedDeviceColors] = useState({});

  // GPS Filtering States (same as Tracking menu)
  const [filteringEnabled, setFilteringEnabled] = useState(true);
  const [filteringStats, setFilteringStats] = useState(null);
  const [filteringOptions, setFilteringOptions] = useState({
    maxDistanceKm: 50,
    maxSpeedKmh: 200,
    enableSpeedFilter: true,
    enableDistanceFilter: true,
    enableCoordinateValidation: true
  });

  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Map type options
  const mapTypeOptions = [
    { value: 'satellite', label: 'Satellite', icon: <SatelliteIcon /> },
    { value: 'street', label: 'Street', icon: <MapIcon /> },
    { value: 'terrain', label: 'Terrain', icon: <TerrainIcon /> },
    { value: 'hybrid', label: 'Hybrid', icon: <StreetviewIcon /> }
  ];

  // Fetch available devices
  const fetchAvailableDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/devices`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch devices');
      }
      
      const data = await response.json();
      console.log('📱 Available devices for multi-tracking:', data);
      setDevices(data);
    } catch (error) {
      console.error('❌ Error fetching devices:', error);
      setError('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  // Fetch tracking data for a single device (same as Tracking menu)
// Fetch tracking data for a single device (using new IMEI endpoint)
const fetchDeviceTrackingData = async (deviceImei) => {
  try {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // Use the new IMEI-based endpoint
    const url = `${BASE_URL}/api/data/imei/${deviceImei}/tracking?${params}`;
    console.log('Fetching tracking data for device:', deviceImei, 'from:', url);

    const response = await fetch(url, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      if (response.status === 403) {
        throw new Error('Access denied to this device');
      }
      if (response.status === 404) {
        throw new Error('Device not found');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Tracking data received for device:', deviceImei, data);
    const rawData = Array.isArray(data) ? data : [];
    
    // Apply GPS filtering if enabled (same as Tracking menu)
    let processedData = rawData;
    let stats = null;
    
    if (filteringEnabled && rawData.length > 0) {
      const result = advancedGPSFilter(rawData, filteringOptions);
      processedData = result.filteredData;
      stats = result.stats;
      console.log('GPS filtering applied for device:', deviceImei, stats);
    }
    
    return { processedData, stats };
  } catch (error) {
    console.error(`Error loading tracking data for device ${deviceImei}:`, error);
    throw error;
  }
};

  // Fetch tracking data for all selected devices
  const fetchAllDeviceTrackingData = async () => {
    if (selectedDevices.length === 0) {
      setDeviceTrackingData({});
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const trackingDataPromises = selectedDevices.map(async (deviceImei) => {
        try {
          const { processedData, stats } = await fetchDeviceTrackingData(deviceImei);
          return { deviceImei, data: processedData, stats };
        } catch (error) {
          console.error(`Failed to fetch data for device ${deviceImei}:`, error);
          return { deviceImei, data: [], stats: null };
        }
      });

      const results = await Promise.all(trackingDataPromises);
      
      // Convert results to object
      const newDeviceTrackingData = {};
      results.forEach(({ deviceImei, data, stats }) => {
        newDeviceTrackingData[deviceImei] = { data, stats };
      });
      
      setDeviceTrackingData(newDeviceTrackingData);
      
      // Set map center to first device's first point
      const firstDeviceData = Object.values(newDeviceTrackingData).find(device => device.data.length > 0);
      if (firstDeviceData && firstDeviceData.data.length > 0) {
        setMapCenter([firstDeviceData.data[0].latitude, firstDeviceData.data[0].longitude]);
        setMapZoom(13);
      }
      
    } catch (error) {
      console.error('❌ Error fetching device tracking data:', error);
      setError('Failed to fetch device tracking data');
    } finally {
      setLoading(false);
    }
  };

  // Handle device selection
  const handleDeviceSelection = (deviceImei, isSelected) => {
    if (isSelected) {
      const device = devices.find(d => d.imei === deviceImei);
      if (device) {
        const colorIndex = selectedDevices.length % COLOR_PALETTE.length;
        setSelectedDevices(prev => [...prev, deviceImei]);
        setSelectedDeviceColors(prev => ({
          ...prev,
          [deviceImei]: COLOR_PALETTE[colorIndex]
        }));
      }
    } else {
      setSelectedDevices(prev => prev.filter(imei => imei !== deviceImei));
      setSelectedDeviceColors(prev => {
        const newColors = { ...prev };
        delete newColors[deviceImei];
        return newColors;
      });
      
      // Remove tracking data for deselected device
      setDeviceTrackingData(prev => {
        const newData = { ...prev };
        delete newData[deviceImei];
        return newData;
      });
    }
  };

  // Get device color
  const getDeviceColor = (deviceImei) => {
    return selectedDeviceColors[deviceImei] || '#FF6B6B';
  };

  // Get device name
  const getDeviceName = (deviceImei) => {
    const device = devices.find(d => d.imei === deviceImei);
    return device ? device.name : deviceImei;
  };

  // Get latest location for each device
  const getDeviceLatestLocations = () => {
    const locations = [];
    Object.entries(deviceTrackingData).forEach(([deviceImei, { data }]) => {
      if (data.length > 0) {
        const latestPoint = data[data.length - 1];
        locations.push({
          deviceImei,
          name: getDeviceName(deviceImei),
          color: getDeviceColor(deviceImei),
          location: {
            latitude: latestPoint.latitude,
            longitude: latestPoint.longitude,
            timestamp: latestPoint.datetime,
            speed: latestPoint.speed,
            direction: latestPoint.direction,
            altitude: latestPoint.altitude,
            satellites: latestPoint.satellites,
            hdop: latestPoint.hdop
          }
        });
      }
    });
    return locations;
  };

  // Get tracking coordinates for polylines
  const getTrackingCoordinates = () => {
    const coordinates = [];
    Object.entries(deviceTrackingData).forEach(([deviceImei, { data }]) => {
      if (data.length > 0) {
        const deviceCoordinates = data.map(point => [point.latitude, point.longitude]);
        coordinates.push({
          deviceImei,
          color: getDeviceColor(deviceImei),
          coordinates: deviceCoordinates
        });
      }
    });
    return coordinates;
  };

  // Initial data fetch
  useEffect(() => {
    fetchAvailableDevices();
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
        <Grid container spacing={2}>
          {/* Control Panel */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, height: '80vh', overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                🎨 Multi Device Tracking
              </Typography>
              
              {/* Date Period Selection */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Date Period
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <DateTimePicker
                      label="Start Date"
                      value={startDate}
                      onChange={setStartDate}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small'
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <DateTimePicker
                      label="End Date"
                      value={endDate}
                      onChange={setEndDate}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small'
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={fetchAllDeviceTrackingData}
                      disabled={loading || selectedDevices.length === 0}
                      fullWidth
                      size="small"
                    >
                      {loading ? 'Loading...' : 'Load Tracking Data'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              {/* Map Type Selection */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Map Type
                </Typography>
                <ToggleButtonGroup
                  value={mapType}
                  exclusive
                  onChange={(e, newType) => setMapType(newType)}
                  size="small"
                  fullWidth
                >
                  {mapTypeOptions.map(option => (
                    <ToggleButton key={option.value} value={option.value}>
                      <Tooltip title={option.label}>
                        {option.icon}
                      </Tooltip>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              {/* GPS Filter Toggle */}
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filteringEnabled}
                      onChange={(e) => setFilteringEnabled(e.target.checked)}
                    />
                  }
                  label="GPS Filter"
                />
                <IconButton
                  size="small"
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                >
                  <FilterIcon />
                </IconButton>
              </Box>

              {/* GPS Filter Panel (same as Tracking menu) */}
              {showFilterPanel && filteringEnabled && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    GPS Filter Settings
                  </Typography>
                  
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Max Distance (km)</InputLabel>
                        <Select
                          value={filteringOptions.maxDistanceKm}
                          onChange={(e) => setFilteringOptions(prev => ({ ...prev, maxDistanceKm: e.target.value }))}
                          label="Max Distance (km)"
                        >
                          <MenuItem value={10}>10 km</MenuItem>
                          <MenuItem value={25}>25 km</MenuItem>
                          <MenuItem value={50}>50 km</MenuItem>
                          <MenuItem value={100}>100 km</MenuItem>
                          <MenuItem value={200}>200 km</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Max Speed (km/h)</InputLabel>
                        <Select
                          value={filteringOptions.maxSpeedKmh}
                          onChange={(e) => setFilteringOptions(prev => ({ ...prev, maxSpeedKmh: e.target.value }))}
                          label="Max Speed (km/h)"
                        >
                          <MenuItem value={50}>50 km/h</MenuItem>
                          <MenuItem value={100}>100 km/h</MenuItem>
                          <MenuItem value={200}>200 km/h</MenuItem>
                          <MenuItem value={500}>500 km/h</MenuItem>
                          <MenuItem value={1000}>1000 km/h</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label="Coordinate Validation"
                      color={filteringOptions.enableCoordinateValidation ? "primary" : "default"}
                      onClick={() => setFilteringOptions(prev => ({ 
                        ...prev, 
                        enableCoordinateValidation: !prev.enableCoordinateValidation 
                      }))}
                      variant={filteringOptions.enableCoordinateValidation ? "filled" : "outlined"}
                      size="small"
                    />
                    <Chip
                      label="Distance Filter"
                      color={filteringOptions.enableDistanceFilter ? "primary" : "default"}
                      onClick={() => setFilteringOptions(prev => ({ 
                        ...prev, 
                        enableDistanceFilter: !prev.enableDistanceFilter 
                      }))}
                      variant={filteringOptions.enableDistanceFilter ? "filled" : "outlined"}
                      size="small"
                    />
                    <Chip
                      label="Speed Filter"
                      color={filteringOptions.enableSpeedFilter ? "primary" : "default"}
                      onClick={() => setFilteringOptions(prev => ({ 
                        ...prev, 
                        enableSpeedFilter: !prev.enableSpeedFilter 
                      }))}
                      variant={filteringOptions.enableSpeedFilter ? "filled" : "outlined"}
                      size="small"
                    />
                  </Box>
                </Box>
              )}

              {/* Device Selection */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Select Devices ({selectedDevices.length} selected)
                </Typography>
                <List dense>
                  {devices.map((device, index) => {
                    const isSelected = selectedDevices.includes(device.imei);
                    const deviceColor = getDeviceColor(device.imei);
                    
                    return (
                      <ListItem key={device.imei} dense>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isSelected}
                              onChange={(e) => handleDeviceSelection(device.imei, e.target.checked)}
                              sx={{
                                color: deviceColor,
                                '&.Mui-checked': {
                                  color: deviceColor,
                                }
                              }}
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                              <Box
                                sx={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: '50%',
                                  backgroundColor: deviceColor,
                                  mr: 1,
                                  border: '1px solid #ccc'
                                }}
                              />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" noWrap>
                                  {device.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {device.imei}
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Map Controls */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Map Controls
                </Typography>
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showPaths}
                      onChange={(e) => setShowPaths(e.target.checked)}
                    />
                  }
                  label="Show Paths"
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showLabels}
                      onChange={(e) => setShowLabels(e.target.checked)}
                    />
                  }
                  label="Show Labels"
                />
              </Box>

              {/* Selected Devices Summary */}
              {selectedDevices.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Devices
                  </Typography>
                  {selectedDevices.map(imei => {
                    const device = devices.find(d => d.imei === imei);
                    const trackingData = deviceTrackingData[imei];
                    return (
                      <Card key={imei} sx={{ mb: 1, p: 1 }}>
                        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: getDeviceColor(imei),
                                mr: 1
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" noWrap>
                                {device?.name || imei}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {trackingData?.data?.length || 0} points
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Map */}
          <Grid item xs={12} md={9}>
            <Paper sx={{ height: '80vh', overflow: 'hidden' }}>
              <SmartMap
                center={mapCenter}
                zoom={mapZoom}
                mapType={mapType}
                height="100%"
              >
                {/* Device Markers */}
                {getDeviceLatestLocations().map(device => (
                  <Marker
                    key={device.deviceImei}
                    position={[device.location.latitude, device.location.longitude]}
                    icon={createCustomIcon(device.color, device.name)}
                  >
                    <Popup>
                      <div>
                        <h3>{device.name}</h3>
                        <p><strong>IMEI:</strong> {device.deviceImei}</p>
                        <p><strong>Last Update:</strong> {new Date(device.location.timestamp).toLocaleString()}</p>
                        <p><strong>Speed:</strong> {device.location.speed || 0} km/h</p>
                        <p><strong>Direction:</strong> {device.location.direction || 0}°</p>
                        <p><strong>Altitude:</strong> {device.location.altitude || 0} m</p>
                        <p><strong>Satellites:</strong> {device.location.satellites || 0}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                
                {/* Tracking Lines */}
                {showPaths && getTrackingCoordinates().map(({ deviceImei, color, coordinates }) => (
                  <Polyline
                    key={deviceImei}
                    positions={coordinates}
                    color={color}
                    weight={3}
                    opacity={0.7}
                  />
                ))}
              </SmartMap>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </LocalizationProvider>
  );
};

export default MultiTracking;