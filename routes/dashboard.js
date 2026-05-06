const router = require('express').Router();
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const Inquiry = require('../models/Inquiry');
const Fee = require('../models/Fee');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/admin', async (req, res) => {
  try {
    const { academicYear } = req.query;
    const schoolId = req.user.schoolId;
    const q = { schoolId };
    
    if (academicYear && academicYear !== 'undefined' && academicYear !== 'null' && academicYear !== '') {
      q.academicYear = academicYear;
    }

    const [students, staff, inquiries, feeStats, events, recentInquiries] = await Promise.all([
      Student.countDocuments({ ...q, admissionStatus: 'Active' }),
      Staff.countDocuments({ schoolId, status: 'Active' }),
      Inquiry.countDocuments(q),
      Fee.aggregate([
        { $match: q }, 
        { $group: { _id: null, total: { $sum: '$totalFee' }, collected: { $sum: '$paidAmount' }, pending: { $sum: '$balanceDue' } } }
      ]),
      Event.countDocuments({ schoolId, status: 'Upcoming' }),
      Inquiry.find(q).sort({ createdAt: -1 }).limit(5).populate('counselor', 'name'),
    ]);

    // Class-wise strength
    const classWise = await Student.aggregate([
      { $match: { ...q, admissionStatus: 'Active' } },
      { $group: { _id: { class: '$currentClass', section: '$section' }, count: { $sum: 1 } } },
      { $sort: { '_id.class': 1 } },
    ]);

    res.json({ success: true, data: {
      totalStudents: students, totalStaff: staff, totalInquiries: inquiries,
      fee: feeStats[0] || { total: 0, collected: 0, pending: 0 },
      upcomingEvents: events, recentInquiries, classWise,
    }});
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
});

router.get('/staff', async (req, res) => {
  try {
    const staffDoc = await Staff.findOne({ userId: req.user._id });
    if (!staffDoc) return res.json({ success: true, data: {} });
    const classes = staffDoc.classesAssigned || [];
    res.json({ success: true, data: { staff: staffDoc, classes } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/student', async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id }).populate('academicYear classTeacher');
    if (!student) return res.json({ success: true, data: {} });
    const attendance = await Attendance.find({ 'records.student': student._id }).sort({ date: -1 }).limit(30);
    let present = 0, total = 0;
    attendance.forEach(a => {
      const rec = a.records.find(r => r.student?.toString() === student._id.toString());
      if (rec) { total++; if (rec.status === 'Present' || rec.status === 'Late') present++; }
    });
    res.json({ success: true, data: { student, attendancePct: total ? ((present / total) * 100).toFixed(2) : 100 } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
