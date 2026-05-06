const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  examName: { type: String, required: true }, // Unit Test 1, Mid-Term, Final Examination
  examType: { type: String, enum: ['Unit Test', 'Mid-Term', 'Final', 'Pre-Board', 'Board'], required: true },
  className: { type: String, required: true },
  section: { type: String, required: true },
  subject: { type: String, required: true },
  maxMarks: { type: Number, required: true, default: 100 },
  examDate: { type: Date },
  resultDate: { type: Date },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  marks: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    rollNo: String,
    marksObtained: { type: Number },
    grade: String,
    remarks: String,
    isAbsent: { type: Boolean, default: false },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Marks', marksSchema);
