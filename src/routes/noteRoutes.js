const express = require('express');
const {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
} = require('../controllers/noteController');

const router = express.Router({ mergeParams: true });

router.route('/').get(getNotes).post(createNote);
router.route('/:noteId').put(updateNote).delete(deleteNote);

module.exports = router;