const router = require('express').Router();
const Transaction = require('../models/Transaction');
const { protect, authorize } = require('../middleware/auth');
const financeController = require('../controllers/financeController');

router.use(protect);

router.get('/summary', authorize('admin'), financeController.getFinanceSummary);
router.get('/staff-stats', authorize('admin'), financeController.getStaffPayrollStats);
router.post('/pay-salary', authorize('admin'), financeController.processSalaryPayment);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, type, category, academicYear, startDate, endDate, staffId } = req.query;
    
    // Data Isolation: Staff can only view their own transactions
    if (req.user.role !== 'admin') {
       if (!staffId || staffId !== req.user.staffId?.toString()) {
          return res.status(403).json({ success: false, message: 'You can only view your own transaction history.' });
       }
    }

    const baseQuery = { $or: [{ schoolId: req.user.schoolId }, { schoolId: { $exists: false } }] };
    let specificQuery = {};
    
    if (staffId) {
      const staff = await require('../models/Staff').findById(staffId);
      if (staff) {
        specificQuery = {
          $or: [
            { staffId: staffId },
            { relatedTo: staff.name }
          ]
        };
      } else {
        specificQuery = { staffId: staffId };
      }
    }

    if (type) specificQuery.type = type;
    if (category) specificQuery.category = category;
    if (academicYear) specificQuery.academicYear = academicYear;
    if (startDate && endDate) specificQuery.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    
    const query = { $and: [baseQuery, specificQuery] };
    
    const total = await Transaction.countDocuments(query);
    const data = await Transaction.find(query).populate('createdBy', 'name').sort({ date: -1 }).skip((page - 1) * limit).limit(Number(limit));
    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const { academicYear, month } = req.query;
    const query = {};
    if (academicYear) query.academicYear = academicYear;
    if (month) {
      const [y, m] = month.split('-');
      query.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
    }
    const income = await Transaction.aggregate([{ $match: { ...query, type: 'Income' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const expense = await Transaction.aggregate([{ $match: { ...query, type: 'Expense' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const byCategory = await Transaction.aggregate([{ $match: { ...query, type: 'Expense' } }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }]);
    res.json({ success: true, data: {
      totalIncome: income[0]?.total || 0,
      totalExpenses: expense[0]?.total || 0,
      netBalance: (income[0]?.total || 0) - (expense[0]?.total || 0),
      expenseByCategory: byCategory,
    }});
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', authorize('admin'), async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    const txn = await Transaction.create(req.body);
    res.status(201).json({ success: true, data: txn });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const txn = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: txn });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
