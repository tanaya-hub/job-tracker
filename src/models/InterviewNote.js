const mongoose = require('mongoose');

const interviewNoteSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, index: true },
    applicationId: { type: Number, required: true, index: true },
    round: { type: String, required: true, trim: true },
    interviewDate: { type: Date },
    mode: { type: String, enum: ['online', 'offline', 'phone'], default: 'online' },
    questions: { type: [String], default: [] },
    notes: { type: String, default: '' },
    outcome: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InterviewNote', interviewNoteSchema);