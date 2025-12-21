// frontend/src/contexts/AuthContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Dynamic API URL detection - works for both localhost and IP access
function getApiBaseUrl() {
  // Get the current frontend URL
  const currentUrl = window.location.href;
  
  // If accessing from localhost, use localhost backend
  if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
    return 'http://localhost:3001';
  }
  
  // If accessing from IP address, use the same IP for backend
  const url = new URL(currentUrl);
  return `http://${url.hostname}:3001`;
}

const API_BASE_URL = getApiBaseUrl();

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/auth/check`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
        if (response.status === 401) {
          console.log('User not authenticated');
        } else {
          console.error('Auth check failed with status:', response.status);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setError('Network error during authentication check');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Login failed with status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const userData = await response.json();
      setUser(userData);
      setError(null);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, { 
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setError(null);
      navigate('/login');
    }
  };

  // Check if user has access to a specific menu
  const hasMenuAccess = (menuName) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    const { permissions } = user;
    if (!permissions) return false;
    
    // Handle different permission structures
    if (permissions.menus) {
      // New structure: permissions.menus[menuName].access
      if (typeof permissions.menus === 'object' && permissions.menus[menuName]) {
        return permissions.menus[menuName].access === true;
      }
      // Old structure: permissions.menus array
      if (Array.isArray(permissions.menus)) {
        return permissions.menus.includes(menuName.toLowerCase());
      }
    }
    
    // Fallback: check if menu name is in permissions array (legacy)
    if (Array.isArray(permissions)) {
      return permissions.includes(menuName.toLowerCase());
    }
    
    return false;
  };

  // Check if user has access to a specific device
  const hasDeviceAccess = (deviceId) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    const { permissions } = user;
    if (!permissions) return false;
    
    // Check direct device access
    if (permissions.devices && permissions.devices.includes(deviceId)) {
      return true;
    }
    
    // Check device group access
    if (permissions.deviceGroups && permissions.deviceGroups.length > 0) {
      // This will be checked against actual device groups in the backend
      return true; // For now, return true if user has any device group access
    }
    
    return false;
  };

  // Check if user has access to a specific device group
  const hasDeviceGroupAccess = (groupId) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    const { permissions } = user;
    if (!permissions || !permissions.deviceGroups) return false;
    
    return permissions.deviceGroups.includes(groupId);
  };

  // Get user's accessible devices (for filtering data)
  const getAccessibleDevices = () => {
    if (!user) return [];
    if (user.role === 'admin') return null; // null means all devices
    
    const { permissions } = user;
    if (!permissions) return [];
    
    return permissions.devices || [];
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error,
      login, 
      logout,
      hasMenuAccess,
      hasDeviceAccess,
      hasDeviceGroupAccess,
      getAccessibleDevices
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
