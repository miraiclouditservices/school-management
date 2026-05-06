const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  title: { type: String, required: true },
  description: { type: String },
  targetType: { type: String, enum: ['Class', 'Student'], default: 'Class' },
  className: { type: String },
  section: { type: String },
  targetStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  subject: { type: String, required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  dueDate: { type: Date },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  status: { type: String, enum: ['Draft', 'Published', 'Archived'], default: 'Published' },
  attachments: [{ name: String, url: String }],
  submissions: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    status: { type: String, enum: ['Pending', 'Submitted', 'Graded'], default: 'Pending' },
    submittedAt: Date,
    content: String,
    grade: String,
    feedback: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
