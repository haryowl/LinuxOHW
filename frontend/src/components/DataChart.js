// frontend/src/components/DataChart.js
import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Box, Typography, Paper, Grid, Chip } from '@mui/material';

const DataChart = ({ data = [], compact = false }) => {
  // Rolling 24-hour window for chartData
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Create 24 hourly slots, each with a Date object for the last 24 hours
    const now = new Date();
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      hour.setMinutes(0, 0, 0);
      return hour;
    });

    return hours.map(hour => {
      const hourData = data.filter(record => {
        const recordTime = new Date(record.timestamp);
        // Match year, month, day, hour
        return recordTime.getFullYear() === hour.getFullYear() &&
               recordTime.getMonth() === hour.getMonth() &&
               recordTime.getDate() === hour.getDate() &&
               recordTime.getHours() === hour.getHours();
      });
      return {
        hour: hour.toLocaleString([], { hour: '2-digit', hour12: false, month: '2-digit', day: '2-digit' }),
        count: hourData.length,
        avgSpeed: hourData.length > 0 
          ? hourData.reduce((sum, r) => sum + (r.speed || 0), 0) / hourData.length 
          : 0,
        avgVoltage: hourData.length > 0 
          ? hourData.reduce((sum, r) => sum + (r.supplyVoltage || 0), 0) / hourData.length 
          : 0
      };
    });
  }, [data]);

  const deviceStats = useMemo(() => {
    if (!data || data.length === 0) return {};

    const deviceCounts = {};
    const deviceSpeeds = {};
    const deviceVoltages = {};

    data.forEach(record => {
      const imei = record.deviceImei;
      if (!deviceCounts[imei]) {
        deviceCounts[imei] = 0;
        deviceSpeeds[imei] = [];
        deviceVoltages[imei] = [];
      }
      deviceCounts[imei]++;
      if (record.speed) deviceSpeeds[imei].push(record.speed);
      if (record.supplyVoltage) deviceVoltages[imei].push(record.supplyVoltage);
    });

    return {
      deviceCounts,
      deviceSpeeds,
      deviceVoltages
    };
  }, [data]);

  // Pie chart data and percentage fix
  const pieData = useMemo(() => {
    const counts = deviceStats.deviceCounts || {};
    const total = Object.values(counts).reduce((sum, v) => sum + v, 0) || 1;
    return Object.entries(counts).map(([imei, count]) => ({
      name: imei.slice(-6),
      value: count,
      percent: (count / total) * 100
    }));
  }, [deviceStats]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Typography variant="body1" color="text.secondary">
          No data available for visualization
        </Typography>
      </Box>
    );
  }

  // Compact version for dashboard
  if (compact) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Summary Stats */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            <Chip 
              label={`${data.length} records`} 
              color="primary" 
              size="small"
              variant="outlined"
            />
            <Chip 
              label={`${Object.keys(deviceStats.deviceCounts || {}).length} devices`} 
              color="secondary" 
              size="small"
              variant="outlined"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`Avg: ${(data.reduce((sum, r) => sum + (r.speed || 0), 0) / data.length).toFixed(1)} km/h`} 
              color="success" 
              size="small"
              variant="outlined"
            />
            <Chip 
              label={`Voltage: ${(data.reduce((sum, r) => sum + (r.supplyVoltage || 0), 0) / data.length).toFixed(0)} mV`} 
              color="warning" 
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>

        {/* Activity Chart */}
        <Box sx={{ flex: 1, minHeight: 200 }}>
          <Typography variant="subtitle2" gutterBottom>
            Activity (24h)
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: 4
                }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Records"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        {/* Device Distribution (small pie chart) */}
        {pieData.length > 0 && (
          <Box sx={{ mt: 2, height: 120 }}>
            <Typography variant="subtitle2" gutterBottom>
              Device Distribution
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>
    );
  }

  // Full version for dedicated charts page
  return (
    <Grid container spacing={3}>
      {/* Summary Stats */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
          <Typography variant="h6" gutterBottom>
            Summary Statistics
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={`Total Records: ${data.length.toLocaleString()}`} 
              color="primary" 
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Chip 
              label={`Unique Devices: ${Object.keys(deviceStats.deviceCounts || {}).length}`} 
              color="secondary" 
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Chip 
              label={`Avg Speed: ${(data.reduce((sum, r) => sum + (r.speed || 0), 0) / data.length).toFixed(1)} km/h`} 
              color="success" 
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Chip 
              label={`Avg Voltage: ${(data.reduce((sum, r) => sum + (r.supplyVoltage || 0), 0) / data.length).toFixed(0)} mV`} 
              color="warning" 
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </Paper>
      </Grid>

      {/* Activity Over Time */}
      <Grid item xs={12} lg={8}>
        <Paper sx={{ p: 3, height: 350 }}>
          <Typography variant="h6" gutterBottom>
            Activity Over Time (Last 24 Hours)
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: 4
                }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#8884d8" 
                strokeWidth={3}
                name="Records"
                dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Device Distribution */}
      <Grid item xs={12} lg={4}>
        <Paper sx={{ p: 3, height: 350 }}>
          <Typography variant="h6" gutterBottom>
            Device Activity Distribution
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Speed Distribution */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: 300 }}>
          <Typography variant="h6" gutterBottom>
            Speed Distribution
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: 4
                }}
              />
              <Bar dataKey="avgSpeed" fill="#82ca9d" name="Avg Speed (km/h)" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Voltage Distribution */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: 300 }}>
          <Typography variant="h6" gutterBottom>
            Voltage Distribution
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: 4
                }}
              />
              <Bar dataKey="avgVoltage" fill="#ffc658" name="Avg Voltage (mV)" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default DataChart;
