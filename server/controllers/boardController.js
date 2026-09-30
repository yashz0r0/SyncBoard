const Board = require('../models/Board');
const List = require('../models/List');
const { isWorkspaceMember } = require('../middleware/authorize');

// 1. Create a new board (Must be workspace member)
// Automatically initializes the 4 default lists: TODO, IN PROGRESS, REVIEW, DONE
// POST /api/boards
const createBoard = async (req, res, next) => {
  try {
    const { name, workspaceId } = req.body;

    if (!name || !workspaceId) {
      return res.status(400).json({ success: false, message: 'Board name and workspaceId are required' });
    }

    const hasAccess = await isWorkspaceMember(workspaceId, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    const board = new Board({
      name,
      workspaceId,
      createdBy: req.user._id,
    });

    await board.save();

    // Automatically create default Kanban lists
    const defaultLists = ['TODO', 'IN PROGRESS', 'REVIEW', 'DONE'];
    for (let i = 0; i < defaultLists.length; i++) {
      const list = new List({
        name: defaultLists[i],
        boardId: board._id,
        position: i,
      });
      await list.save();
    }

    res.status(201).json({
      success: true,
      data: board,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get all boards in a workspace
// GET /api/boards/workspace/:workspaceId
const getBoardsByWorkspace = async (req, res, next) => {
  try {
    const hasAccess = await isWorkspaceMember(req.params.workspaceId, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    const boards = await Board.find({ workspaceId: req.params.workspaceId });

    res.status(200).json({
      success: true,
      data: boards,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get single board by ID
// GET /api/boards/:id
const getBoardById = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id).populate('workspaceId', 'name owner');

    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    const wsId = board.workspaceId?._id || board.workspaceId;
    const hasAccess = await isWorkspaceMember(wsId, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update board
// PATCH /api/boards/:id
const updateBoard = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    const hasAccess = await isWorkspaceMember(board.workspaceId, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    if (req.body.name) {
      board.name = req.body.name;
    }

    await board.save();

    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Delete board
// DELETE /api/boards/:id
const deleteBoard = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    const hasAccess = await isWorkspaceMember(board.workspaceId, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    await board.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Board deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBoard,
  getBoardsByWorkspace,
  getBoardById,
  updateBoard,
  deleteBoard,
};
