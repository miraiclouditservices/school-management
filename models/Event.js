const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  name: { type: String, required: true },
  date: { type: Date, required: true },
  endDate: { type: Date },
  time: { type: String },
  venue: { type: String },
  organizedBy: { type: String },
  audience: { type: String, enum: ['All', 'Students', 'Parents', 'Staff', 'Students, Parents'] },
  description: { type: String },
  status: { type: String, enum: ['Upcoming', 'In Progress', 'Completed', 'Cancelled'], default: 'Upcoming' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
