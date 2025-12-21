import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import useWebSocket from '../hooks/useWebSocket';
import { BASE_URL } from '../services/api';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [devices, setDevices] = useState([]);
  const [records, setRecords] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalDevices: 0,
    activeDevices: 0,
    totalRecords: 0,
    totalAlerts: 0,
    lastUpdate: null
  });
  const { enqueueSnackbar } = useSnackbar();

  // WebSocket connection for real-time updates
  const handleWebSocketMessage = useCallback((message) => {
    try {
      const { topic, data } = message;
      
      switch (topic) {
        case 'device_update':
        case 'device_updated':
          setDevices(prevDevices => {
            const index = prevDevices.findIndex(d => d.imei === data.imei);
            if (index >= 0) {
              const updated = [...prevDevices];
              updated[index] = { ...updated[index], ...data };
              return updated;
            } else {
              return [...prevDevices, data];
            }
          });
          enqueueSnackbar(`Device ${data.imei} updated`, { variant: 'info' });
          break;
          
        case 'new_record':
          setRecords(prevRecords => [data, ...prevRecords.slice(0, 999)]); // Keep last 1000 records
          setStats(prev => ({
            ...prev,
            totalRecords: prev.totalRecords + 1,
            lastUpdate: new Date()
          }));
          break;
          
        case 'new_alert':
          setAlerts(prevAlerts => [data, ...prevAlerts.slice(0, 99)]); // Keep last 100 alerts
          setStats(prev => ({
            ...prev,
            totalAlerts: prev.totalAlerts + 1,
            lastUpdate: new Date()
          }));
          enqueueSnackbar(`New alert: ${data.message}`, { variant: 'warning' });
          break;
          
        case 'system_status':
          setStats(prev => ({
            ...prev,
            ...data,
            lastUpdate: new Date()
          }));
          break;
          
        default:
          console.log('Unknown WebSocket topic:', topic);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }, [enqueueSnackbar]);

  const ws = useWebSocket(`${BASE_URL.replace('http', 'ws')}`, handleWebSocketMessage);

  // Fetch initial data
  const fetchDevices = useCallback(async () => {
    try {
      console.log('🔄 Fetching devices...');
      const startTime = Date.now();
      
      const response = await fetch(`${BASE_URL}/api/devices`, {
        credentials: 'include' // Include cookies in the request
      });
      
      if (response.ok) {
        const devices = await response.json();
        const loadTime = Date.now() - startTime;
        console.log(`✅ Devices loaded in ${loadTime}ms:`, devices.length);
        setDevices(devices);
        return devices;
      } else {
        console.error('Failed to fetch devices:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      return [];
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      console.log('📊 fetchRecords: Starting...');
      const startTime = Date.now();
      // Fetch only recent records with a reasonable limit to prevent timeout
      const response = await fetch(`${BASE_URL}/api/records?range=1h&limit=100`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const loadTime = Date.now() - startTime;
        console.log(`📊 fetchRecords: Loaded ${data.length} records in ${loadTime}ms`);
        setRecords(data);
        return data;
      } else {
        console.error('📊 fetchRecords: Failed:', response.status);
        return [];
      }
    } catch (error) {
      console.error('📊 fetchRecords: Error:', error);
      return [];
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      console.log('🚨 fetchAlerts: Starting...');
      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}/api/alerts`, {
        credentials: 'include' // Include cookies in the request
      });
      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated, skipping alerts fetch');
          setAlerts([]);
          return;
        }
        throw new Error('Failed to fetch alerts');
      }
      const data = await response.json();
      const loadTime = Date.now() - startTime;
      console.log(`🚨 fetchAlerts: Loaded ${data.length} alerts in ${loadTime}ms`);
      setAlerts(data);
    } catch (error) {
      console.error('🚨 fetchAlerts: Error:', error);
      setError('Failed to load alerts');
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      console.log('📈 fetchStats: Starting...');
      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}/api/dashboard/stats`, {
        credentials: 'include' // Include cookies in the request
      });
      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated, skipping stats fetch');
          setStats(prev => ({
            ...prev,
            lastUpdate: new Date()
          }));
          return;
        }
        console.warn('Stats endpoint returned error, using default stats');
        setStats(prev => ({
          ...prev,
          lastUpdate: new Date()
        }));
        return;
      }
      const data = await response.json();
      const loadTime = Date.now() - startTime;
      console.log(`📈 fetchStats: Loaded stats in ${loadTime}ms`);
      setStats({
        ...data,
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('📈 fetchStats: Error:', error);
      setStats(prev => ({
        ...prev,
        lastUpdate: new Date()
      }));
    }
  }, []);

  // Load initial data with optimized loading
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🚀 Starting initial data load...');
        const startTime = Date.now();
        
        // Load devices first (most important for dashboard)
        console.log('📱 Starting device fetch...');
        const devicesPromise = fetchDevices();
        
        // Load other data in parallel with individual logging
        console.log('📊 Starting records fetch...');
        const recordsPromise = fetchRecords().catch(err => {
          console.error('❌ Records fetch failed:', err);
          return [];
        });
        
        console.log('🚨 Starting alerts fetch...');
        const alertsPromise = fetchAlerts().catch(err => {
          console.error('❌ Alerts fetch failed:', err);
          return [];
        });
        
        console.log('📈 Starting stats fetch...');
        const statsPromise = fetchStats().catch(err => {
          console.error('❌ Stats fetch failed:', err);
          return {};
        });
        
        // Wait for all promises with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Data loading timeout')), 10000)
        );
        
        const [devices, records, alerts, stats] = await Promise.race([
          Promise.all([devicesPromise, recordsPromise, alertsPromise, statsPromise]),
          timeoutPromise
        ]);
        
        const totalLoadTime = Date.now() - startTime;
        console.log(`✅ All data loaded in ${totalLoadTime}ms`);
        console.log(`📱 Devices: ${devices?.length || 0}`);
        console.log(`📊 Records: ${records?.length || 0}`);
        console.log(`🚨 Alerts: ${alerts?.length || 0}`);
        console.log(`📈 Stats: ${stats ? 'loaded' : 'failed'}`);
        
        // If devices loaded successfully, we can show the dashboard
        if (devices && devices.length > 0) {
          console.log('📱 Dashboard ready with devices');
        }
        
      } catch (error) {
        console.error('❌ Error loading initial data:', error);
        setError('Failed to load application data');
      } finally {
        console.log('🏁 Setting loading to false');
        setLoading(false);
      }
    };

    loadData();
  }, [fetchDevices, fetchRecords, fetchAlerts, fetchStats]);

  // Refresh data periodically with optimized intervals
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh stats, not all data
      fetchStats();
    }, 30000); // Refresh stats every 30 seconds

    return () => clearInterval(interval);
  }, [fetchStats]);

  // Update stats when data changes
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      totalDevices: devices.length,
      activeDevices: devices.filter(d => d.status === 'active').length,
      totalRecords: records.length,
      totalAlerts: alerts.length,
      lastUpdate: new Date()
    }));
  }, [devices, records, alerts]);

  const value = {
    devices,
    records,
    alerts,
    stats,
    loading,
    error,
    refreshDevices: fetchDevices,
    refreshRecords: fetchRecords,
    refreshAlerts: fetchAlerts,
    refreshStats: fetchStats,
    ws
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}; 