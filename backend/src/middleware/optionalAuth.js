'use strict';

const sessionStore = require('../utils/sessionStore');
const logger = require('../utils/logger');

async function optionalAuth(req, res, next) {
  const token = req.cookies?.sessionToken;
  if (!token) {
    return next();
  }

  try {
    const session = await sessionStore.get(token);
    if (session) {
      req.user = session;
    }
  } catch (error) {
    logger.debug('optionalAuth session lookup failed', { error: error.message });
  }

  return next();
}

module.exports = { optionalAuth };
