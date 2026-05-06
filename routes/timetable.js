const router = require('express').Router();
const timetableController = require('../controllers/timetableController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', timetableController.getAllTimetables);
router.get('/my-timetable', timetableController.getMyTimetable);
router.get('/teacher/:teacherId', timetableController.getTeacherTimetable);
router.get('/:id', timetableController.getTimetable);

router.post('/', authorize('admin'), timetableController.createTimetable);
router.put('/:id', authorize('admin'), timetableController.updateTimetable);
router.delete('/:id', authorize('admin'), timetableController.deleteTimetable);

module.exports = router;
