export async function fetchKPI(region, dateRange) {
  const params = new URLSearchParams({
    region,
    range: dateRange,
  });

  const response = await fetch(`/api/kpi?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch KPI data.');
  }

  const payload = await response.json();
  return payload.data;
}

export async function fetchViewportAnalytics({ viewport, region, dateRange }) {
  if (!viewport) {
    throw new Error('Viewport bounds are required.');
  }

  const params = new URLSearchParams({
    north: String(viewport.north),
    south: String(viewport.south),
    east: String(viewport.east),
    west: String(viewport.west),
    region,
    range: dateRange,
  });

  const response = await fetch(`/api/analytics?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch viewport analytics.');
  }

  const payload = await response.json();
  return payload.data;
}

export async function loginWithDemoCredentials({ email, password }) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || 'Login failed.');
  }

  return payload.data;
}

export async function fetchChatDirectory() {
  const response = await fetch('/api/users');

  if (!response.ok) {
    throw new Error('Failed to fetch chat directory.');
  }

  const payload = await response.json();
  return payload.data;
}

export async function fetchChatUsers() {
  const directory = await fetchChatDirectory();
  return directory.users || [];
}

export async function fetchMessages({ userId, peerId }) {
  const params = new URLSearchParams({ userId, peerId });
  const response = await fetch(`/api/messages?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch messages.');
  }

  const payload = await response.json();
  return payload.data;
}

export async function createMessage(payload) {
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create message.');
  }

  const result = await response.json();
  return result.data;
}
