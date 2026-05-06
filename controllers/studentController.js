const Student = require('../models/Student');
const User = require('../models/User');
const Fee = require('../models/Fee');
const AcademicYear = require('../models/AcademicYear');
const factory = require('./factory');
const asyncHandler = require('../middleware/asyncHandler');
const Timetable = require('../models/Timetable');
const Attendance = require('../models/Attendance');
const Notice = require('../models/Notice');
const Marks = require('../models/Marks');
const Task = require('../models/Task');

exports.getAllStudents = factory.getAll(Student, 'academicYear classTeacher');

exports.getMyProfile = asyncHandler(async (req, res, next) => {
  if (!req.user.studentId) {
    return res.status(400).json({ success: false, message: 'User is not a student' });
  }

  // Re-use getStudent logic by setting req.params.id
  req.params.id = req.user.studentId;
  return exports.getStudent(req, res, next);
});

exports.getStudent = asyncHandler(async (req, res, next) => {
  // Data Isolation: Only Admin or the Student themselves can view this profile
  const isSelf = req.user.studentId?.toString() === req.params.id?.toString();
  const isAdmin = req.user.role === 'admin';
  const isStaff = req.user.role === 'staff';

  if (!isAdmin && !isStaff && !isSelf) {
    return res.status(403).json({ success: false, message: 'Access Denied: You can only view your own profile.' });
  }

  const student = await Student.findById(req.params.id)
    .populate('academicYear', 'name')
    .populate('classTeacher', 'name');

  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  // Dynamically attach Timetable
  const timetable = await Timetable.findOne({
    schoolId: student.schoolId,
    className: student.currentClass,
    section: student.section
  }).populate('periods.teacher', 'name');

  // Attach Fee Status
  const fee = await Fee.findOne({ student: student._id }).sort('-createdAt');

  // Attach Attendance Summary (Current Month)
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
  const attendanceRecords = await Attendance.find({
    schoolId: student.schoolId,
    className: student.currentClass,
    section: student.section,
    records: { $elemMatch: { student: student._id } }
  }).sort('-date');

  const attendanceStats = attendanceRecords.reduce((acc, rec) => {
    const studentRec = rec.records.find(r => r.student.toString() === student._id.toString());
    if (studentRec) {
      acc.total++;
      if (studentRec.status === 'Present' || studentRec.status === 'Late') acc.present++;
    }
    return acc;
  }, { total: 0, present: 0 });

  const attendance = {
    percentage: attendanceStats.total > 0 ? (attendanceStats.present / attendanceStats.total * 100).toFixed(1) : 0,
    totalDays: attendanceStats.total,
    presentDays: attendanceStats.present
  };

  // Attach Recent Notices
  const notices = await Notice.find({
    schoolId: student.schoolId,
    $or: [
      { target: 'All' },
      { target: 'Students' },
      { target: 'Class', targetClass: student.currentClass }
    ]
  }).sort('-createdAt').limit(3);

  // Attach Latest Marks Summary
  const marks = await Marks.find({ 'marks.student': student._id }).sort('-examDate').limit(5);
  const marksSummary = marks.map(m => {
    const studentMark = m.marks.find(sm => sm.student?.toString() === student._id.toString());
    return {
      examName: m.examName,
      subject: m.subject,
      marks: studentMark?.marksObtained || 0,
      maxMarks: m.maxMarks,
      grade: studentMark?.grade || '-'
    };
  });

  // Attach Task Stats
  const relevantTasks = await Task.find({
    schoolId: student.schoolId,
    status: 'Published',
    $or: [
      { targetType: 'Class', className: student.currentClass, section: student.section },
      { targetType: 'Student', targetStudents: student._id }
    ]
  });

  const pendingTasks = relevantTasks.filter(t => 
    !t.submissions.some(s => s.student?.toString() === student._id.toString() && ['Submitted', 'Graded'].includes(s.status))
  ).length;

  res.json({ success: true, data: { ...student.toObject(), timetable, fee, attendance, notices, marksSummary, pendingTasks } });
});

exports.updateStudent = factory.updateOne(Student);
exports.deleteStudent = factory.deleteOne(Student);

