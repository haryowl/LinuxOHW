'use strict';

/** Default HTTP/API port (was 3001). Override with HTTP_PORT. */
const HTTP_PORT = parseInt(process.env.HTTP_PORT, 10) || 8081;

/** Default frontend dev/static port (was 3000). Override with FRONTEND_PORT. */
const FRONTEND_PORT = parseInt(process.env.FRONTEND_PORT, 10) || 8080;

module.exports = {
  HTTP_PORT,
  FRONTEND_PORT
};
