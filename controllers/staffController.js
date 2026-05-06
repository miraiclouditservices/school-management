const Staff = require('../models/Staff');
const User = require('../models/User');
const factory = require('./factory');
const asyncHandler = require('../middleware/asyncHandler');
const Timetable = require('../models/Timetable');
const Student = require('../models/Student');
const Notice = require('../models/Notice');
const Task = require('../models/Task');

// @desc    Get all staff with advanced filtering
// @route   GET /api/staff
// @access  Private (Admin)
exports.getAllStaff = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, sort = '-createdAt', search, department, status } = req.query;
  
  // Build query
  const queryObj = { $or: [{ schoolId: req.user.schoolId }, { schoolId: { $exists: false } }] };
  if (department) queryObj.department = department;
  if (status) queryObj.status = status;

  // Handle Search across multiple fields
  if (search) {
    queryObj.$or = [
      { name: { $regex: search, $options: 'i' } },
      { staffId: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await Staff.countDocuments(queryObj);
  const data = await Staff.find(queryObj)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data
  });
});

exports.getStaff = asyncHandler(async (req, res, next) => {
  // Data Isolation: Only Admin or the Staff member themselves can view this profile
  const isSelf = req.user.staffId?.toString() === req.params.id?.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isAdmin && !isSelf) {
     return res.status(403).json({ success: false, message: 'Access Denied: You can only view your own profile.' });
  }

  const staff = await Staff.findById(req.params.id).populate('userId');
  if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

  // Dynamically attach Timetable (teaching periods across all classes)
  const ttData = await Timetable.find({ 'periods.teacher': req.params.id });
  const teacherPeriods = [];
  ttData.forEach(tt => {
    tt.periods.filter(p => p.teacher?.toString() === req.params.id).forEach(p => {
      teacherPeriods.push({ ...p.toObject(), className: tt.className, section: tt.section });
    });
  });

  res.json({ success: true, data: { ...staff.toObject(), timetable: teacherPeriods } });
});

exports.getMyProfile = asyncHandler(async (req, res, next) => {
  if (!req.user.staffId) {
    return res.status(400).json({ success: false, message: 'User is not a staff member' });
  }
  req.params.id = req.user.staffId;
  return exports.getStaff(req, res, next);
});

exports.getStaffDashboard = asyncHandler(async (req, res, next) => {
  if (!req.user.staffId) {
    return res.status(400).json({ success: false, message: 'User is not a staff member' });
  }

  const sId = req.user.schoolId;
  const staffId = req.user.staffId;

  // 1. Get Today's Classes
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const ttData = await Timetable.find({ 
    schoolId: sId,
    'periods.day': today,
    'periods.teacher': staffId 
  });
  
  const todayClasses = [];
  ttData.forEach(tt => {
    tt.periods.filter(p => p.day === today && p.teacher?.toString() === staffId.toString()).forEach(p => {
      todayClasses.push({ ...p.toObject(), className: tt.className, section: tt.section });
    });
  });

  // 2. Stats
  const [totalStudents, pendingTasks, notices] = await Promise.all([
    Student.countDocuments({ schoolId: sId, status: 'Active' }), // Global for now, could be class-teacher specific
    Task.countDocuments({ schoolId: sId, assignedBy: staffId, status: 'Active' }),
    Notice.find({ schoolId: sId, $or: [{ target: 'All' }, { target: 'Staff' }] }).sort('-createdAt').limit(3)
  ]);

  res.json({ 
    success: true, 
    data: { 
      todayClasses: todayClasses.sort((a,b) => a.periodNo - b.periodNo), 
      stats: { totalStudents, pendingTasks },
      notices
    } 
  });
});

exports.updateStaff = factory.updateOne(Staff);
exports.deleteStaff = factory.deleteOne(Staff);

// @desc    Create new staff and optionally their login
// @route   POST /api/staff
// @access  Private (Admin)
exports.createStaff = asyncHandler(async (req, res, next) => {
  req.body.schoolId = req.user.schoolId;
  const staff = await Staff.create(req.body);
  
  if (req.body.createLogin && req.body.username && req.body.password) {
    const user = await User.create({ 
      name: staff.name, 
      email: req.body.username, 
      password: req.body.password, 
      role: 'staff', 
      staffId: staff._id, 
      phone: staff.phone,
      schoolId: req.user.schoolId
    });
    staff.userId = user._id;
    await staff.save();
  }
  res.status(201).json({ success: true, data: staff });
});

// @desc    Get staff statistics
// @route   GET /api/staff/stats
// @access  Private (Admin)
exports.getStaffStats = asyncHandler(async (req, res, next) => {
  const sId = req.user.schoolId;
  const [total, teaching, active, onLeave] = await Promise.all([
    Staff.countDocuments({ schoolId: sId }),
    Staff.countDocuments({ schoolId: sId, department: 'Teaching' }),
    Staff.countDocuments({ schoolId: sId, status: 'Active' }),
    Staff.countDocuments({ schoolId: sId, status: 'On Leave' }),
  ]);
  const deptWise = await Staff.aggregate([
    { $match: { schoolId: sId } },
    { $group: { _id: '$department', count: { $sum: 1 } } }
  ]);
  res.json({ success: true, data: { total, teaching, active, onLeave, deptWise } });
});
