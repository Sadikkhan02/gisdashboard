export const demoUsers = [
  {
    id: 'analyst-1',
    name: 'Asha Rao',
    email: 'asha@geointel.test',
    password: 'Asha@123',
    role: 'Lead Analyst',
    status: 'online',
  },
  {
    id: 'analyst-2',
    name: 'Vikram Shah',
    email: 'vikram@geointel.test',
    password: 'Vikram@123',
    role: 'Field Coordinator',
    status: 'online',
  },
  {
    id: 'analyst-3',
    name: 'Meera Iyer',
    email: 'meera@geointel.test',
    password: 'Meera@123',
    role: 'Operations Desk',
    status: 'away',
  },
];

export const demoGroups = [
  {
    id: 'group-command',
    name: 'Command Center',
    role: 'Group chat',
    status: 'online',
    type: 'group',
    description: 'Incident leads, analysts, and dispatch working together.',
    members: ['analyst-1', 'analyst-2', 'analyst-3'],
  },
  {
    id: 'group-field',
    name: 'Field Response',
    role: 'Group chat',
    status: 'online',
    type: 'group',
    description: 'Live coordination with mobile field teams.',
    members: ['analyst-1', 'analyst-2', 'analyst-3'],
  },
];

export function publicUser(user) {
  const { password, ...safeUser } = user;
  return { ...safeUser, type: 'user' };
}

export function findDemoUser(email, password) {
  return demoUsers.find(
    (user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password
  );
}
