const mongoose = require('mongoose');

const transportSchema = new mongoose.Schema({
  routeName: { type: String, required: true },
  vehicleNo: { type: String, required: true },
  driverName: { type: String },
  driverMobile: { type: String },
  helperName: { type: String },
  helperMobile: { type: String },
  capacity: { type: Number },
  fee: { type: Number, default: 0 },
  villageName: { type: String },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Transport', transportSchema);
