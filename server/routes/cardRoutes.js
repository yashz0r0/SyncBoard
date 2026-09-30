const express = require('express');
const {
  createCard,
  getCardsByBoard,
  getCardById,
  updateCard,
  deleteCard,
  moveCard,
} = require('../controllers/cardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createCard);
router.get('/single/:id', getCardById);
router.patch('/:id/move', moveCard);
router.patch('/:id', updateCard);
router.delete('/:id', deleteCard);
router.get('/:boardId', getCardsByBoard);

module.exports = router;
