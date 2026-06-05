// Shared WebSocket connection via WebSocketProvider
import { useWebSocketMessage, useWebSocketConnection } from '../contexts/WebSocketContext';

const useWebSocket = (_url, onMessage) => {
  useWebSocketMessage(onMessage);
  const { getSocket } = useWebSocketConnection();
  return getSocket();
};

export default useWebSocket;
export { useWebSocketMessage, useWebSocketConnection } from '../contexts/WebSocketContext';
