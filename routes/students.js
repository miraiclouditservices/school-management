const router = require('express').Router();
const students = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/me', students.getMyProfile);
router.get('/stats', students.getStudentStats);

router.route('/')
  .get(students.getAllStudents)
  .post(authorize('admin'), students.createStudent);

router.post('/:id/provision-access', authorize('admin'), students.provisionStudentAccess);

router.post('/promote', authorize('admin'), students.promoteStudents);

router.route('/:id')
  .get(students.getStudent)
  .put(authorize('admin', 'staff'), students.updateStudent)
  .delete(authorize('admin'), students.deleteStudent);

module.exports = router;
