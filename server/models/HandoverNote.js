const mongoose = require('mongoose');

const handoverNoteSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  shift: { type: String, enum: ['Day to Night', 'Night to Day'], required: true },
  noteText: { type: String, required: true },
  authorName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HandoverNote', handoverNoteSchema);
