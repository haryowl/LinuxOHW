'use strict';

function useSecureCookies() {
  if (process.env.COOKIE_SECURE === 'true') {
    return true;
  }
  if (process.env.COOKIE_SECURE === 'false') {
    return false;
  }
  return process.env.NODE_ENV === 'production';
}

function getSessionCookieOptions() {
  const secure = useSecureCookies();
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    domain: undefined
  };
}

/** Options for res.clearCookie — omit maxAge (deprecated in Express 5). */
function getClearSessionCookieOptions() {
  const { maxAge, ...options } = getSessionCookieOptions();
  return options;
}

module.exports = {
  getSessionCookieOptions,
  getClearSessionCookieOptions,
  useSecureCookies
};
