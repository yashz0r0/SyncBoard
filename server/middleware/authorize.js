const Workspace = require('../models/Workspace');

/**
 * Simple helper to check if a user is a member of the given workspace.
 * Returns true if the user is in workspace.members, false otherwise.
 */
const isWorkspaceMember = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return false;
  }
  return workspace.members.some((m) => m.toString() === userId.toString());
};

module.exports = { isWorkspaceMember };
