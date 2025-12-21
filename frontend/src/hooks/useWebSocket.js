// frontend/src/hooks/useWebSocket.js

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const useWebSocket = (url, onMessage) => {
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const isConnecting = useRef(false);
  const { user } = useAuth();

  const connect = useCallback(() => {
    if (isConnecting.current) return;
    
    // Don't connect if not authenticated
    if (!user) {
      console.log('User not authenticated, skipping WebSocket connection');
      return;
    }
    
    isConnecting.current = true;
    
    try {
      // Dynamic WebSocket URL detection - works for both localhost and IP access
      const currentUrl = window.location.href;
      let wsUrl;
      
      if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
        wsUrl = 'ws://localhost:3001/ws';
      } else {
        const url = new URL(currentUrl);
        wsUrl = `ws://${url.hostname}:3001/ws`;
      }
      
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }

      console.log('Attempting WebSocket connection to:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected to:', wsUrl);
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
        isConnecting.current = false;
        
        // Send a test message to verify connection
        setTimeout(() => {
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            console.log('Sending test message...');
            ws.current.send(JSON.stringify({ 
              type: 'ping', 
              timestamp: Date.now(),
              topic: 'ping'
            }));
          }
        }, 1000);
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
          const delay = 3000; // Increased delay to 3 seconds
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
  }, [onMessage, user]);

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
