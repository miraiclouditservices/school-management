const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  className: { type: String, required: true },
  section: { type: String, required: true },
  effectiveFrom: { type: Date, required: true },
  classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  periods: [{
    day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], required: true },
    periodNo: { type: Number, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    subject: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    teacherName: { type: String },
    className: { type: String }, // Redundant but helpful for teacher-side lookup
    section: { type: String },
    room: { type: String },
    isBreak: { type: Boolean, default: false },
    breakType: { type: String }, // Break, Lunch Break
  }],
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Timetable', timetableSchema);
