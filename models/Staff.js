const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  staffId: { type: String, unique: true }, // Auto: STF001
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  photo: { type: String, default: '' },
  // Personal
  name: { type: String, required: true, trim: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  dateOfBirth: { type: Date },
  bloodGroup: { type: String },
  nationality: { type: String, default: 'Indian' },
  religion: { type: String },
  maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
  aadharNumber: { type: String },
  panNumber: { type: String },
  // Contact
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { street: String, city: String, state: String, pincode: String },
  emergencyContact: { name: String, relation: String, phone: String },
  // Professional
  department: { type: String, required: true }, // English, Mathematics, Science, Administration, Transport, etc.
  designation: { type: String, required: true }, // TGT, PGT, PET, Admin Officer, Accountant, etc.
  employmentType: { type: String, enum: ['Permanent', 'Contractual', 'Part-time', 'Visiting'], default: 'Permanent' },
  joiningDate: { type: Date, required: true },
  experience: { type: Number }, // years
  qualification: { type: String },
  specialization: { type: String },
  subjectsHandled: [{ type: String }],
  classesAssigned: [{ type: String }],
  // Salary
  basicSalary: { type: Number },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  bankName: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },
  // Status
  status: { type: String, enum: ['Active', 'Inactive', 'On Leave', 'Resigned'], default: 'Active' },
  // Documents
  documents: [{
    name: String, url: String, uploadedAt: { type: Date, default: Date.now },
  }],
  // Linked user
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

staffSchema.pre('save', async function(next) {
  if (!this.staffId) {
    const count = await this.constructor.countDocuments() + 1;
    this.staffId = `STF${String(count).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Staff', staffSchema);
