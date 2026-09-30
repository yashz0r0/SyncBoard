const express = require('express');
const {
  createBoard,
  getBoardsByWorkspace,
  getBoardById,
  updateBoard,
  deleteBoard,
} = require('../controllers/boardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createBoard);
router.get('/workspace/:workspaceId', getBoardsByWorkspace);
router.get('/:id', getBoardById);
router.patch('/:id', updateBoard);
router.delete('/:id', deleteBoard);

module.exports = router;
