import { createApiResponse } from '@/utils/apiResponse';
import { demoGroups, demoUsers, publicUser } from '@/lib/demoUsers';
import Group from '@/models/Group';
import { dbConnect } from '@/lib/mongodb';

function decorateGroup(group, users) {
  const memberDetails = (group.members || [])
    .map((memberId) => users.find((user) => user.id === memberId))
    .filter(Boolean);

  return {
    ...group,
    description: group.description || `${memberDetails.length} members`,
    memberDetails,
  };
}

export async function GET() {
  const users = demoUsers.map(publicUser);
  let persistedGroups = [];

  try {
    await dbConnect();
    const groups = await Group.find({}).sort({ createdAt: -1 }).lean();

    persistedGroups = groups.map((group) => ({
      id: group.groupId,
      name: group.name,
      role: 'Group chat',
      status: 'online',
      type: 'group',
      description: group.description || `${group.members.length} members`,
      members: group.members,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
    }));
  } catch {
    persistedGroups = [];
  }

  const groupsById = new Map();
  [...persistedGroups, ...demoGroups].forEach((group) => {
    groupsById.set(group.id, decorateGroup(group, users));
  });

  return Response.json(
    createApiResponse(
      {
        users,
        groups: Array.from(groupsById.values()),
      },
      'Chat directory loaded successfully.'
    )
  );
}
