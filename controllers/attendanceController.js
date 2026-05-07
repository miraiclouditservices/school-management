const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const AcademicYear = require('../models/AcademicYear');
const factory = require('./factory');

exports.getAllAttendance = factory.getAll(Attendance);
exports.getAttendance = factory.getOne(Attendance);
exports.deleteAttendance = factory.deleteOne(Attendance);

exports.markAttendance = async (req, res) => {
  try {
    const { attendanceType, className, section, date, records } = req.body;
    
    // 1. Get current active academic year for Students
    if (attendanceType === 'Student' && !req.body.academicYear) {
      const ay = await AcademicYear.findOne({ schoolId: req.user.schoolId, status: 'Active' });
      if (ay) req.body.academicYear = ay._id;
    }

    // 2. Attach marking info
    req.body.schoolId = req.user.schoolId;
    req.body.markedBy = req.user.id;
    req.body.markedByName = req.user.name;
    req.body.markedByRole = req.user.role;
    
    // 3. Define query for checking duplicates - Normalize date to start of day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const query = { 
      schoolId: req.user.schoolId, 
      attendanceType,
      date: normalizedDate
    };

    if (attendanceType === 'Student') {
      query.className = className;
      query.section = section;
    }

    // 4. Update or Create
    let attendance = await Attendance.findOne(query);

    if (attendance) {
      attendance.records = records;
      attendance.markedBy = req.user.id;
      attendance.markedByName = req.user.name;
      attendance.markedByRole = req.user.role;
      if (req.body.academicYear) attendance.academicYear = req.body.academicYear;
      await attendance.save();
    } else {
      req.body.date = normalizedDate;
      attendance = await Attendance.create(req.body);
    }

    res.status(200).json({ success: true, data: attendance });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getAttendanceSummary = async (req, res) => {
  try {
    const { attendanceType, className, section, date } = req.query;
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      schoolId: req.user.schoolId,
      attendanceType: attendanceType || 'Student',
      date: { $gte: startOfDay, $lte: endOfDay }
    };

    if (query.attendanceType === 'Student') {
      query.className = className;
      query.section = section;
    }

    const attendance = await Attendance.findOne(query)
      .populate('records.student', 'firstName lastName admissionNo rollNo')
      .populate('records.staff', 'name staffId designation');

    if (!attendance) {
      return res.json({ 
        success: true, 
        data: { total: 0, present: 0, absent: 0, late: 0, leave: 0, halfDay: 0, percentage: 0, records: [] } 
      });
    }

    const stats = attendance.records.reduce((acc, rec) => {
      acc.total++;
      if (rec.status === 'Present') acc.present++;
      else if (rec.status === 'Absent') acc.absent++;
      else if (rec.status === 'Late') acc.late++;
      else if (rec.status === 'Leave') acc.leave++;
      else if (rec.status === 'Half Day') acc.halfDay++;
      return acc;
    }, { total: 0, present: 0, absent: 0, late: 0, leave: 0, halfDay: 0 });

    stats.percentage = stats.total > 0 ? ((stats.present + stats.late + (stats.halfDay * 0.5)) / stats.total * 100).toFixed(2) : 0;
    stats.records = attendance.records;
    stats.markedBy = { name: attendance.markedByName, role: attendance.markedByRole, time: attendance.updatedAt };

    res.json({ success: true, data: stats });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getStudentAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({
      schoolId: req.user.schoolId,
      attendanceType: 'Student',
      'records.student': req.params.studentId
    }).sort('-date');
    
    res.json({ success: true, data: records });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getMyAttendance = async (req, res) => {
  try {
    let targetId = req.user.studentId || req.user.staffId;
    let type = req.user.role === 'student' ? 'Student' : 'Staff';
    
    if (!targetId) {
       if (req.user.role === 'student') {
          const s = await Student.findOne({ userId: req.user.id });
          if (s) targetId = s._id;
       } else if (req.user.role === 'staff') {
          const s = await Staff.findOne({ userId: req.user.id });
          if (s) targetId = s._id;
       }
    }

    if (!targetId) return res.status(404).json({ success: false, message: 'Profile record not found' });

    const records = await Attendance.find({
      schoolId: req.user.schoolId,
      attendanceType: type,
      $or: [
        { 'records.student': targetId },
        { 'records.staff': targetId }
      ]
    }).sort('-date');
    
    const transformed = records.map(rec => {
      const myRec = rec.records.find(r => (r.student || r.staff)?.toString() === targetId.toString());
      return {
        date: rec.date,
        status: myRec?.status,
        remarks: myRec?.remarks,
        markedByName: rec.markedByName
      };
    });

    res.json({ success: true, data: transformed });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
