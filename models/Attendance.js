const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  className: { type: String, required: true },
  section: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['Daily', 'Period-wise'], default: 'Daily' },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  records: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    rollNo: String,
    status: { type: String, enum: ['Present', 'Absent', 'Late', 'Leave'], required: true },
    checkInTime: String,
    checkOutTime: String,
    remarks: String,
  }],
}, { timestamps: true });

attendanceSchema.index({ schoolId: 1, className: 1, section: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
