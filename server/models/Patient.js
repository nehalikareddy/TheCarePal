const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true },
  condition: { type: String, default: 'Home Care', trim: true },
  careCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  caretakers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  family: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingMembers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    role: String,
    profilePicture: { type: String, default: '' },
    age: { type: Number, default: null },
    sex: { type: String, default: '' },
    qualification: { type: String, default: '' },
    address: { type: String, default: '' },
    requestedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
