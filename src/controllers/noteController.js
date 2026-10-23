const mongoose = require('mongoose');
const pool = require('../config/mysql');
const InterviewNote = require('../models/InterviewNote');

async function applicationBelongsToUser(applicationId, userId) {
  const [rows] = await pool.query(
    'SELECT id FROM applications WHERE id = ? AND user_id = ?',
    [applicationId, userId]
  );
  return rows.length > 0;
}

function pickNoteFields(body) {
  const fields = {};
  ['round', 'interviewDate', 'mode', 'questions', 'notes', 'outcome'].forEach((key) => {
    if (body[key] !== undefined) fields[key] = body[key];
  });
  return fields;
}

async function createNote(req, res) {
  const applicationId = Number(req.params.applicationId);

  if (!(await applicationBelongsToUser(applicationId, req.user.id))) {
    return res.status(404).json({ message: 'Application not found' });
  }
  if (!req.body.round || !req.body.round.trim()) {
    return res.status(400).json({ message: 'Round name is required' });
  }

  try {
    const note = await InterviewNote.create({
      ...pickNoteFields(req.body),
      userId: req.user.id,
      applicationId,
    });
    res.status(201).json(note);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    throw err;
  }
}

async function getNotes(req, res) {
  const applicationId = Number(req.params.applicationId);

  if (!(await applicationBelongsToUser(applicationId, req.user.id))) {
    return res.status(404).json({ message: 'Application not found' });
  }

  const notes = await InterviewNote.find({
    applicationId,
    userId: req.user.id,
  }).sort({ interviewDate: 1, createdAt: 1 });

  res.json(notes);
}

async function updateNote(req, res) {
  const { noteId } = req.params;
  const applicationId = Number(req.params.applicationId);

  if (!mongoose.isValidObjectId(noteId)) {
    return res.status(400).json({ message: 'Invalid note id' });
  }

  try {
    const note = await InterviewNote.findOneAndUpdate(
      { _id: noteId, applicationId, userId: req.user.id },
      pickNoteFields(req.body),
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json(note);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    throw err;
  }
}

async function deleteNote(req, res) {
  const { noteId } = req.params;
  const applicationId = Number(req.params.applicationId);

  if (!mongoose.isValidObjectId(noteId)) {
    return res.status(400).json({ message: 'Invalid note id' });
  }

  const note = await InterviewNote.findOneAndDelete({
    _id: noteId,
    applicationId,
    userId: req.user.id,
  });

  if (!note) {
    return res.status(404).json({ message: 'Note not found' });
  }
  res.json({ message: 'Note deleted' });
}

module.exports = { createNote, getNotes, updateNote, deleteNote };