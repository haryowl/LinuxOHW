// frontend/src/pages/BroadcastCommand.js

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {
  apiCreateBroadcastCommand,
  apiCancelBroadcastJob,
  apiFetchBroadcastJobDetail,
  apiFetchBroadcastJobs,
  apiFetchCommandList,
  apiFetchDeviceGroups,
  apiFetchDevicesRaw
} from '../services/api';
import DeviceSearchSelect from '../components/DeviceSearchSelect';
import { useWebSocketMessage } from '../hooks/useWebSocket';

const TARGET_TYPES = [
  { value: 'all', label: 'All accessible devices' },
  { value: 'group', label: 'Device group' },
  { value: 'devices', label: 'Selected devices' }
];

function statusColor(status) {
  switch (status) {
    case 'replied':
      return 'success';
    case 'sent':
      return 'info';
    case 'queued':
      return 'warning';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

function statusLabel(item) {
  if (item.status === 'queued' && item.isConnected === false) {
    return 'waiting';
  }
  return item.status || 'queued';
}

const BroadcastCommand = () => {
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [commandList, setCommandList] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [jobDetail, setJobDetail] = useState(null);

  const [targetType, setTargetType] = useState('all');
  const [groupId, setGroupId] = useState('');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [commandText, setCommandText] = useState('');
  const [commandNumber, setCommandNumber] = useState('');
  const [payloadHex, setPayloadHex] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedJobSummary = useMemo(
    () => jobs.find((job) => job.broadcastId === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const loadDevices = useCallback(async () => {
    try {
      const list = await apiFetchDevicesRaw();
      setDevices(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Failed to load devices');
    }
  }, []);

  const loadGroups = useCallback(async () => {
    const result = await apiFetchDeviceGroups();
    setGroups(result.success ? result.data : []);
  }, []);

  const loadCommandList = useCallback(async () => {
    try {
      const response = await apiFetchCommandList();
      const data = await response.json();
      if (response.ok) {
        setCommandList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setCommandList([]);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const response = await apiFetchBroadcastJobs();
      const data = await response.json();
      if (response.ok) {
        setJobs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setJobs([]);
    }
  }, []);

  const loadJobDetail = useCallback(async (broadcastId) => {
    if (!broadcastId) {
      setJobDetail(null);
      return;
    }
    try {
      const response = await apiFetchBroadcastJobDetail(broadcastId);
      const data = await response.json();
      if (response.ok) {
        setJobDetail(data);
      }
    } catch (err) {
      setJobDetail(null);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    loadGroups();
    loadCommandList();
    loadJobs();
  }, [loadDevices, loadGroups, loadCommandList, loadJobs]);

  useEffect(() => {
    loadJobDetail(selectedJobId);
  }, [selectedJobId, loadJobDetail]);

  useEffect(() => {
    if (!selectedJobId) return undefined;
    const timer = setInterval(() => {
      loadJobDetail(selectedJobId);
      loadJobs();
    }, 5000);
    return () => clearInterval(timer);
  }, [selectedJobId, loadJobDetail, loadJobs]);

  const handleWebSocketMessage = useCallback((message) => {
    if (message.topic !== 'command_reply' || !selectedJobId) return;
    loadJobDetail(selectedJobId);
    loadJobs();
  }, [selectedJobId, loadJobDetail, loadJobs]);

  useWebSocketMessage(handleWebSocketMessage);

  const handleSendBroadcast = async () => {
    if (!commandText && !payloadHex) {
      setError('Command text or payload hex is required');
      return;
    }
    if (targetType === 'group' && !groupId) {
      setError('Please select a device group');
      return;
    }
    if (targetType === 'devices' && selectedDeviceIds.length === 0) {
      setError('Please select at least one device');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        targetType,
        groupId: targetType === 'group' ? groupId : undefined,
        deviceIds: targetType === 'devices' ? selectedDeviceIds : undefined,
        ...(payloadHex
          ? { payloadHex: payloadHex.trim() }
          : {
              commandText: commandText.trim(),
              commandNumber: commandNumber ? Number(commandNumber) : undefined
            })
      };

      const response = await apiCreateBroadcastCommand(payload);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create broadcast command');
      }

      setSuccess(`Broadcast queued for ${data.totalDevices} device(s)`);
      setSelectedJobId(data.broadcastId);
      setCommandText('');
      setCommandNumber('');
      setPayloadHex('');
      await loadJobs();
      await loadJobDetail(data.broadcastId);
    } catch (err) {
      setError(err.message || 'Failed to create broadcast command');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBroadcast = async () => {
    if (!selectedJobId) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiCancelBroadcastJob(selectedJobId);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel broadcast');
      }
      setSuccess(`Cancelled ${data.cancelled || 0} queued command(s)`);
      await loadJobs();
      await loadJobDetail(selectedJobId);
    } catch (err) {
      setError(err.message || 'Failed to cancel broadcast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>Broadcast Command</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Send one command to many devices. Offline devices stay queued until they connect.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>New Broadcast</Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Target</InputLabel>
              <Select
                label="Target"
                value={targetType}
                onChange={(event) => setTargetType(event.target.value)}
              >
                {TARGET_TYPES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {targetType === 'group' && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Device Group</InputLabel>
                <Select
                  label="Device Group"
                  value={groupId}
                  onChange={(event) => setGroupId(event.target.value)}
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {targetType === 'devices' && (
              <DeviceSearchSelect
                multiple
                valueKey="id"
                label="Devices"
                devices={devices}
                value={selectedDeviceIds}
                onChange={setSelectedDeviceIds}
                sx={{ mb: 2 }}
              />
            )}

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Preset Command</InputLabel>
              <Select
                label="Preset Command"
                value=""
                onChange={(event) => setCommandText(event.target.value)}
              >
                {commandList.map((command) => (
                  <MenuItem key={command.name} value={command.name}>{command.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Command Text"
              value={commandText}
              onChange={(event) => setCommandText(event.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />

            <TextField
              label="Command Number (optional)"
              value={commandNumber}
              onChange={(event) => setCommandNumber(event.target.value)}
              type="number"
              fullWidth
              sx={{ mb: 2 }}
            />

            <TextField
              label="Raw Payload Hex (optional)"
              value={payloadHex}
              onChange={(event) => setPayloadHex(event.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              helperText="If provided, payload hex overrides command text"
            />

            <Button variant="contained" onClick={handleSendBroadcast} disabled={loading} fullWidth>
              {loading ? 'Queueing...' : 'Queue Broadcast'}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Broadcast Jobs</Typography>
              <Button size="small" onClick={loadJobs}>Refresh</Button>
            </Box>
            {jobs.length === 0 && (
              <Typography color="text.secondary">No broadcast jobs yet.</Typography>
            )}
            {jobs.length > 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Command</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Devices</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow
                      key={job.broadcastId}
                      hover
                      selected={selectedJobId === job.broadcastId}
                      onClick={() => setSelectedJobId(job.broadcastId)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{job.commandText || 'Hex payload'}</TableCell>
                      <TableCell>
                        {job.createdAt ? new Date(job.createdAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>{job.totalDevices}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {job.waitingForConnection > 0 && (
                            <Chip size="small" color="warning" label={`${job.waitingForConnection} waiting`} />
                          )}
                          {job.queued > 0 && (
                            <Chip size="small" color="warning" label={`${job.queued} queued`} />
                          )}
                          {job.sent > 0 && (
                            <Chip size="small" color="info" label={`${job.sent} sent`} />
                          )}
                          {job.replied > 0 && (
                            <Chip size="small" color="success" label={`${job.replied} replied`} />
                          )}
                          {job.failed > 0 && (
                            <Chip size="small" color="error" label={`${job.failed} failed`} />
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Queue Detail</Typography>
              {selectedJobId && (selectedJobSummary?.queued > 0) && (
                <Button size="small" color="warning" onClick={handleCancelBroadcast} disabled={loading}>
                  Cancel Queued
                </Button>
              )}
            </Box>

            {!selectedJobId && (
              <Typography color="text.secondary">Select a broadcast job to view per-device status.</Typography>
            )}

            {selectedJobId && jobDetail && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {jobDetail.commandText || 'Hex payload'}
                  {jobDetail.commandNumber ? ` (#${jobDetail.commandNumber})` : ''}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Device</TableCell>
                        <TableCell>IMEI</TableCell>
                        <TableCell>Connection</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Reply</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {jobDetail.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.deviceName}</TableCell>
                          <TableCell>{item.imei}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={item.isConnected ? 'online' : 'offline'}
                              color={item.isConnected ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={statusLabel(item)}
                              color={statusColor(item.status)}
                            />
                          </TableCell>
                          <TableCell>
                            {item.replyText || item.errorMessage || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default BroadcastCommand;
