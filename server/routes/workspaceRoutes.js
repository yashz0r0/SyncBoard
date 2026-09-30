const express = require('express');
const {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addMember,
} = require('../controllers/workspaceController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createWorkspace);
router.get('/', getWorkspaces);
router.get('/:id', getWorkspaceById);
router.patch('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);
router.post('/:id/members', addMember);

module.exports = router;
