import React from 'react';
import { Paper, Typography } from '@mui/material';
import { Marker, Popup, Polyline } from 'react-leaflet';
import SmartMap from '../SmartMap';
import { trackingIcons, getSpeedBasedIcon } from '../../utils/trackingIcons';
import { resolveTrackTimestamp } from '../../utils/trackDecimation';

const TrackingMapPanel = ({
  mapCenter,
  mapZoom,
  mapType,
  trackCoordinates,
  trackingData,
  currentReplayPoint,
  currentReplayIndex,
  isReplaying,
  gpsIconType,
  showSpeedColors
}) => {
  const getCurrentIcon = (point) => {
    if (!point) return trackingIcons.default;
    if (showSpeedColors) {
      return getSpeedBasedIcon(gpsIconType, point.speed || 0);
    }
    return trackingIcons[gpsIconType] || trackingIcons.default;
  };

  return (
    <Paper sx={{ p: 2, height: 600 }}>
      <Typography variant="h6" gutterBottom>
        Track Map
      </Typography>
      <SmartMap center={mapCenter} zoom={mapZoom} height="100%" mapType={mapType}>
        {trackCoordinates.length > 1 && (
          <Polyline positions={trackCoordinates} color="blue" weight={3} opacity={0.7} />
        )}

        {currentReplayPoint && (
          <Marker
            position={[currentReplayPoint.latitude, currentReplayPoint.longitude]}
            icon={getCurrentIcon(currentReplayPoint)}
          >
            <Popup>
              <div>
                <strong>Current Position</strong><br />
                Time: {resolveTrackTimestamp(currentReplayPoint)
                  ? new Date(resolveTrackTimestamp(currentReplayPoint)).toLocaleString()
                  : 'N/A'}<br />
                Speed: {currentReplayPoint.speed || 0} km/h<br />
                Direction: {currentReplayPoint.direction || 0}°<br />
                Point: {currentReplayIndex + 1} of {trackingData.length}
              </div>
            </Popup>
          </Marker>
        )}

        {trackingData.length > 0 && !isReplaying && currentReplayIndex === 0 && (
          <Marker
            position={[trackingData[0].latitude, trackingData[0].longitude]}
            icon={getCurrentIcon(trackingData[0])}
          >
            <Popup>
              <div>
                <strong>Start Point</strong><br />
                Time: {resolveTrackTimestamp(trackingData[0])
                  ? new Date(resolveTrackTimestamp(trackingData[0])).toLocaleString()
                  : 'N/A'}<br />
                Speed: {trackingData[0].speed || 0} km/h
              </div>
            </Popup>
          </Marker>
        )}

        {trackingData.length > 1 && !isReplaying && currentReplayIndex === 0 && (
          <Marker
            position={[
              trackingData[trackingData.length - 1].latitude,
              trackingData[trackingData.length - 1].longitude
            ]}
            icon={getCurrentIcon(trackingData[trackingData.length - 1])}
          >
            <Popup>
              <div>
                <strong>End Point</strong><br />
                Time: {resolveTrackTimestamp(trackingData[trackingData.length - 1])
                  ? new Date(resolveTrackTimestamp(trackingData[trackingData.length - 1])).toLocaleString()
                  : 'N/A'}<br />
                Speed: {trackingData[trackingData.length - 1].speed || 0} km/h
              </div>
            </Popup>
          </Marker>
        )}
      </SmartMap>
    </Paper>
  );
};

export default TrackingMapPanel;
