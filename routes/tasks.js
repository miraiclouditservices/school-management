const router = require('express').Router();
const tasks = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(tasks.getAllTasks)
  .post(authorize('admin', 'staff'), tasks.createTask);

router.get('/my-tasks', tasks.getMyTasks);

router.route('/:id')
  .get(tasks.getTask)
  .put(authorize('admin', 'staff'), tasks.updateTask)
  .delete(authorize('admin', 'staff'), tasks.deleteTask);

router.post('/:id/submit', authorize('student'), tasks.submitTask);
router.post('/:taskId/grade/:submissionId', authorize('admin', 'staff'), tasks.gradeSubmission);

module.exports = router;
