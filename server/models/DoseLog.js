const mongoose = require('mongoose');

const doseLogSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  scheduledDate: { type: String, required: true }, // "YYYY-MM-DD"
  scheduledTime: { type: String, required: true }, // "HH:mm"
  status: { type: String, enum: ['given', 'skipped'], required: true },
  reasonText: { type: String, default: '' },       // Required when status === 'skipped'
  loggedBy: { type: String, required: true },
  loggedAt: { type: Date, default: Date.now }
});

// Prevent duplicate logs for the exact same dose slot (prevents double-dosing)
doseLogSchema.index({ patientId: 1, medicineId: 1, scheduledDate: 1, scheduledTime: 1 }, { unique: true });

module.exports = mongoose.model('DoseLog', doseLogSchema);
