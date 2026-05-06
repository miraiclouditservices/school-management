const User = require('../models/User');
const School = require('../models/School');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Register a new school and its admin
// @route   POST /api/auth/register-school
// @access  Public
exports.registerSchool = asyncHandler(async (req, res, next) => {
  const { schoolName, adminName, email, password, phone, address } = req.body;
  
  if (await User.findOne({ email })) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [school] = await School.create([{ name: schoolName, email, phone, address }], { session });
    const [newUser] = await User.create([{ 
      name: adminName, email, password, role: 'admin', phone, schoolId: school._id 
    }], { session });

    await session.commitTransaction();
    session.endSession();

    const token = newUser.getSignedToken();
    res.status(201).json({ 
      success: true, 
      token, 
      user: { 
        id: newUser._id, name: newUser.name, email: newUser.email, 
        role: newUser.role, schoolId: newUser.schoolId, schoolName: school.name 
      } 
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  // Populate school info
  const user = await User.findOne({ email, isActive: true }).select('+password').populate('schoolId', 'name');
  
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  user.lastLogin = new Date();
  await user.save();

  const token = user.getSignedToken();
  res.json({ 
    success: true, 
    token, 
    user: { 
      id: user._id, 
      name: user.name, 
      email: user.email, 
      role: user.role, 
      schoolId: user.schoolId._id,
      schoolName: user.schoolId.name,
      staffId: user.staffId,
      studentId: user.studentId
    } 
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate('schoolId', 'name');
  res.json({ 
    success: true, 
    user: {
      ...req.user.toObject(),
      schoolName: user.schoolId.name,
      staffId: user.staffId,
      studentId: user.studentId
    } 
  });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');
  
  if (!await user.matchPassword(req.body.currentPassword)) {
    return res.status(400).json({ success: false, message: 'Current password incorrect' });
  }

  user.password = req.body.newPassword;
  await user.save();
  
  res.json({ success: true, message: 'Password updated' });
});
// @desc    Get current school details
// @route   GET /api/auth/school
// @access  Private (Admin)
exports.getSchool = asyncHandler(async (req, res, next) => {
  const school = await School.findById(req.user.schoolId);
  if (!school) return res.status(404).json({ success: false, message: 'School not found' });
  res.json({ success: true, data: school });
});

// @desc    Update school details
// @route   PUT /api/auth/school
// @access  Private (Admin)
exports.updateSchool = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Unauthorized' });

  const school = await School.findByIdAndUpdate(req.user.schoolId, req.body, {
    new: true,
    runValidators: true
  });
  
  res.json({ success: true, data: school });
});

// @desc    Update user profile
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.user.id, {
    name: req.body.name,
    phone: req.body.phone
  }, { new: true, runValidators: true });
  
  res.json({ success: true, data: user });
});
