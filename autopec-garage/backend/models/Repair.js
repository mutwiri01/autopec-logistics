const mongoose = require('mongoose');

const repairSchema = new mongoose.Schema({
  registrationNumber: {
    type: String,
    required: true,
    uppercase: true
  },
  problemDescription: {
    type: String,
    required: true
  },
  customerName: String,
  phoneNumber: String,
  carModel: String,
  status: {
    type: String,
    enum: ['submitted', 'in_garage', 'in_progress', 'completed'],
    default: 'submitted'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  mechanicNotes: String
});

module.exports = mongoose.model('Repair', repairSchema);