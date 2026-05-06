const Transaction = require('../models/Transaction');
const Staff = require('../models/Staff');
const Fee = require('../models/Fee');

exports.getFinanceSummary = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const ayRecord = await require('../models/AcademicYear').findOne({ schoolId, isCurrent: true });
    const academicYearId = req.query.academicYear || ayRecord?._id;
    
    // Aggregating Income
    const incomeTransactions = await Transaction.aggregate([
      { $match: { schoolId, type: 'Income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const feeCollections = await Fee.aggregate([
      { $match: { schoolId, status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalIncome = (incomeTransactions[0]?.total || 0) + (feeCollections[0]?.total || 0);
    
    // Aggregating Expenses
    const expenseTransactions = await Transaction.aggregate([
      { $match: { schoolId, type: 'Expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const payrollExpenses = await require('../models/Payroll').aggregate([
      { $match: { schoolId, paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$netSalary' } } }
    ]);
    
    const totalExpense = (expenseTransactions[0]?.total || 0) + (payrollExpenses[0]?.total || 0);
    
    const pendingSalaries = await Staff.aggregate([
      { $match: { schoolId, status: { $nin: ['Resigned', 'Inactive'] } } },
      { $group: { _id: null, total: { $sum: '$basicSalary' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netProfit: totalIncome - totalExpense,
        pendingSalaries: pendingSalaries[0]?.total || 0
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ schoolId: req.user.schoolId })
      .sort('-date')
      .limit(20);
    res.json({ success: true, data: transactions });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.processSalaryPayment = async (req, res) => {
  try {
    const { staffId, month, year, amount, paymentMode } = req.body;
    const { schoolId } = req.user;
    const ayRecord = await require('../models/AcademicYear').findOne({ schoolId, isCurrent: true });

    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    // 1. Create Payroll Record
    const payroll = await require('../models/Payroll').create({
      schoolId,
      academicYear: ayRecord?._id,
      staff: staffId,
      month,
      year,
      monthNum: new Date(`${month} 1, ${year}`).getMonth() + 1,
      basicSalary: staff.basicSalary,
      netSalary: amount || staff.basicSalary,
      paymentStatus: 'Paid',
      paymentDate: new Date(),
      paymentMode,
      generatedBy: req.user._id
    });

    // 2. Create Institutional Transaction (Expense)
    await Transaction.create({
      schoolId,
      staffId: staffId, // Link to staff for individual history
      academicYear: ayRecord?._id,
      type: 'Expense',
      category: 'Salaries',
      description: `Salary payment for ${staff.name} - ${month} ${year}`,
      amount: amount || staff.basicSalary,
      paymentMode,
      relatedTo: staff.name,
      createdBy: req.user._id
    });

    res.json({ success: true, message: 'Salary processed successfully', data: payroll });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getStaffPayrollStats = async (req, res) => {
  try {
     const query = { status: { $nin: ['Resigned', 'Inactive'] } };
     if (req.user?.schoolId) query.schoolId = req.user.schoolId;

     const currentMonth = 'May'; // Should be dynamic in production
     const currentYear = '2026';

     const [staff, paidRecords] = await Promise.all([
        Staff.find(query).select('name department designation basicSalary photo bankName status'),
        require('../models/Payroll').find({ 
           $or: [{ schoolId: req.user.schoolId }, { schoolId: { $exists: false } }],
           month: currentMonth, 
           year: currentYear,
           paymentStatus: 'Paid'
        })
     ]);
     
     const paidStaffIds = new Set(paidRecords.map(r => r.staff.toString()));

     const data = staff.map(s => {
        const isPaid = paidStaffIds.has(s._id.toString());
        return {
           ...s.toObject(),
           lastPaymentMonth: isPaid ? currentMonth : 'April',
           status: isPaid ? 'Paid' : 'READY'
        };
     });

     res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
