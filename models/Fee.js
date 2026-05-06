const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  feeCategory: { type: String, default: 'General' },
  feeStructure: { type: String },
  // Breakdown
  tuitionFee: { type: Number, default: 0 },
  transportFee: { type: Number, default: 0 },
  booksFee: { type: Number, default: 0 },
  labFee: { type: Number, default: 0 },
  activityFee: { type: Number, default: 0 },
  uniformFee: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  totalFee: { type: Number, required: true },
  // Scholarship / Discount
  scholarshipType: { type: String },
  discountPercent: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  netFee: { type: Number },
  // Payment tracking
  paidAmount: { type: Number, default: 0 },
  balanceDue: { type: Number },
  dueDate: { type: Date },
  lastPaymentDate: { type: Date },
  feeStatus: { type: String, enum: ['Paid', 'Partially Paid', 'Overdue', 'Unpaid'], default: 'Unpaid' },
  // Payments
  payments: [{
    receiptNo: String,
    amount: Number,
    date: { type: Date, default: Date.now },
    mode: { type: String, enum: ['Cash', 'Online', 'Bank Transfer', 'Cheque', 'UPI'] },
    transactionId: String,
    remarks: String,
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  }],
  installments: [{
    name: String,
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    paidAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['Paid', 'Partially Paid', 'Upcoming', 'Overdue'], default: 'Upcoming' }
  }],
}, { timestamps: true });

feeSchema.pre('save', function(next) {
  this.netFee = this.totalFee - this.discountAmount;
  this.balanceDue = this.netFee - this.paidAmount;
  
  // Update overall status
  if (this.balanceDue <= 0) {
    this.feeStatus = 'Paid';
  } else if (this.balanceDue > 0 && this.dueDate && new Date() > this.dueDate) {
    this.feeStatus = 'Overdue';
  } else if (this.paidAmount > 0 && this.balanceDue > 0) {
    this.feeStatus = 'Partially Paid';
  } else {
    this.feeStatus = 'Unpaid';
  }

  // Update installment statuses
  const today = new Date();
  if (this.installments && this.installments.length > 0) {
    this.installments.forEach(inst => {
      const balance = inst.amount - inst.paidAmount;
      if (balance <= 0) inst.status = 'Paid';
      else if (inst.paidAmount > 0) inst.status = 'Partially Paid';
      else if (inst.dueDate < today) inst.status = 'Overdue';
      else inst.status = 'Upcoming';
    });
  }

  next();
});

module.exports = mongoose.model('Fee', feeSchema);
