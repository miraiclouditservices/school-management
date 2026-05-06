const router = require('express').Router();
const auth = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

// Public routes
router.post('/register-school', [
  body('schoolName').trim().notEmpty().withMessage('School name is required'),
  body('adminName').trim().notEmpty().withMessage('Principal name is required'),
  body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone number is required'),
], validate, auth.registerSchool);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, auth.login);

// Protected routes
router.use(protect);
router.get('/me', auth.getMe);
router.put('/change-password', [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], validate, auth.changePassword);

router.put('/profile', auth.updateProfile);
router.get('/school', auth.getSchool);
router.put('/school', auth.updateSchool);

module.exports = router;
