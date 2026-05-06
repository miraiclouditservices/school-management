const router = require('express').Router();
const Inquiry = require('../models/Inquiry');
const Student = require('../models/Student');
const AcademicYear = require('../models/AcademicYear');
const { ensureAcademicYear } = require('../utils/academicYearUtils');
const { protect, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

router.use(protect);

/**
 * @desc    Get all inquiries (Filtered by School)
 * @route   GET /api/inquiries
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, counselor, search, academicYear, startDate, endDate } = req.query;
    
    // Multi-tenant isolation
    const query = { schoolId: req.user.schoolId };
    
    if (status) query.status = status;
    if (counselor) query.counselor = counselor;
    
    // Robust academicYear handling
    if (academicYear && academicYear !== 'undefined' && academicYear !== 'null' && academicYear !== '') {
      query.academicYear = academicYear;
    }
    if (startDate && endDate) query.dateOfInquiry = { $gte: new Date(startDate), $lte: new Date(endDate) };
    
    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { inquiryId: { $regex: search, $options: 'i' } },
        { parentEmail: { $regex: search, $options: 'i' } },
        { parentMobile: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Inquiry.countDocuments(query);
    const data = await Inquiry.find(query)
      .populate('counselor', 'name')
      .populate('assignedStaff', 'name')
      .populate('academicYear', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
});

/**
 * @desc    Get inquiry statistics (Filtered by School)
 */
router.get('/stats', async (req, res) => {
  try {
    const { academicYear } = req.query;
    const q = { schoolId: req.user.schoolId };
    
    if (academicYear && academicYear !== 'undefined' && academicYear !== 'null' && academicYear !== '') {
      q.academicYear = academicYear;
    }

    const [total, today, converted, lost, pending] = await Promise.all([
      Inquiry.countDocuments(q),
      Inquiry.countDocuments({ ...q, createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
      Inquiry.countDocuments({ ...q, status: 'Converted' }),
      Inquiry.countDocuments({ ...q, status: 'Lost' }),
      Inquiry.countDocuments({ ...q, status: { $in: ['New', 'Follow-up'] }, nextFollowUpDate: { $lte: new Date() } }),
    ]);

    res.json({ success: true, data: { total, today, converted, lost, pendingFollowUps: pending } });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
});

router.get('/:id', async (req, res) => {
  try {
    const inq = await Inquiry.findOne({ _id: req.params.id, schoolId: req.user.schoolId }).populate('counselor assignedStaff academicYear');
    if (!inq) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: inq });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', authorize('admin', 'staff'), [
  body('studentName').trim().notEmpty().isLength({ max: 200 }),
  body('parentMobile').trim().notEmpty().isLength({ max: 15 }),
], validate, async (req, res) => {
  try {
    req.body.schoolId = req.user.schoolId;

    // AUTO-ASSIGN ACADEMIC YEAR IF MISSING (Dynamic handling)
    req.body.academicYear = await ensureAcademicYear(req.body, req.user.schoolId);

    const inq = await Inquiry.create(req.body);
    res.status(201).json({ success: true, data: inq });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', authorize('admin', 'staff'), async (req, res) => {
  try {
    const inq = await Inquiry.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!inq) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    res.json({ success: true, data: inq });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/**
 * @desc    Convert Inquiry to Student (Hardened)
 */
router.post('/:id/convert', authorize('admin'), async (req, res) => {
  try {
    const inq = await Inquiry.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!inq) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    
    // Create Student
    const student = await Student.create({
      schoolId: req.user.schoolId,
      academicYear: inq.academicYear,
      firstName: inq.studentName.split(' ')[0],
      lastName: inq.studentName.split(' ').slice(1).join(' ') || '.',
      dateOfBirth: inq.dateOfBirth || new Date(),
      gender: inq.gender || 'Male',
      currentClass: inq.classSeeking,
      section: 'A',
      previousSchool: inq.previousSchool,
      father: { name: inq.fatherName, mobile: inq.parentMobile, email: inq.parentEmail },
      mother: { name: inq.motherName },
      address: { street: inq.address },
      feeDetails: inq.feeDetails,
      transportRoute: inq.transportRoute,
      transport: { required: !!inq.transportRoute },
      admissionStatus: 'Active'
    });

    // Update Inquiry
    inq.status = 'Converted';
    inq.convertedToAdmission = true;
    inq.admissionId = student._id;
    await inq.save();

    res.json({ success: true, data: { inquiry: inq, student } });
  } catch (err) { 
    console.error('Conversion Failed:', err.message);
    res.status(500).json({ success: false, message: `Conversion failed: ${err.message}` }); 
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const inq = await Inquiry.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!inq) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
