const List = require('../models/List');
const Board = require('../models/Board');
const { isWorkspaceMember } = require('../middleware/authorize');

// 1. Create a new list
// POST /api/lists
const createList = async (req, res, next) => {
  try {
    const { name, boardId, position } = req.body;

    if (!name || !boardId) {
      return res.status(400).json({ success: false, message: 'List name and boardId are required' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    const hasAccess = await isWorkspaceMember(board.workspaceId, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    let listPosition = position;
    if (listPosition === undefined) {
      const count = await List.countDocuments({ boardId });
      listPosition = count;
    }

    const list = new List({
      name,
      boardId,
      position: listPosition,
    });

    await list.save();

    // Broadcast real-time event to board room
    req.io?.to(`board:${boardId}`).emit('list:created', list);

    res.status(201).json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get all lists for a board
// Auto-populates default lists if board currently has none
// GET /api/lists/board/:boardId
const getListsByBoard = async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.params.id;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    const hasAccess = await isWorkspaceMember(board.workspaceId, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    let lists = await List.find({ boardId }).sort({ position: 1 });

    // If board has no lists yet, initialize default lists in MongoDB
    if (lists.length === 0) {
      const defaultLists = ['TODO', 'IN PROGRESS', 'REVIEW', 'DONE'];
      for (let i = 0; i < defaultLists.length; i++) {
        const defaultList = new List({
          name: defaultLists[i],
          boardId: board._id,
          position: i,
        });
        await defaultList.save();
        lists.push(defaultList);
      }
    }

    res.status(200).json({
      success: true,
      data: lists,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Update list name or position
// PATCH /api/lists/:id
const updateList = async (req, res, next) => {
  try {
    const list = await List.findById(req.params.id);

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }

    const board = await Board.findById(list.boardId);
    const hasAccess = board && (await isWorkspaceMember(board.workspaceId, req.user._id));
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    if (req.body.name) list.name = req.body.name;
    if (req.body.position !== undefined) list.position = req.body.position;

    await list.save();

    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Delete list
// DELETE /api/lists/:id
const deleteList = async (req, res, next) => {
  try {
    const list = await List.findById(req.params.id);

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }

    const board = await Board.findById(list.boardId);
    const hasAccess = board && (await isWorkspaceMember(board.workspaceId, req.user._id));
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    const boardId = list.boardId;
    await list.deleteOne();

    // Broadcast real-time event to board room
    req.io?.to(`board:${boardId}`).emit('list:deleted', list._id);

    res.status(200).json({
      success: true,
      message: 'List deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createList,
  getListsByBoard,
  updateList,
  deleteList,
};
