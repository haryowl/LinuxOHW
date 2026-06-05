const FRONTEND_PORT = process.env.REACT_APP_FRONTEND_PORT || '8080';
const BACKEND_PORT = process.env.REACT_APP_BACKEND_PORT || '8081';

function getApiBaseUrl() {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }

  const currentUrl = window.location.href;

  if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
    return `http://localhost:${BACKEND_PORT}`;
  }

  const url = new URL(currentUrl);
  if (url.port === FRONTEND_PORT || !url.port) {
    const protocol = url.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${url.hostname}:${BACKEND_PORT}`;
  }

  const protocol = url.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${url.host}`;
}

export const BASE_URL = getApiBaseUrl();

export function getWebSocketUrl() {
  const base = new URL(BASE_URL);
  const wsProtocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = base.port === FRONTEND_PORT ? `${base.hostname}:${BACKEND_PORT}` : base.host;
  return `${wsProtocol}//${host}/ws`;
}
