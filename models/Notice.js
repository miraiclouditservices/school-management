const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  title: { type: String, required: true },
  category: { type: String, enum: ['Academic', 'Holiday', 'Fee', 'Transport', 'Meeting', 'General'], required: true },
  content: { type: String },
  audience: { type: String, enum: ['All', 'Students', 'Parents', 'Staff'], default: 'All' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedOn: { type: Date, default: Date.now },
  attachments: [{ name: String, url: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
