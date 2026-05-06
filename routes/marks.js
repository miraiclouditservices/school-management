const router = require('express').Router();
const Marks = require('../models/Marks');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { className, section, subject, examName, academicYear, studentId, approvalStatus } = req.query;
    const query = {};
    if (className) query.className = className;
    if (section) query.section = section;
    if (subject) query.subject = subject;
    if (examName) query.examName = examName;
    if (academicYear) query.academicYear = academicYear;
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (studentId) query['marks.student'] = studentId;
    const data = await Marks.find(query)
      .populate('enteredBy', 'name')
      .populate('approvedBy', 'name')
      .populate('marks.student', 'firstName lastName admissionNo rollNo photo')
      .populate('academicYear', 'name')
      .sort({ examDate: -1 });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// @desc    Get logged in student's marks
// @route   GET /api/marks/my-marks
// @access  Private (Student)
router.get('/my-marks', async (req, res) => {
  try {
    if (!req.user.studentId) {
      return res.status(400).json({ success: false, message: 'User is not a student' });
    }
    
    const { academicYear, examName } = req.query;
    const query = { 'marks.student': req.user.studentId };
    if (academicYear) query.academicYear = academicYear;
    if (examName) query.examName = examName;

    const records = await Marks.find(query).populate('academicYear', 'name');
    
    // Flatten for UI
    const flattened = records.map(r => {
      const studentMark = r.marks.find(m => m.student?.toString() === req.user.studentId.toString());
      return {
        _id: r._id,
        examType: r.examName,
        subject: r.subject,
        marks: studentMark?.marksObtained || 0,
        maxMarks: r.maxMarks,
        grade: studentMark?.grade || '-',
        remarks: studentMark?.remarks || 'Good Effort',
        examDate: r.examDate
      };
    });

    res.json({ success: true, data: flattened });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Stats for a class exam
router.get('/stats', async (req, res) => {
  try {
    const { className, section, examName, academicYear } = req.query;
    const query = { className, section };
    if (examName) query.examName = examName;
    if (academicYear) query.academicYear = academicYear;
    const records = await Marks.find(query);
    const subjectStats = records.map(r => {
      const marks = r.marks.filter(m => !m.isAbsent).map(m => m.marksObtained);
      const avg = marks.length ? (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(2) : 0;
      const highest = marks.length ? Math.max(...marks) : 0;
      const lowest = marks.length ? Math.min(...marks) : 0;
      const passPct = marks.length ? ((marks.filter(m => m >= r.maxMarks * 0.33).length / marks.length) * 100).toFixed(2) : 0;
      return { subject: r.subject, maxMarks: r.maxMarks, classAverage: Number(avg), highest, lowest, passPercentage: Number(passPct), studentsAppeared: marks.length };
    });
    res.json({ success: true, data: subjectStats });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Student report card
router.get('/report-card/:studentId', async (req, res) => {
  try {
    const { academicYear, examName } = req.query;
    const query = { 'marks.student': req.params.studentId };
    if (academicYear) query.academicYear = academicYear;
    if (examName) query.examName = examName;
    const records = await Marks.find(query).populate('academicYear', 'name gradingSystem');
    const subjects = records.map(r => {
      const studentMark = r.marks.find(m => m.student?.toString() === req.params.studentId);
      return {
        subject: r.subject, examName: r.examName, maxMarks: r.maxMarks,
        marksObtained: studentMark?.marksObtained || 0,
        grade: studentMark?.grade || '',
        isAbsent: studentMark?.isAbsent || false,
      };
    });
    const totalMarks = subjects.reduce((sum, s) => sum + s.marksObtained, 0);
    const totalMax = subjects.reduce((sum, s) => sum + s.maxMarks, 0);
    res.json({ success: true, data: { subjects, totalMarks, totalMax, percentage: totalMax ? ((totalMarks / totalMax) * 100).toFixed(2) : 0 } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Enter marks (staff)
router.post('/', authorize('admin', 'staff'), async (req, res) => {
  try {
    req.body.enteredBy = req.user._id;
    // Auto-grade
    if (req.body.marks) {
      req.body.marks = req.body.marks.map(m => {
        if (m.isAbsent) return { ...m, grade: 'AB' };
        const pct = (m.marksObtained / (req.body.maxMarks || 100)) * 100;
        let grade = 'F';
        if (pct >= 90) grade = 'A+';
        else if (pct >= 75) grade = 'A';
        else if (pct >= 60) grade = 'B+';
        else if (pct >= 50) grade = 'B';
        else if (pct >= 40) grade = 'C';
        else if (pct >= 33) grade = 'D';
        return { ...m, grade };
      });
    }
    const marks = await Marks.create(req.body);
    res.status(201).json({ success: true, data: marks });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Approve marks (admin)
router.put('/:id/approve', authorize('admin'), async (req, res) => {
  try {
    const marks = await Marks.findByIdAndUpdate(req.params.id, { approvalStatus: 'Approved', approvedBy: req.user._id }, { new: true });
    res.json({ success: true, data: marks });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', authorize('admin', 'staff'), async (req, res) => {
  try {
    const marks = await Marks.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: marks });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    await Marks.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