// @desc    Create a new student and automatically create their login
// @route   POST /api/students
// @access  Private (Admin/Staff)
exports.createStudent = asyncHandler(async (req, res, next) => {
  req.body.schoolId = req.user.schoolId;
  const student = await Student.create(req.body);

  // 1. Auto-generate credentials
  const username = req.body.username || `${student.admissionNo.toLowerCase()}@school.com`;
  const password = req.body.password || '123456';

  const user = await User.create({
    name: `${student.firstName} ${student.lastName}`,
    email: username,
    password: password,
    role: 'student',
    studentId: student._id,
    schoolId: req.user.schoolId,
    isActive: true
  });

  student.userId = user._id;
  await student.save();

  // 2. Auto-create Fee Record
  try {
    const ay = await AcademicYear.findById(student.academicYear);
    if (ay) {
      const fs = ay.feeStructures.find(f =>
        f.className === student.currentClass &&
        (f.category === student.category || f.category === 'General')
      ) || ay.feeStructures.find(f => f.className === student.currentClass);

      if (fs || req.body.totalFee) {
        const manualFee = Number(req.body.totalFee);
        await Fee.create({
          student: student._id,
          academicYear: ay._id,
          schoolId: req.user.schoolId,
          tuitionFee: manualFee ? manualFee : (fs.tuitionFee || 0),
          totalFee: manualFee || fs.totalFee || 0,
          netFee: manualFee || fs.totalFee || 0,
          balanceDue: manualFee || fs.totalFee || 0,
          dueDate: ay.endDate,
          installments: req.body.installments || []
        });
      }
    }
  } catch (err) {
    console.error('Fee Generation Error:', err.message);
  }

  res.status(201).json({
    success: true,
    data: student,
    credentials: {
      username: username,
      password: password,
      note: 'Please provide these credentials to the student for system access.'
    }
  });
});

// @desc    Provision access for existing student
// @route   POST /api/students/:id/provision-access
// @access  Private (Admin)
exports.provisionStudentAccess = asyncHandler(async (req, res, next) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  // Check if user already exists
  let user = await User.findOne({ studentId: student._id });
  const password = Math.random().toString(36).slice(-8); // Generate random 8-char password

  if (user) {
    user.password = password;
    await user.save();
  } else {
    const username = `${student.admissionNo.toLowerCase()}@school.com`;
    user = await User.create({
      name: `${student.firstName} ${student.lastName}`,
      email: username,
      password: password,
      role: 'student',
      studentId: student._id,
      schoolId: student.schoolId,
      isActive: true
    });
    student.userId = user._id;
    await student.save();
  }

  res.json({
    success: true,
    message: 'Access provisioned successfully',
    credentials: {
      username: user.email,
      password: password
    }
  });
});

// @desc    Promote students to next class/section
// @route   POST /api/students/promote
// @access  Private (Admin)
exports.promoteStudents = asyncHandler(async (req, res, next) => {
  const { fromClass, fromSection, toClass, toSection, academicYear, studentIds } = req.body;
  const query = { schoolId: req.user.schoolId };

  if (studentIds?.length) {
    query._id = { $in: studentIds };
  } else {
    query.currentClass = fromClass;
    query.section = fromSection;
  }

  const result = await Student.updateMany(query, { currentClass: toClass, section: toSection, academicYear });
  res.json({ success: true, message: `${result.modifiedCount} students promoted` });
});
// @desc    Get student statistics
// @route   GET /api/students/stats
// @access  Private (Admin/Staff)
exports.getStudentStats = asyncHandler(async (req, res, next) => {
  const stats = await Student.aggregate([
    { $match: { schoolId: req.user.schoolId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$admissionStatus", "Active"] }, 1, 0] } },
        inactive: { $sum: { $cond: [{ $in: ["$admissionStatus", ["Inactive", "TC Issued", "Passout"]] }, 1, 0] } },
        onboarding: { $sum: { $cond: [{ $gte: ["$createdAt", new Date(new Date().setDate(new Date().getDate() - 30))] }, 1, 0] } }
      }
    }
  ]);

  res.json({
    success: true,
    data: stats[0] || { total: 0, active: 0, inactive: 0, onboarding: 0 }
  });
});
