const Activity = require('../models/Activity');
const Board = require('../models/Board');
const Workspace = require('../models/Workspace');


// 1. Get activity history for a board (Workspace owner only)
// GET /api/activities/board/:boardId
const getBoardActivities = async (req, res, next) => {
  try {
    const { boardId } = req.params;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    const workspace = await Workspace.findById(board.workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    // Strictly Owner Only check
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Activity history is visible to workspace owners only',
      });
    }

    const activities = await Activity.find({ boardId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBoardActivities,
};

