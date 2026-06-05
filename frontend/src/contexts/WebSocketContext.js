import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useAuth } from './AuthContext';
import { getWebSocketUrl } from '../config/apiUrl';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { user } = useAuth();
  const wsRef = useRef(null);
  const handlersRef = useRef(new Set());
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  const notifyHandlers = useCallback((message) => {
    handlersRef.current.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('WebSocket handler error:', error);
      }
    });
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    isConnectingRef.current = false;
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!user || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;
    const wsUrl = getWebSocketUrl();

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.topic) {
            notifyHandlers(message);
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      socket.onerror = () => {
        isConnectingRef.current = false;
        setIsConnected(false);
      };

      socket.onclose = (event) => {
        isConnectingRef.current = false;
        setIsConnected(false);

        if (event.code === 4401) {
          return;
        }

        if (event.code !== 1000 && reconnectAttemptsRef.current < 10 && user) {
          const delay = Math.min(10000, 1000 * Math.pow(2, reconnectAttemptsRef.current));
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      isConnectingRef.current = false;
      setIsConnected(false);
    }
  }, [user, notifyHandlers]);

  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [user, connect, disconnect]);

  const subscribe = useCallback((handler) => {
    handlersRef.current.add(handler);
    return () => handlersRef.current.delete(handler);
  }, []);

  const send = useCallback((data) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    socket.send(typeof data === 'string' ? data : JSON.stringify(data));
    return true;
  }, []);

  const value = useMemo(() => ({
    isConnected,
    subscribe,
    send,
    getSocket: () => wsRef.current
  }), [isConnected, subscribe, send]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}

export function useWebSocketMessage(onMessage) {
  const { subscribe } = useWebSocketContext();
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (!onMessage) {
      return undefined;
    }
    return subscribe((message) => handlerRef.current?.(message));
  }, [subscribe, onMessage]);
}

export function useWebSocketConnection() {
  const { isConnected, send, getSocket } = useWebSocketContext();
  return { isConnected, send, getSocket };
}
