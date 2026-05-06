const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  schoolId: { type: String, required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  month: { type: String, required: true }, // "May 2025"
  year: { type: Number, required: true },
  monthNum: { type: Number, required: true }, // 1-12
  basicSalary: { type: Number, required: true },
  allowances: {
    hra: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    ta: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  deductions: {
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    loanRecovery: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  grossSalary: { type: Number },
  netSalary: { type: Number },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Hold'], default: 'Pending' },
  paymentDate: { type: Date },
  paymentMode: { type: String },
  transactionId: { type: String },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

payrollSchema.pre('save', function(next) {
  this.allowances.total = (this.allowances.hra || 0) + (this.allowances.da || 0) + (this.allowances.ta || 0) + (this.allowances.medical || 0) + (this.allowances.special || 0);
  this.deductions.total = (this.deductions.pf || 0) + (this.deductions.esi || 0) + (this.deductions.tax || 0) + (this.deductions.loanRecovery || 0) + (this.deductions.other || 0);
  this.grossSalary = this.basicSalary + this.allowances.total;
  this.netSalary = this.grossSalary - this.deductions.total;
  next();
});

module.exports = mongoose.model('Payroll', payrollSchema);
