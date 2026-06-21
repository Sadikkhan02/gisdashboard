'use client';

const CALL_INTENT_KEY = 'geo-dashboard-call-intent';
const CALL_WINDOW_NAME = 'geo-dashboard-call';

export function saveCallIntent(intent) {
  if (typeof window === 'undefined') return;
  const payload = {
    ...intent,
    intentId: intent.intentId || `intent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };

  window.localStorage.setItem(CALL_INTENT_KEY, JSON.stringify(payload));
  return payload;
}

export function readCallIntent(intentId) {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(CALL_INTENT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (intentId && parsed.intentId !== intentId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCallIntent() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CALL_INTENT_KEY);
}

export function openCallTab(intentId) {
  if (typeof window === 'undefined') return null;

  const suffix = intentId ? `?intent=${encodeURIComponent(intentId)}` : '';
  const callWindow = window.open(`/call${suffix}`, CALL_WINDOW_NAME);
  callWindow?.focus();
  return callWindow;
}

export function launchOutgoingCallTab({ currentUserId, currentUserName, activeChatUser }) {
  const payload = saveCallIntent({
    action: 'start',
    currentUserId,
    currentUserName,
    activeChatUser,
  });

  return openCallTab(payload?.intentId);
}

export function launchIncomingCallTab({ currentUserId, currentUserName, call }) {
  const payload = saveCallIntent({
    action: 'accept',
    currentUserId,
    currentUserName,
    call,
  });

  return openCallTab(payload?.intentId);
}
