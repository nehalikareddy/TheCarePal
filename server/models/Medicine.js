const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  name: { type: String, required: true, trim: true },
  strength: { type: String, required: true, trim: true },
  dose: { type: String, required: true, trim: true },
  times: [{ type: String, required: true, trim: true }],
  food: { type: String, enum: ['before', 'after', 'any'], default: 'after' },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  currentStock: { type: Number, required: true, min: 0 },
  lowStockThresholdDays: { type: Number, default: 3 },
  prescriptionUrl: { type: String, default: '' },
  prescriptionImageUrl: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Medicine', medicineSchema);
