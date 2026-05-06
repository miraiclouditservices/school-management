const router = require('express').Router();
const AcademicYear = require('../models/AcademicYear');
const { ensureAcademicYear } = require('../utils/academicYearUtils');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Get all academic years
router.get('/', async (req, res) => {
  try {
    let years = await AcademicYear.find({ schoolId: req.user.schoolId }).sort({ startDate: -1 });
    
    // Auto-initialize if empty
    if (years.length === 0) {
      await ensureAcademicYear({}, req.user.schoolId);
      years = await AcademicYear.find({ schoolId: req.user.schoolId }).sort({ startDate: -1 });
    }
    
    res.json({ success: true, data: years });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Get current academic year
router.get('/current', async (req, res) => {
  try {
    const year = await AcademicYear.findOne({ schoolId: req.user.schoolId, isCurrent: true });
    res.json({ success: true, data: year });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Alias /active for /current
router.get('/active', async (req, res) => {
  try {
    const year = await AcademicYear.findOne({ schoolId: req.user.schoolId, isCurrent: true });
    res.json({ success: true, data: year });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Create
router.post('/', authorize('admin'), async (req, res) => {
  try {
    req.body.schoolId = req.user.schoolId;
    if (req.body.isCurrent) await AcademicYear.updateMany({ schoolId: req.user.schoolId }, { isCurrent: false });
    // Default classes: LKG, UKG, 1-12
    if (!req.body.classes || req.body.classes.length === 0) {
      req.body.classes = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(c => ({
        name: c, sections: ['A', 'B'], subjects: [], maxStrength: 40,
      }));
    }
    if (!req.body.gradingSystem || req.body.gradingSystem.length === 0) {
      req.body.gradingSystem = [
        { minMarks: 90, maxMarks: 100, grade: 'A+', gradePoint: 10, remarks: 'Outstanding' },
        { minMarks: 75, maxMarks: 89, grade: 'A', gradePoint: 9, remarks: 'Excellent' },
        { minMarks: 60, maxMarks: 74, grade: 'B+', gradePoint: 8, remarks: 'Good' },
        { minMarks: 50, maxMarks: 59, grade: 'B', gradePoint: 7, remarks: 'Above Average' },
        { minMarks: 40, maxMarks: 49, grade: 'C', gradePoint: 6, remarks: 'Average' },
        { minMarks: 33, maxMarks: 39, grade: 'D', gradePoint: 5, remarks: 'Below Average' },
        { minMarks: 0, maxMarks: 32, grade: 'F', gradePoint: 0, remarks: 'Fail' },
      ];
    }
    const year = await AcademicYear.create(req.body);
    res.status(201).json({ success: true, data: year });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Update
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    if (req.body.isCurrent) await AcademicYear.updateMany({ schoolId: req.user.schoolId, _id: { $ne: req.params.id } }, { isCurrent: false });
    const year = await AcademicYear.findOneAndUpdate({ _id: req.params.id, schoolId: req.user.schoolId }, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: year });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Delete
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    await AcademicYear.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
