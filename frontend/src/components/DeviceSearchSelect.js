import React, { useEffect, useMemo, useState } from 'react';
import { Autocomplete, TextField, Chip, Box, Typography } from '@mui/material';
import { fetchDevices } from '../services/api';

function getDeviceKey(device, valueKey) {
  if (!device) return '';
  return String(device[valueKey] ?? '');
}

function getDeviceLabel(device) {
  if (!device) return '';
  const name = (device.name || '').trim();
  const imei = device.imei || '';
  if (name && imei && name !== imei) {
    return `${name} (${imei})`;
  }
  return name || imei || String(device.id || '');
}

function filterDevices(options, { inputValue }) {
  const query = (inputValue || '').trim().toLowerCase();
  if (!query) return options;
  return options.filter((device) => {
    const name = String(device.name || '').toLowerCase();
    const imei = String(device.imei || '').toLowerCase();
    const id = String(device.id || '').toLowerCase();
    return name.includes(query) || imei.includes(query) || id.includes(query);
  });
}

/**
 * Searchable device picker (by name or IMEI).
 *
 * value / onChange use primitive keys (imei or id arrays / string) to match existing page contracts.
 */
export default function DeviceSearchSelect({
  devices: devicesProp,
  value,
  onChange,
  multiple = false,
  valueKey = 'imei',
  label = 'Devices',
  placeholder = 'Search by name or IMEI…',
  disabled = false,
  fullWidth = true,
  loading: loadingProp = false,
  helperText,
  sx,
  size = 'medium'
}) {
  const [loadedDevices, setLoadedDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  useEffect(() => {
    if (devicesProp) return undefined;
    let cancelled = false;
    (async () => {
      setLoadingDevices(true);
      try {
        const response = await fetchDevices();
        const data = await response.json();
        if (!cancelled) {
          setLoadedDevices(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadedDevices([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingDevices(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [devicesProp]);

  const devices = useMemo(() => {
    const list = Array.isArray(devicesProp) ? devicesProp : loadedDevices;
    return list.filter((device) => getDeviceKey(device, valueKey));
  }, [devicesProp, loadedDevices, valueKey]);

  const deviceByKey = useMemo(() => {
    const map = new Map();
    devices.forEach((device) => {
      map.set(getDeviceKey(device, valueKey), device);
    });
    return map;
  }, [devices, valueKey]);

  const selectedValue = useMemo(() => {
    if (multiple) {
      const keys = Array.isArray(value) ? value.map(String) : [];
      return keys.map((key) => deviceByKey.get(key)).filter(Boolean);
    }
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return deviceByKey.get(String(value)) || null;
  }, [multiple, value, deviceByKey]);

  const handleChange = (_event, next) => {
    if (!onChange) return;
    if (multiple) {
      const keys = (Array.isArray(next) ? next : [])
        .map((device) => getDeviceKey(device, valueKey))
        .filter(Boolean);
      onChange(keys);
      return;
    }
    onChange(next ? getDeviceKey(next, valueKey) : '');
  };

  const loading = Boolean(loadingProp || (!devicesProp && loadingDevices));

  return (
    <Autocomplete
      multiple={multiple}
      options={devices}
      value={selectedValue}
      onChange={handleChange}
      disabled={disabled}
      loading={loading}
      fullWidth={fullWidth}
      size={size}
      sx={sx}
      filterOptions={filterDevices}
      getOptionLabel={getDeviceLabel}
      isOptionEqualToValue={(option, selected) =>
        getDeviceKey(option, valueKey) === getDeviceKey(selected, valueKey)
      }
      renderOption={(props, option) => (
        <li {...props} key={getDeviceKey(option, valueKey)}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2">{option.name || option.imei || option.id}</Typography>
            {option.name && option.imei ? (
              <Typography variant="caption" color="text.secondary">{option.imei}</Typography>
            ) : null}
          </Box>
        </li>
      )}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const tagProps = getTagProps({ index });
          return (
            <Chip
              {...tagProps}
              key={getDeviceKey(option, valueKey)}
              size="small"
              label={option.name || option.imei || getDeviceKey(option, valueKey)}
            />
          );
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
        />
      )}
    />
  );
}
