const Timetable = require('../models/Timetable');
const factory = require('./factory');
const asyncHandler = require('../middleware/asyncHandler');
const Student = require('../models/Student');

exports.getAllTimetables = asyncHandler(async (req, res) => {
  const { className, section, academicYear, teacher } = req.query;
  const query = { schoolId: req.user.schoolId };
  
  if (className) query.className = className;
  if (section) query.section = section;
  if (academicYear) query.academicYear = academicYear;
  if (teacher) query['periods.teacher'] = teacher;

  const data = await Timetable.find(query)
    .populate('academicYear', 'name')
    .populate('classTeacher', 'name')
    .populate('periods.teacher', 'name')
    .sort({ effectiveFrom: -1 });

  res.json({ success: true, data });
});

exports.getMyTimetable = asyncHandler(async (req, res) => {
  if (!req.user.studentId) {
    return res.status(400).json({ success: false, message: 'User is not a student' });
  }

  const student = await Student.findById(req.user.studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });

  const timetable = await Timetable.findOne({
    schoolId: req.user.schoolId,
    className: student.currentClass,
    section: student.section
  }).populate('academicYear', 'name')
    .populate('classTeacher', 'name')
    .populate('periods.teacher', 'name');

  res.json({ success: true, data: timetable });
});

exports.getTeacherTimetable = asyncHandler(async (req, res) => {
  const data = await Timetable.find({ 
    schoolId: req.user.schoolId,
    'periods.teacher': req.params.teacherId 
  })
    .populate('academicYear', 'name')
    .populate('periods.teacher', 'name');

  const teacherPeriods = [];
  data.forEach(tt => {
    tt.periods.filter(p => p.teacher?._id?.toString() === req.params.teacherId || p.teacher?.toString() === req.params.teacherId).forEach(p => {
      teacherPeriods.push({ ...p.toObject(), className: tt.className, section: tt.section });
    });
  });

  res.json({ success: true, data: teacherPeriods, timetables: data });
});

const checkConflicts = async (periods, academicYear, schoolId, excludeId = null) => {
  for (const period of periods) {
    if (period.isBreak) continue;

    const query = {
      schoolId,
      academicYear,
      periods: {
        $elemMatch: {
          day: period.day,
          periodNo: period.periodNo,
          $or: [
            { teacher: period.teacher },
            { room: period.room }
          ]
        }
      }
    };

    if (excludeId) query._id = { $ne: excludeId };

    const conflict = await Timetable.findOne(query);
    if (conflict) {
      const conflictPeriod = conflict.periods.find(p => p.day === period.day && p.periodNo === period.periodNo);
      if (conflictPeriod.teacher?.toString() === period.teacher?.toString()) {
        throw new Error(`Teacher conflict: Teacher is already assigned to ${conflict.className}-${conflict.section} on ${period.day} Period ${period.periodNo}`);
      }
      if (conflictPeriod.room === period.room && period.room) {
        throw new Error(`Room conflict: Room ${period.room} is already occupied by ${conflict.className}-${conflict.section} on ${period.day} Period ${period.periodNo}`);
      }
    }
  }
};

exports.createTimetable = asyncHandler(async (req, res) => {
  const { periods, academicYear } = req.body;
  req.body.schoolId = req.user.schoolId;
  req.body.generatedBy = req.user._id;

  await checkConflicts(periods, academicYear, req.user.schoolId);
  
  const tt = await Timetable.create(req.body);
  res.status(201).json({ success: true, data: tt });
});

exports.updateTimetable = asyncHandler(async (req, res) => {
  const { periods, academicYear } = req.body;
  req.body.schoolId = req.user.schoolId; // Ensure it stays with the correct school

  if (periods) await checkConflicts(periods, academicYear, req.user.schoolId, req.params.id);

  const tt = await Timetable.findOneAndUpdate(
    { _id: req.params.id, schoolId: req.user.schoolId },
    req.body, 
    { new: true, runValidators: true }
  );

  if (!tt) return res.status(404).json({ success: false, message: 'Timetable not found' });
  res.json({ success: true, data: tt });
});

exports.getTimetable = factory.getOne(Timetable, 'academicYear classTeacher periods.teacher');
exports.deleteTimetable = factory.deleteOne(Timetable);
