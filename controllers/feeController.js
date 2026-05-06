const Fee = require('../models/Fee');
const factory = require('./factory');

exports.getAllFees = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt', search, className, section, status, academicYear } = req.query;
    
    // Build query
    const queryObj = { schoolId: req.user.schoolId };
    if (status) queryObj.feeStatus = status;
    if (academicYear) queryObj.academicYear = academicYear;

    // Student filters require finding student IDs first
    let studentQuery = { schoolId: req.user.schoolId };
    let hasStudentFilter = false;

    if (className) { studentQuery.currentClass = className; hasStudentFilter = true; }
    if (section) { studentQuery.section = section; hasStudentFilter = true; }
    if (search) {
      studentQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { admissionNo: { $regex: search, $options: 'i' } },
        { rollNo: { $regex: search, $options: 'i' } }
      ];
      hasStudentFilter = true;
    }

    if (hasStudentFilter) {
      const studentIds = await require('../models/Student').find(studentQuery).distinct('_id');
      queryObj.student = { $in: studentIds };
    }

    const total = await Fee.countDocuments(queryObj);
    const data = await Fee.find(queryObj)
      .populate('student academicYear')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.getFee = factory.getOne(Fee, 'student academicYear');
exports.createFee = factory.createOne(Fee);
exports.updateFee = factory.updateOne(Fee);
exports.deleteFee = factory.deleteOne(Fee);

exports.collectPayment = async (req, res) => {
  try {
    const { amount, mode, receiptNo } = req.body;
    const fee = await Fee.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });

    fee.paidAmount += Number(amount);
    fee.lastPaymentDate = new Date();
    fee.payments.push({ receiptNo, amount, mode, date: fee.lastPaymentDate });
    await fee.save();

    res.json({ success: true, data: fee });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getFeeSummary = async (req, res) => {
  try {
    const fees = await Fee.find({ schoolId: req.user.schoolId });
    
    const summary = fees.reduce((acc, fee) => {
      acc.totalRevenue += (fee.netFee || fee.totalFee);
      acc.totalCollected += fee.paidAmount;
      acc.totalBalance += (fee.balanceDue || 0);
      if (fee.feeStatus === 'Overdue') acc.defaultersCount += 1;
      return acc;
    }, { totalRevenue: 0, totalCollected: 0, totalBalance: 0, defaultersCount: 0 });

    res.json({ success: true, data: summary });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
