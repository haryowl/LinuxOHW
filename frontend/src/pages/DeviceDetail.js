// frontend/src/pages/DeviceDetail.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert
} from '@mui/material';
import { Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import useWebSocket from '../hooks/useWebSocket';
import SmartMap from '../components/SmartMap';
import { BASE_URL } from '../services/api';

const DeviceDetail = () => {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDeviceData = useCallback(async () => {
    if (!deviceId) {
      setError('Device ID is required');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [deviceResponse, dataResponse] = await Promise.all([
        fetch(`${BASE_URL}/api/devices/${deviceId}`),
        fetch(`${BASE_URL}/api/data/${deviceId}`)
      ]);

      if (!deviceResponse.ok) {
        throw new Error(`Device not found: ${deviceResponse.status}`);
      }

      if (!dataResponse.ok) {
        throw new Error(`Failed to load device data: ${dataResponse.status}`);
      }

      const deviceData = await deviceResponse.json();
      const deviceHistory = await dataResponse.json();

      setDevice(deviceData);
      setData(Array.isArray(deviceHistory) ? deviceHistory : []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading device data:', error);
      setError(error.message);
      setLoading(false);
    }
  }, [deviceId]);

  const handleWebSocketMessage = (message) => {
    if (message.type === 'deviceUpdate' && message.data.deviceId === deviceId) {
      setDevice(prev => ({ ...prev, ...message.data }));
    } else if (message.type === 'dataUpdate' && message.data.deviceId === deviceId) {
      setData(prev => [...prev, message.data]);
    }
  };

  const ws = useWebSocket('ws://localhost:3000', handleWebSocketMessage);

  useEffect(() => {
    loadDeviceData();
  }, [loadDeviceData, ws]);

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/devices')}>
          Back to Devices
        </Button>
      </Container>
    );
  }

  if (!device) {
    return (
      <Container>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Device not found
        </Alert>
        <Button variant="contained" onClick={() => navigate('/devices')}>
          Back to Devices
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom>
              {device.name || device.imei}
            </Typography>
            <Typography variant="subtitle1">
              IMEI: {device.imei}
            </Typography>
            <Typography variant="subtitle1">
              Status: {device.status || 'Unknown'}
            </Typography>
            {device.lastSeen && (
              <Typography variant="subtitle1">
                Last Seen: {new Date(device.lastSeen).toLocaleString()}
              </Typography>
            )}
          </Paper>
        </Grid>

        {device.latitude && device.longitude && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Location
              </Typography>
              <SmartMap
                center={[device.latitude, device.longitude]}
                zoom={13}
                height="100%"
              >
                <Marker position={[device.latitude, device.longitude]}>
                  <Popup>
                    {device.name || device.imei}
                  </Popup>
                </Marker>
              </SmartMap>
            </Paper>
          </Grid>
        )}

        <Grid item xs={12} md={device.latitude && device.longitude ? 6 : 12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Data ({data.length} records)
            </Typography>
            {data.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No data available for this device.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Latitude</TableCell>
                      <TableCell>Longitude</TableCell>
                      <TableCell>Speed</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(item.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>{item.latitude || 'N/A'}</TableCell>
                        <TableCell>{item.longitude || 'N/A'}</TableCell>
                        <TableCell>{item.speed || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DeviceDetail;
