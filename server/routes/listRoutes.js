const express = require('express');
const {
  createList,
  getListsByBoard,
  updateList,
  deleteList,
} = require('../controllers/listController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createList);
router.get('/board/:boardId', getListsByBoard);
router.get('/:boardId', getListsByBoard);
router.patch('/:id', updateList);
router.delete('/:id', deleteList);

module.exports = router;
