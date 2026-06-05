import React from 'react';
import { Paper, Typography, Box, Card, CardContent, Chip } from '@mui/material';
import { resolveTrackTimestamp } from '../../utils/trackDecimation';
import {
  calculateDistance,
  calculateAverageSpeed,
  calculateCourseChanges
} from '../../utils/trackingMath';

const MARINE_MAP_TYPES = new Set([
  'openseamap',
  'marine_traffic',
  'noaa_charts',
  'emodnet_bathymetry',
  'opencpn_charts',
  'cartodb_dark',
  'cartodb_light',
  'marine_traffic_web'
]);

const TrackInfoPanel = ({ trackingData, trackSummary, mapType }) => {
  return (
    <Paper sx={{ p: 2, height: 600, overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Track Information
      </Typography>

      {trackSummary ? (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Track Summary
              </Typography>
              <Typography variant="body2">
                <strong>Points:</strong> {trackSummary.points}<br />
                <strong>Duration:</strong> {trackSummary.durationHours !== null
                  ? `${trackSummary.durationHours} hours`
                  : 'N/A'}<br />
                <strong>Start:</strong> {trackSummary.startTs
                  ? new Date(trackSummary.startTs).toLocaleString()
                  : 'N/A'}<br />
                <strong>End:</strong> {trackSummary.endTs
                  ? new Date(trackSummary.endTs).toLocaleString()
                  : 'N/A'}
                {MARINE_MAP_TYPES.has(mapType) && trackingData.length > 1 && (
                  <>
                    <br /><br />
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Marine Navigation Info
                    </Typography>
                    <strong>Distance:</strong> {calculateDistance(trackingData).toFixed(2)} km<br />
                    <strong>Average Speed:</strong> {calculateAverageSpeed(trackingData).toFixed(1)} km/h<br />
                    <strong>Course Changes:</strong> {calculateCourseChanges(trackingData)}<br />
                    <strong>Max Speed:</strong> {Math.max(...trackingData.map((p) => p.speed || 0)).toFixed(1)} km/h
                  </>
                )}
              </Typography>
            </CardContent>
          </Card>

          <Typography variant="subtitle1" gutterBottom>
            Recent Points
          </Typography>

          {trackingData.slice(-10).reverse().map((point, index) => (
            <Card key={`${resolveTrackTimestamp(point)}-${index}`} sx={{ mb: 1 }}>
              <CardContent sx={{ py: 1 }}>
                <Typography variant="body2">
                  <strong>
                    {resolveTrackTimestamp(point)
                      ? new Date(resolveTrackTimestamp(point)).toLocaleString()
                      : 'N/A'}
                  </strong><br />
                  <Chip
                    label={`${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                  {point.speed ? (
                    <Chip label={`${point.speed} km/h`} size="small" color="primary" sx={{ mr: 1, mb: 1 }} />
                  ) : null}
                  {point.direction ? (
                    <Chip label={`${point.direction}°`} size="small" color="secondary" sx={{ mb: 1 }} />
                  ) : null}
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
  );
};

export default TrackInfoPanel;
