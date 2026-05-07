const User = require('../models/User');
const School = require('../models/School');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const { sendOTP } = require('../utils/email');

// @desc    Register a new school and its admin (Step 1)
// @route   POST /api/auth/register-school
// @access  Public
exports.registerSchool = asyncHandler(async (req, res, next) => {
  const { schoolName, adminName, email, password, phone, address } = req.body;
  
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    if (existingUser.isVerified) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    } else {
      // Cleanup unverified account to allow re-registration
      await School.findByIdAndDelete(existingUser.schoolId);
      await User.findByIdAndDelete(existingUser._id);
    }
  }

  // Also cleanup any orphaned school record with this email
  await School.findOneAndDelete({ email });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [school] = await School.create([{ name: schoolName, email, phone, address }], { session });
    
    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const [newUser] = await User.create([{ 
      name: adminName, 
      email, 
      password, 
      role: 'admin', 
      phone, 
      schoolId: school._id,
      isActive: false,
      isVerified: false,
      otp,
      otpExpires
    }], { session });

    // Send OTP via Brevo
    await sendOTP(email, adminName, otp, schoolName);

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ 
      success: true, 
      message: 'OTP sent to your email. Please verify to activate your account.',
      email 
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// @desc    Verify OTP (Step 2)
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).populate('schoolId', 'name');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.isVerified) {
    return res.status(400).json({ success: false, message: 'Account already verified' });
  }

  if (user.otp !== otp || user.otpExpires < Date.now()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }

  // Activate account
  user.isVerified = true;
  user.isActive = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  const token = user.getSignedToken();

  res.json({ 
    success: true, 
    message: 'Account verified successfully!',
    token, 
    user: { 
      id: user._id, 
      name: user.name, 
      email: user.email, 
      role: user.role, 
      schoolId: user.schoolId._id,
      schoolName: user.schoolId.name 
    } 
  });
});

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email }).populate('schoolId', 'name');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.isVerified) {
    return res.status(400).json({ success: false, message: 'Account already verified' });
  }

  // Generate new 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  await user.save();

  // Send OTP via Brevo
  await sendOTP(email, user.name, otp, user.schoolId?.name);

  res.json({ success: true, message: 'New OTP sent to your email.' });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  const user = await User.findOne({ email }).select('+password').populate('schoolId', 'name');
  
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (!user.isVerified) {
    return res.status(401).json({ 
      success: false, 
      message: 'Account not verified. Please verify your OTP.',
      requiresVerification: true,
      email: user.email
    });
  }

  if (!user.isActive) {
    return res.status(401).json({ success: false, message: 'Account is deactivated' });
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
      schoolName: user.schoolId?.name,
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

  const { email, phone, address, website, tagline, logo } = req.body;
  
  const school = await School.findByIdAndUpdate(req.user.schoolId, {
    email, phone, address, website, tagline, logo
  }, {
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
