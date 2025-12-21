import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Chip,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import axios from 'axios';

// Use the same API detection logic as your other components
const BASE_URL = (() => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  } else {
    return `http://${hostname}:3001`;
  }
})();

console.log('🔍 DataSM BASE_URL:', BASE_URL);

const DataSM = () => {
  console.log('🚀 DataSM component mounted');

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [startHour, setStartHour] = useState('00');
  const [endHour, setEndHour] = useState('23');
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [autoExportEnabled, setAutoExportEnabled] = useState(false);
  const [autoExportTime, setAutoExportTime] = useState('00:00');
  const [exporting, setExporting] = useState(false);

  // Field mapping for Data SM
  const fieldMapping = {
    deviceImei: 'IMEI',
    datetime: 'Timestamp',
    latitude: 'Lat',
    longitude: 'Lon',
    altitude: 'Alt',
    satellites: 'Satellite',
    speed: 'Speed',
    userData0: 'Sensor Kiri',
    userData1: 'Sensor Kanan',
    modbus0: 'Sensor Serial (Ultrasonic)',
    userData2: 'Uptime Seconds'
  };

  const fetchData = async () => {
    console.log('🔄 fetchData called');
    setLoading(true);
    try {
      const params = {
        startDate: new Date(`${startDate}T${startHour}:00:00`).toISOString(),
        endDate: new Date(`${endDate}T${endHour}:59:59`).toISOString(),
      };
      
      if (selectedDevices.length > 0) {
        params.imeis = selectedDevices.join(',');
      }
      
      const response = await axios.get(`${BASE_URL}/api/records`, { 
        params,
        withCredentials: true
      });
      setRecords(response.data);
      console.log('✅ fetchData completed:', response.data.length, 'records');
    } catch (error) {
      console.error('❌ Error fetching data:', error);
    }
    setLoading(false);
  };

  const fetchAvailableDevices = async () => {
    console.log('🔄 fetchAvailableDevices called');
    try {
      const response = await axios.get(`${BASE_URL}/api/devices`, {
        withCredentials: true
      });
      setAvailableDevices(response.data);
      console.log('✅ fetchAvailableDevices completed:', response.data.length, 'devices');
    } catch (error) {
      console.error('❌ Error fetching devices:', error);
      setAvailableDevices([]);
    }
  };

  const fetchAutoExportStatus = async () => {
    console.log('🔄 fetchAutoExportStatus called - BASE_URL:', BASE_URL);
    try {
      const url = `${BASE_URL}/api/auto-export/status`;
      console.log('🌐 Making request to:', url);
      
      const response = await axios.get(url, {
        withCredentials: true,
        timeout: 10000 // 10 second timeout
      });
      
      console.log('✅ Auto-export status response:', response.data);
      console.log('📊 Response status:', response.status);
      console.log('📋 Response headers:', response.headers);
      
      // Find the Data SM auto-export configuration
      const dataSMConfig = response.data.find(config => config.type === 'data-sm');
      
      console.log('🔍 Data SM config found:', dataSMConfig);
      
      if (dataSMConfig && dataSMConfig.enabled) {
        console.log('✅ Setting auto-export enabled:', dataSMConfig.enabled);
        setAutoExportEnabled(true);
        // Only set time if it's not already set by user (not '00:00' or empty)
        if (dataSMConfig.time && dataSMConfig.time !== '00:00') {
          setAutoExportTime(dataSMConfig.time);
        }
        setSelectedDevices(dataSMConfig.devices || []);
      } else {
        console.log('ℹ️ No enabled Data SM config found, resetting to defaults');
        setAutoExportEnabled(false);
        // Don't reset time to '00:00' if user has set a different time
        if (autoExportTime === '00:00') {
          setAutoExportTime('00:00');
        }
        setSelectedDevices([]);
      }
    } catch (error) {
      console.error('❌ Error fetching auto export status:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      // Reset to defaults on error
      setAutoExportEnabled(false);
      setAutoExportTime('00:00');
      setSelectedDevices([]);
    }
  };

  useEffect(() => {
    console.log('🚀 useEffect running');
    
    const initializeData = async () => {
      try {
        console.log('🔄 Starting data initialization...');
        await Promise.all([
          fetchData(),
          fetchAvailableDevices(),
          fetchAutoExportStatus()
        ]);
        console.log('✅ Data initialization completed');
      } catch (error) {
        console.error('❌ Error during data initialization:', error);
      }
    };
    
    initializeData();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {
        startDate: new Date(`${startDate}T${startHour}:00:00`).toISOString(),
        endDate: new Date(`${endDate}T${endHour}:59:59`).toISOString(),
        format: 'csv',
        fields: Object.keys(fieldMapping),
        imeis: selectedDevices.length > 0 ? selectedDevices : undefined,
        customHeaders: fieldMapping,
        fileExtension: 'pfsl'
      };

      const response = await axios.post(
        `${BASE_URL}/api/records/export-sm`,
        params,
        {
          responseType: 'blob',
          withCredentials: true
        }
      );

      const contentDisposition = response.headers['content-disposition'];
      let filename = 'export.pfsl';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
    }
    setExporting(false);
  };

  const handleAutoExportToggle = async () => {
    console.log('🔄 handleAutoExportToggle called, current state:', autoExportEnabled);
    try {
      const newState = !autoExportEnabled;
      console.log('🔄 Sending auto-export request:', {
        enabled: newState,
        time: autoExportTime,
        devices: selectedDevices,
        fields: Object.keys(fieldMapping),
        customHeaders: fieldMapping
      });
      
      const response = await axios.post(`${BASE_URL}/api/auto-export/sm`, {
        enabled: newState,
        time: autoExportTime,
        devices: selectedDevices,
        fields: Object.keys(fieldMapping),
        customHeaders: fieldMapping
      }, {
        withCredentials: true
      });
      
      console.log('✅ Auto-export toggle response:', response.data);
      setAutoExportEnabled(newState);
      
      // Refresh the status after toggling
      setTimeout(() => {
        fetchAutoExportStatus();
      }, 500);
      
    } catch (error) {
      console.error('❌ Error toggling auto export:', error);
    }
  };

  const formatDataForDisplay = (records) => {
    return records.map(record => {
      const device = availableDevices.find(d => d.imei === record.deviceImei);
      return {
        deviceName: device ? device.name : record.deviceImei,
        deviceImei: record.deviceImei,
        datetime: record.datetime ? new Date(record.datetime).toLocaleString() : 'N/A',
        latitude: record.latitude || 'N/A',
        longitude: record.longitude || 'N/A',
        speed: record.speed === null || record.speed === undefined ? 'N/A' : record.speed,
        altitude: record.altitude || 'N/A',
        satellites: record.satellites || 'N/A',
        userData0: record.userData0 || 'N/A',
        userData1: record.userData1 || 'N/A',
        modbus0: record.modbus0 || 'N/A',
        userData2: record.userData2 || 'N/A'
      };
    });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Data SM
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Sensor monitoring data export
        </Typography>

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Export Configuration
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Start Hour</InputLabel>
                <Select
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                >
                  {Array.from({length: 24}, (_, i) => (
                    <MenuItem key={i} value={String(i).padStart(2, '0')}>
                      {String(i).padStart(2, '0')}:00
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>End Hour</InputLabel>
                <Select
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                >
                  {Array.from({length: 24}, (_, i) => (
                    <MenuItem key={i} value={String(i).padStart(2, '0')}>
                      {String(i).padStart(2, '0')}:59
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Devices</InputLabel>
                <Select
                  multiple
                  value={selectedDevices}
                  onChange={(e) => setSelectedDevices(e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const device = availableDevices.find(d => d.imei === value);
                        return (
                          <Chip key={value} label={device ? device.name || device.imei : value} />
                        );
                      })}
                    </Box>
                  )}
                >
                  {availableDevices.map((device) => (
                    <MenuItem key={device.imei} value={device.imei}>
                      {device.name || device.imei}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Auto Export Configuration */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Auto Export Configuration
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoExportEnabled}
                      onChange={handleAutoExportToggle}
                    />
                  }
                  label={`Auto Export ${autoExportEnabled ? 'Enabled' : 'Disabled'}`}
                />
              </Grid>
              <Grid item xs={12} md={4}>
              <TextField
  fullWidth
  label="Export Time (UTC)"
  type="time"
  value={autoExportTime}
  onChange={async (e) => {
    const newTime = e.target.value;
    setAutoExportTime(newTime);
    
    // If auto-export is enabled, update the backend immediately
    if (autoExportEnabled) {
      try {
        console.log('🔄 Updating auto-export time to:', newTime);
        await axios.post(`${BASE_URL}/api/auto-export/sm`, {
          enabled: true,
          time: newTime,
          devices: selectedDevices,
          fields: Object.keys(fieldMapping),
          customHeaders: fieldMapping
        }, {
          withCredentials: true
        });
        console.log('✅ Auto-export time updated to:', newTime);
      } catch (error) {
        console.error('❌ Error updating auto-export time:', error);
      }
    }
  }}
  disabled={!autoExportEnabled}
  InputLabelProps={{ shrink: true }}
/>

              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={fetchAutoExportStatus}
                >
                  Refresh Status
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? <CircularProgress size={20} /> : 'Export Data SM'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
              disabled={loading}
            >
              Refresh Data
            </Button>
          </Box>

          {/* Data Preview */}
          {records.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Data Preview (100 records shown)
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {startDate} {startHour}:00 - {endDate} {endHour}:59
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>IMEI</TableCell>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Lat</TableCell>
                      <TableCell>Lon</TableCell>
                      <TableCell>Alt</TableCell>
                      <TableCell>Satellite</TableCell>
                      <TableCell>Speed</TableCell>
                      <TableCell>Sensor Kiri</TableCell>
                      <TableCell>Sensor Kanan</TableCell>
                      <TableCell>Sensor Serial</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formatDataForDisplay(records.slice(0, 100)).map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{record.deviceImei}</TableCell>
                        <TableCell>{record.datetime}</TableCell>
                        <TableCell>{record.latitude}</TableCell>
                        <TableCell>{record.longitude}</TableCell>
                        <TableCell>{record.altitude}</TableCell>
                        <TableCell>{record.satellites}</TableCell>
                        <TableCell>{record.speed}</TableCell>
                        <TableCell>{record.userData0}</TableCell>
                        <TableCell>{record.userData1}</TableCell>
                        <TableCell>{record.modbus0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default DataSM;