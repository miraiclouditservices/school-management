const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  inquiryId: { type: String, unique: true }, // Auto: INQ-2025-001
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  dateOfInquiry: { type: Date, default: Date.now },
  modeOfInquiry: { type: String, enum: ['Walk-in', 'Phone', 'Email', 'Website', 'Social Media', 'Reference'], required: true },
  referredBy: { type: String },
  assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  // Student Info
  studentName: { type: String, required: true },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  classSeeking: { type: String, required: true }, // LKG, UKG, 1-12
  previousSchool: { type: String },
  academicPerformance: { type: String, enum: ['Excellent', 'Good', 'Average', 'Below Average'] },
  // Parent Info
  fatherName: { type: String },
  motherName: { type: String },
  guardianName: { type: String },
  parentMobile: { type: String, required: true },
  alternateMobile: { type: String },
  parentEmail: { type: String },
  address: { type: String },
  fatherOccupation: { type: String },
  motherOccupation: { type: String },
  // Preferences
  interestedPrograms: [{ type: String }], // Transport, Hostel, Extra-curricular
  preferredCommunication: { type: String, enum: ['Call', 'WhatsApp', 'Email', 'SMS'] },
  transportRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'Transport' },
  additionalNotes: { type: String },
  // Follow-up
  counselor: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  nextFollowUpDate: { type: Date },
  followUpRemarks: { type: String },
  status: { type: String, enum: ['New', 'Follow-up', 'Converted', 'Lost'], default: 'New' },
  reasonForLost: { type: String },
  convertedToAdmission: { type: Boolean, default: false },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
}, { timestamps: true });

// Auto-generate inquiryId
inquirySchema.pre('save', async function (next) {
  if (!this.inquiryId) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments() + 1;
    this.inquiryId = `INQ-${year}-${String(count).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Inquiry', inquirySchema);
