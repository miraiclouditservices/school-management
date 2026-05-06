const router = require('express').Router();
const Payroll = require('../models/Payroll');
const Staff = require('../models/Staff');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, month, year, status, academicYear } = req.query;
    const query = {};
    if (month) query.month = month;
    if (year) query.year = Number(year);
    if (status) query.paymentStatus = status;
    if (academicYear) query.academicYear = academicYear;
    const total = await Payroll.countDocuments(query);
    const data = await Payroll.find(query).populate('staff', 'name staffId department designation basicSalary').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = {};
    if (month) query.month = month;
    if (year) query.year = Number(year);
    const result = await Payroll.aggregate([{ $match: query }, { $group: {
      _id: null, totalBasic: { $sum: '$basicSalary' }, totalAllowances: { $sum: '$allowances.total' },
      totalDeductions: { $sum: '$deductions.total' }, totalNet: { $sum: '$netSalary' },
    }}]);
    const employees = await Staff.countDocuments({ status: 'Active' });
    res.json({ success: true, data: { ...(result[0] || {}), totalEmployees: employees } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Generate payroll for month
router.post('/generate', async (req, res) => {
  try {
    const { month, year, monthNum, academicYear } = req.body;
    const staffList = await Staff.find({ status: 'Active' });
    const payrolls = [];
    for (const s of staffList) {
      const existing = await Payroll.findOne({ staff: s._id, month, year });
      if (existing) continue;
      payrolls.push({
        academicYear, staff: s._id, month, year, monthNum,
        basicSalary: s.basicSalary || 0,
        allowances: { hra: (s.allowances || 0) * 0.4, da: (s.allowances || 0) * 0.3, ta: (s.allowances || 0) * 0.2, medical: (s.allowances || 0) * 0.1 },
        deductions: { pf: (s.deductions || 0) * 0.5, tax: (s.deductions || 0) * 0.3, other: (s.deductions || 0) * 0.2 },
        generatedBy: req.user._id,
      });
    }
    const created = await Payroll.insertMany(payrolls);
    res.status(201).json({ success: true, data: created, message: `${created.length} payrolls generated` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const p = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: p });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Run payroll (mark paid)
router.post('/run', async (req, res) => {
  try {
    const { ids, paymentMode } = req.body;
    const result = await Payroll.updateMany({ _id: { $in: ids } }, { paymentStatus: 'Paid', paymentDate: new Date(), paymentMode });
    res.json({ success: true, message: `${result.modifiedCount} payrolls marked paid` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Payroll.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
