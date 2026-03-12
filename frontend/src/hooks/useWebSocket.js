// frontend/src/hooks/useWebSocket.js

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const useWebSocket = (url, onMessage) => {
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const isConnecting = useRef(false);
  const { user } = useAuth();

  const resolveWebSocketUrl = useCallback(() => {
    try {
      if (url) {
        const base = new URL(url);
        const isSecure = base.protocol === 'https:' || base.protocol === 'wss:';
        const wsProtocol = isSecure ? 'wss:' : 'ws:';
        const host = base.port === '3000'
          ? `${base.hostname}:3001`
          : base.host;
        const path = base.pathname && base.pathname !== '/' ? base.pathname : '/ws';
        return `${wsProtocol}//${host}${path}`;
      }

      const currentUrl = new URL(window.location.href);
      const wsProtocol = currentUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = currentUrl.port === '3000'
        ? `${currentUrl.hostname}:3001`
        : currentUrl.host;
      return `${wsProtocol}//${host}/ws`;
    } catch (error) {
      console.error('Failed to resolve WebSocket URL:', error);
      return 'ws://localhost:3001/ws';
    }
  }, [url]);

  const connect = useCallback(() => {
    if (isConnecting.current) return;
    
    // Don't connect if not authenticated
    if (!user) {
      console.log('User not authenticated, skipping WebSocket connection');
      return;
    }
    
    isConnecting.current = true;
    
    try {
      const wsUrl = resolveWebSocketUrl();
      
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }

      console.log('Attempting WebSocket connection to:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected to:', wsUrl);
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
        isConnecting.current = false;
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.topic) {
            onMessage(message);
          } else {
            console.log('WebSocket message without topic:', message);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnecting.current = false;
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        isConnecting.current = false;
        
        // Clear any existing reconnect timeout
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }

        // Only attempt to reconnect if it wasn't a manual close and we haven't exceeded max attempts
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(10000, 1000 * Math.pow(2, reconnectAttempts.current));
          console.log(`Attempting to reconnect WebSocket in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})...`);

          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      isConnecting.current = false;
    }
  }, [onMessage, user, resolveWebSocketUrl]);

  useEffect(() => {
    connect();

    return () => {
      // Clear reconnect timeout
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      
      // Close WebSocket connection
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  return ws.current;
};

export default useWebSocket;
