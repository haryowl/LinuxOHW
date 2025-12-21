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
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab,
  Chip,
  OutlinedInput,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import { BASE_URL } from '../services/api';

const DataExport = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFields, setSelectedFields] = useState({
    timestamp: true,
    datetime: true, // Add datetime field
    deviceImei: true,
    recordNumber: true,
    latitude: true,
    longitude: true,
    speed: true,
    direction: true,
    altitude: true, // Add altitude field
    course: true, // Add course field
    satellites: true, // Add satellites field
    hdop: true, // Add hdop field
    status: true,
    supplyVoltage: true,
    batteryVoltage: true,
    input0: true,
    input1: true,
    input2: true,
    input3: true,
    inputVoltage0: true,
    inputVoltage1: true,
    inputVoltage2: true,
    inputVoltage3: true,
    inputVoltage4: true,
    inputVoltage5: true,
    inputVoltage6: true,
    userData0: true,
    userData1: true,
    userData2: true,
    userData3: true,
    userData4: true,
    userData5: true,
    userData6: true,
    userData7: true,
    modbus0: true,
    modbus1: true,
    modbus2: true,
    modbus3: true,
    modbus4: true,
    modbus5: true,
    modbus6: true,
    modbus7: true,
    modbus8: true,
    modbus9: true,
    modbus10: true,
    modbus11: true,
    modbus12: true,
    modbus13: true,
    modbus14: true,
    modbus15: true
  });
  const [exportFormat, setExportFormat] = useState('csv');
  const [activeTab, setActiveTab] = useState(0);
  const [availableImeis, setAvailableImeis] = useState([]);
  const [selectedImeis, setSelectedImeis] = useState([]);
  const [imeiLoading, setImeiLoading] = useState(false);

  const fieldGroups = {
    'Basic Information': ['timestamp', 'datetime', 'deviceImei', 'recordNumber', 'latitude', 'longitude', 'speed', 'direction', 'altitude', 'course', 'satellites', 'hdop', 'status'],
    'Power Information': ['supplyVoltage', 'batteryVoltage'],
    'Input States': ['input0', 'input1', 'input2', 'input3'],
    'Input Voltages': ['inputVoltage0', 'inputVoltage1', 'inputVoltage2', 'inputVoltage3', 'inputVoltage4', 'inputVoltage5', 'inputVoltage6'],
    'User Data': ['userData0', 'userData1', 'userData2', 'userData3', 'userData4', 'userData5', 'userData6', 'userData7'],
    'Modbus Data': ['modbus0', 'modbus1', 'modbus2', 'modbus3', 'modbus4', 'modbus5', 'modbus6', 'modbus7', 'modbus8', 'modbus9', 'modbus10', 'modbus11', 'modbus12', 'modbus13', 'modbus14', 'modbus15']
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      };
      
      // Add IMEI filtering if selected
      if (selectedImeis.length > 0) {
        params.imeis = selectedImeis.join(',');
      }
      
      const response = await axios.get(`${BASE_URL}/api/records`, { params });
      setRecords(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const fetchAvailableImeis = async () => {
    setImeiLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/records/imeis`);
      setAvailableImeis(response.data);
    } catch (error) {
      console.error('Error fetching IMEIs:', error);
      // Set empty array as fallback
      setAvailableImeis([]);
    } finally {
      setImeiLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAvailableImeis();
  }, []);

  const handleExport = async () => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/records/export`,
        {
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          format: exportFormat,
          fields: Object.entries(selectedFields)
            .filter(([_, selected]) => selected)
            .map(([field]) => field),
          imeis: selectedImeis.length > 0 ? selectedImeis : undefined, // Include IMEI filtering
        },
        {
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `data-export.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleFieldToggle = (field) => {
    setSelectedFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleImeiChange = (event) => {
    const value = event.target.value;
    setSelectedImeis(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Data Export
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Export data using device datetime for accurate time filtering. The 'datetime' field contains the device's timestamp, 
          while 'timestamp' contains the server's reception time.
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Export Format</InputLabel>
              <Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                label="Export Format"
              >
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="xlsx">Excel</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Select IMEIs (Optional)</InputLabel>
              <Select
                multiple
                value={selectedImeis}
                onChange={handleImeiChange}
                input={<OutlinedInput label="Select IMEIs (Optional)" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
                disabled={imeiLoading}
              >
                {imeiLoading ? (
                  <MenuItem disabled>Loading IMEIs...</MenuItem>
                ) : availableImeis.length === 0 ? (
                  <MenuItem disabled>No IMEIs available</MenuItem>
                ) : (
                  availableImeis.map((imei) => (
                    <MenuItem key={imei} value={imei}>
                      {imei}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            {selectedImeis.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Leave empty to export data from all devices
              </Typography>
            )}
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExport}
              fullWidth
            >
              Export Data
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Select Fields to Export
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          {Object.keys(fieldGroups).map((groupName, index) => (
            <Tab key={groupName} label={groupName} />
          ))}
        </Tabs>
        <Grid container spacing={2}>
          {Object.entries(fieldGroups)[activeTab][1].map((field) => (
            <Grid item xs={6} sm={4} md={3} key={field}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedFields[field]}
                    onChange={() => handleFieldToggle(field)}
                  />
                }
                label={field.charAt(0).toUpperCase() + field.slice(1)}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Data Preview</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {Object.entries(selectedFields)
                  .filter(([_, selected]) => selected)
                  .map(([field]) => (
                    <TableCell key={field}>
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </TableCell>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((record, index) => (
                <TableRow key={index}>
                  {Object.entries(selectedFields)
                    .filter(([_, selected]) => selected)
                    .map(([field]) => (
                      <TableCell key={field}>
                        {field === 'timestamp' || field === 'datetime'
                          ? record[field] 
                            ? new Date(record[field]).toLocaleString()
                            : 'N/A'
                          : typeof record[field] === 'object'
                          ? JSON.stringify(record[field])
                          : record[field]}
                      </TableCell>
                    ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default DataExport; 