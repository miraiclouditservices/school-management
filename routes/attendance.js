const router = require('express').Router();
const attendance = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(attendance.getAllAttendance)
  .post(authorize('admin', 'staff'), attendance.markAttendance);

router.get('/my-attendance', attendance.getMyAttendance);
router.get('/summary', attendance.getAttendanceSummary);
router.get('/student/:studentId', attendance.getStudentAttendance);

router.route('/:id')
  .get(attendance.getAttendance)
  .delete(authorize('admin'), attendance.deleteAttendance);

module.exports = router;
