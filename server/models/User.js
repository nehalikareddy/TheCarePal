const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['family', 'caretaker'], required: true },
  patients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }],
  profilePicture: { type: String, default: '' },
  age: { type: Number, default: null },
  sex: { type: String, enum: ['', 'Male', 'Female', 'Other'], default: '' },
  qualification: { type: String, default: '' },
  accountType: { type: String, enum: ['', 'self', 'family'], default: 'family' },
  relation: { type: String, default: '' },
  address: { type: String, default: '' },
  profileCompleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
