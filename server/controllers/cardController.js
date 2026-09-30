const Card = require('../models/Card');
const Board = require('../models/Board');
const List = require('../models/List');
const Activity = require('../models/Activity');
const { isWorkspaceMember } = require('../middleware/authorize');

// 1. Create a new card
// POST /api/cards
const createCard = async (req, res, next) => {
  try {
    const { title, description, listId, boardId, assignedTo, priority, position } = req.body;

    if (!title || !listId || !boardId) {
      return res.status(400).json({ success: false, message: 'Title, listId, and boardId are required' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    const hasAccess = await isWorkspaceMember(board.workspaceId, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    let cardPosition = position;
    if (cardPosition === undefined) {
      const count = await Card.countDocuments({ listId });
      cardPosition = count;
    }

    const card = new Card({
      title,
      description: description || '',
      listId,
      boardId,
      assignedTo: assignedTo || null,
      priority: priority || 'MEDIUM',
      position: cardPosition,
    });

    await card.save();

    const targetList = await List.findById(listId);
    const activity = new Activity({
      workspaceId: board.workspaceId,
      boardId,
      user: req.user._id,
      action: 'CREATED_CARD',
      details: `Added card "${card.title}" to ${targetList ? `"${targetList.name}"` : 'list'}`,
    });
    await activity.save();

    req.io?.to(`board:${boardId}`).emit('card:created', card);
    req.io?.to(`board:${boardId}`).emit('activity:created', activity);

    res.status(201).json({
      success: true,
      data: card,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get all cards for a board
// GET /api/cards/:boardId
const getCardsByBoard = async (req, res, next) => {
  try {
    const boardId = req.params.boardId;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    const hasAccess = await isWorkspaceMember(board.workspaceId, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    const { priority, search, page = 1, limit = 100 } = req.query;

    const filter = { boardId };

    if (priority) {
      filter.priority = priority.toUpperCase();
    }

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Card.countDocuments(filter);
    const cards = await Card.find(filter)
      .sort({ position: 1 })
      .skip(skip)
      .limit(limitNum)
      .populate('assignedTo', 'name email');

    res.status(200).json({
      success: true,
      count: cards.length,
      total,
      page: pageNum,
      data: cards,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get single card by ID
// GET /api/cards/single/:id
const getCardById = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.id).populate('assignedTo', 'name email');

    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const board = await Board.findById(card.boardId);
    const hasAccess = board && (await isWorkspaceMember(board.workspaceId, req.user._id));
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    res.status(200).json({
      success: true,
      data: card,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update card details
// PATCH /api/cards/:id
const updateCard = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const board = await Board.findById(card.boardId);
    const hasAccess = board && (await isWorkspaceMember(board.workspaceId, req.user._id));
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    const { title, description, priority, assignedTo, listId, position } = req.body;

    let changeDescription = `Updated card "${card.title}"`;
    if (priority && priority !== card.priority) {
      changeDescription = `Changed priority of "${card.title}" from ${card.priority} to ${priority}`;
    } else if (title && title !== card.title) {
      changeDescription = `Renamed card "${card.title}" to "${title}"`;
    }

    if (title !== undefined) card.title = title;
    if (description !== undefined) card.description = description;
    if (priority !== undefined) card.priority = priority;
    if (assignedTo !== undefined) card.assignedTo = assignedTo;
    if (listId !== undefined) card.listId = listId;
    if (position !== undefined) card.position = position;

    await card.save();

    const activity = new Activity({
      workspaceId: board.workspaceId,
      boardId: card.boardId,
      user: req.user._id,
      action: 'UPDATED_CARD',
      details: changeDescription,
    });
    await activity.save();

    req.io?.to(`board:${card.boardId}`).emit('card:updated', card);
    req.io?.to(`board:${card.boardId}`).emit('activity:created', activity);

    res.status(200).json({
      success: true,
      data: card,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Delete card
// DELETE /api/cards/:id
const deleteCard = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const board = await Board.findById(card.boardId);
    const hasAccess = board && (await isWorkspaceMember(board.workspaceId, req.user._id));
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    const boardId = card.boardId;
    const cardTitle = card.title;
    const list = await List.findById(card.listId);

    await card.deleteOne();

    const activity = new Activity({
      workspaceId: board.workspaceId,
      boardId,
      user: req.user._id,
      action: 'DELETED_CARD',
      details: `Deleted card "${cardTitle}" ${list ? `from "${list.name}"` : ''}`,
    });
    await activity.save();

    req.io?.to(`board:${boardId}`).emit('card:deleted', card._id);
    req.io?.to(`board:${boardId}`).emit('activity:created', activity);

    res.status(200).json({
      success: true,
      message: 'Card deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// 6. Move card
// PATCH /api/cards/:id/move
const moveCard = async (req, res, next) => {
  try {
    const { listId, position } = req.body;

    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const board = await Board.findById(card.boardId);
    const hasAccess = board && (await isWorkspaceMember(board.workspaceId, req.user._id));
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: not a workspace member' });
    }

    let moveDescription;
    const oldList = await List.findById(card.listId);

    if (listId && listId.toString() !== card.listId.toString()) {
      const newList = await List.findById(listId);
      const fromName = oldList ? `"${oldList.name}"` : 'list';
      const toName = newList ? `"${newList.name}"` : 'list';
      moveDescription = `Moved card "${card.title}" from ${fromName} to ${toName}`;
      card.listId = listId;
    } else {
      moveDescription = `Reordered card "${card.title}" within "${oldList?.name || 'list'}"`;
    }

    if (position !== undefined) card.position = position;

    await card.save();

    const activity = new Activity({
      workspaceId: board.workspaceId,
      boardId: card.boardId,
      user: req.user._id,
      action: 'MOVED_CARD',
      details: moveDescription,
    });
    await activity.save();

    req.io?.to(`board:${card.boardId}`).emit('card:moved', card);
    req.io?.to(`board:${card.boardId}`).emit('activity:created', activity);

    res.status(200).json({
      success: true,
      data: card,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCard,
  getCardsByBoard,
  getCardById,
  updateCard,
  deleteCard,
  moveCard,
};
