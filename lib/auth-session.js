'use client';

const USER_SESSION_KEY = 'geo-dashboard-user';

export function saveCurrentUser(user) {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(user);
  window.sessionStorage.setItem(USER_SESSION_KEY, serialized);
  window.localStorage.setItem(USER_SESSION_KEY, serialized);
}

export function readCurrentUser() {
  if (typeof window === 'undefined') return null;

  const sessionValue = window.sessionStorage.getItem(USER_SESSION_KEY);
  if (sessionValue) {
    try {
      return JSON.parse(sessionValue);
    } catch {
      window.sessionStorage.removeItem(USER_SESSION_KEY);
    }
  }

  const localValue = window.localStorage.getItem(USER_SESSION_KEY);
  if (!localValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(localValue);
    window.sessionStorage.setItem(USER_SESSION_KEY, localValue);
    return parsed;
  } catch {
    window.localStorage.removeItem(USER_SESSION_KEY);
    return null;
  }
}

export function clearCurrentUser() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(USER_SESSION_KEY);
  window.localStorage.removeItem(USER_SESSION_KEY);
}
