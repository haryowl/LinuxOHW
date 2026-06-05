function getApiBaseUrl() {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }

  const currentUrl = window.location.href;

  if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
    return 'http://localhost:3001';
  }

  const url = new URL(currentUrl);
  if (url.port === '3000' || !url.port) {
    const protocol = url.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${url.hostname}:3001`;
  }

  const protocol = url.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${url.host}`;
}

export const BASE_URL = getApiBaseUrl();

export function getWebSocketUrl() {
  const base = new URL(BASE_URL);
  const wsProtocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = base.port === '3000' ? `${base.hostname}:3001` : base.host;
  return `${wsProtocol}//${host}/ws`;
}
