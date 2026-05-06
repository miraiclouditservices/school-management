const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  schoolId: { type: String, required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  voucherNo: { type: String, unique: true },
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['Income', 'Expense'], required: true },
  category: { type: String, required: true }, // Fee Collection, Salaries, Utilities, Transport, Maintenance, etc.
  description: { type: String },
  amount: { type: Number, required: true },
  paymentMode: { type: String, enum: ['Cash', 'Online', 'Bank Transfer', 'Cheque', 'UPI'] },
  referenceNo: { type: String },
  relatedTo: { type: String }, // Student name, Staff name, Vendor
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

transactionSchema.pre('save', async function(next) {
  if (!this.voucherNo) {
    const prefix = this.type === 'Income' ? 'RCPT' : 'PYM';
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({ type: this.type }) + 1;
    this.voucherNo = `${prefix}${year}-${String(count).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
