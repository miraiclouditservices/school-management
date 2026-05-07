const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  admissionNo: { type: String, unique: true }, // Auto: ADM2024-1001
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  rollNo: { type: String },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  admissionDate: { type: Date, default: Date.now },
  admissionStatus: { type: String, enum: ['Active', 'Inactive', 'TC Issued', 'Passout'], default: 'Active' },
  photo: { type: String, default: '' },
  // Basic Information
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''] },
  nationality: { type: String, default: 'Indian' },
  religion: { type: String },
  caste: { type: String },
  category: { type: String, enum: ['General', 'SC', 'ST', 'OBC', 'EWS', ''] },
  motherTongue: { type: String },
  aadharNumber: { type: String },
  passportNumber: { type: String },
  // Academic
  currentClass: { type: String, required: true }, // LKG, UKG, 1-12
  section: { type: String, required: true },
  stream: { type: String }, // For 11th/12th: Science, Commerce, Arts
  subjects: [{ type: String }],
  previousSchool: { type: String },
  tcNumber: { type: String },
  // Parent/Guardian
  father: {
    name: String, mobile: String, email: String, occupation: String,
    qualification: String, annualIncome: String, aadhar: String, photo: String,
  },
  mother: {
    name: String, mobile: String, email: String, occupation: String,
    qualification: String, annualIncome: String, aadhar: String, photo: String,
  },
  guardian: {
    name: String, relation: String, mobile: String, email: String,
    occupation: String, photo: String,
  },
  // Address
  address: {
    street: String, city: String, state: String, pincode: String, country: { type: String, default: 'India' },
  },
  permanentAddress: {
    street: String, city: String, state: String, pincode: String, country: { type: String, default: 'India' },
  },
  sameAsAddress: { type: Boolean, default: true },
  // Emergency & Medical
  emergencyContact: { name: String, relation: String, phone: String },
  medical: {
    height: String, weight: String, allergies: String,
    illness: String, disability: String,
    physicianName: String, physicianPhone: String,
    healthCertificate: String, // Cloudinary URL
  },
  // Transport & Hostel
  transport: {
    required: { type: Boolean, default: false },
    routeNo: String, pickupPoint: String, vehicleNo: String,
    transportRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'Transport' },
  },
  hostel: {
    required: { type: Boolean, default: false },
    roomNo: String, blockName: String,
  },
  // Fee
  feeCategory: { type: String, default: 'General' },
  feeStructure: { type: String },
  scholarships: { type: String },
  // Documents
  documents: [{
    name: String, url: String, uploadedAt: { type: Date, default: Date.now },
  }],
  // Linked user
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
}, { timestamps: true });

studentSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

studentSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const diff = Date.now() - this.dateOfBirth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

studentSchema.pre('save', async function (next) {
  if (!this.admissionNo) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments() + 1;
    this.admissionNo = `ADM${year}-${String(count).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Student', studentSchema);
