const router = require('express').Router();
const staff = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/stats', authorize('admin'), staff.getStaffStats);
router.get('/me', staff.getMyProfile);
router.get('/dashboard', staff.getStaffDashboard);

router.route('/')
  .get(staff.getAllStaff)
  .post(authorize('admin'), staff.createStaff);

router.route('/:id')
  .get(staff.getStaff)
  .put(authorize('admin'), staff.updateStaff)
  .delete(authorize('admin'), staff.deleteStaff);

module.exports = router;
