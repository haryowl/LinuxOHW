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

module.exports = {
  getSessionCookieOptions,
  useSecureCookies
};
