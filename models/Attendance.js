const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  attendanceType: { type: String, enum: ['Student', 'Staff'], required: true, default: 'Student' },
  className: { type: String }, // Required for Students
  section: { type: String },   // Required for Students
  date: { type: Date, required: true },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  markedByName: { type: String },
  markedByRole: { type: String },
  records: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    status: { type: String, enum: ['Present', 'Absent', 'Late', 'Leave', 'Half Day'], required: true },
    checkInTime: String,
    checkOutTime: String,
    remarks: String,
  }],
}, { timestamps: true });

// Ensure unique attendance per type/class/section/date
attendanceSchema.index({ schoolId: 1, attendanceType: 1, className: 1, section: 1, date: 1 }, { 
  unique: true, 
  partialFilterExpression: { attendanceType: 'Student' } 
});

attendanceSchema.index({ schoolId: 1, attendanceType: 1, date: 1 }, { 
  unique: true, 
  partialFilterExpression: { attendanceType: 'Staff' } 
});

module.exports = mongoose.model('Attendance', attendanceSchema);
