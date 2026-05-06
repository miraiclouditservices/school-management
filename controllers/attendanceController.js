const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const AcademicYear = require('../models/AcademicYear');
const factory = require('./factory');

exports.getAllAttendance = factory.getAll(Attendance);
exports.getAttendance = factory.getOne(Attendance);
exports.deleteAttendance = factory.deleteOne(Attendance);

exports.markAttendance = async (req, res) => {
  try {
    const { className, section, date, records } = req.body;
    
    // 1. Get current active academic year if not provided
    if (!req.body.academicYear) {
      const ay = await AcademicYear.findOne({ schoolId: req.user.schoolId, status: 'Active' });
      if (!ay) return res.status(400).json({ success: false, message: 'No active academic year found' });
      req.body.academicYear = ay._id;
    }

    req.body.schoolId = req.user.schoolId;
    
    // Check if attendance already marked for this day/class/section
    let attendance = await Attendance.findOne({ 
      schoolId: req.user.schoolId, 
      className, 
      section, 
      date: new Date(date) 
    });

    if (attendance) {
      attendance.records = records;
      attendance.academicYear = req.body.academicYear;
      await attendance.save();
    } else {
      attendance = await Attendance.create(req.body);
    }

    res.status(200).json({ success: true, data: attendance });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getStudentAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({
      schoolId: req.user.schoolId,
      'records.student': req.params.studentId
    }).sort('-date');
    
    res.json({ success: true, data: records });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getMyAttendance = async (req, res) => {
  try {
    let studentId = req.user.studentId;
    
    // Fallback: If studentId is not on user object, find it from Student collection
    if (!studentId) {
      const student = await Student.findOne({ userId: req.user.id });
      if (student) studentId = student._id;
    }

    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student record not found for this user' });
    }

    const records = await Attendance.find({
      schoolId: req.user.schoolId,
      records: { $elemMatch: { student: studentId } }
    }).sort('-date');
    
    // Transform records to only include this student's status for the UI
    const transformed = records.map(rec => {
      const myRec = rec.records.find(r => r.student.toString() === studentId.toString());
      return {
        date: rec.date,
        status: myRec?.status,
        remarks: myRec?.remarks,
        type: rec.type
      };
    });

    res.json({ success: true, data: transformed });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getAttendanceSummary = async (req, res) => {
  try {
    const { className, section, date } = req.query;
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      schoolId: req.user.schoolId,
      className,
      section,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('records.student', 'firstName lastName admissionNo rollNo');

    if (!attendance) {
      return res.json({ 
        success: true, 
        data: { total: 0, present: 0, absent: 0, late: 0, leave: 0, percentage: 0, records: [] } 
      });
    }

    const stats = attendance.records.reduce((acc, rec) => {
      acc.total++;
      if (rec.status === 'Present') acc.present++;
      else if (rec.status === 'Absent') acc.absent++;
      else if (rec.status === 'Late') acc.late++;
      else if (rec.status === 'Leave') acc.leave++;
      return acc;
    }, { total: 0, present: 0, absent: 0, late: 0, leave: 0 });

    stats.percentage = stats.total > 0 ? ((stats.present + stats.late) / stats.total * 100).toFixed(2) : 0;
    stats.records = attendance.records;

    res.json({ success: true, data: stats });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
