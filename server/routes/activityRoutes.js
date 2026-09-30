const express = require('express');
const { getBoardActivities } = require('../controllers/activityController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/board/:boardId', getBoardActivities);

module.exports = router;

