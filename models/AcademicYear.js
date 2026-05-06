const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema( {
  name: { type: String, required: true }, // e.g., "2024-2025"
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isCurrent: { type: Boolean, default: false },
  classes: [{
    name: { type: String, required: true }, // LKG, UKG, 1, 2, ... 10, 11, 12
    sections: [{ type: String }], // A, B, C, D
    classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    subjects: [{ type: String }],
    maxStrength: { type: Number, default: 40 },
  }],
  feeStructures: [{
    className: String,
    category: { type: String, enum: ['General', 'SC/ST', 'OBC', 'Staff Ward', 'Scholarship'] },
    tuitionFee: Number,
    transportFee: Number,
    booksFee: Number,
    labFee: Number,
    activityFee: Number,
    uniformFee: Number,
    otherCharges: Number,
    totalFee: Number,
  }],
  gradingSystem: [{
    minMarks: Number,
    maxMarks: Number,
    grade: String,
    gradePoint: Number,
    remarks: String,
  }],
  status: { type: String, enum: ['Active', 'Completed', 'Upcoming'], default: 'Active' },
}, { timestamps: true });

module.exports = mongoose.model('AcademicYear', academicYearSchema);
