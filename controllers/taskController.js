const Task = require('../models/Task');
const factory = require('./factory');

exports.getAllTasks = factory.getAll(Task, 'assignedBy');
exports.getTask = factory.getOne(Task, 'assignedBy submissions.student');

exports.createTask = async (req, res) => {
  try {
    req.body.schoolId = req.user.schoolId;
    // req.user contains staffId for staff roles
    req.body.assignedBy = req.user.staffId || req.user.id; 
    
    const task = await Task.create(req.body);
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateTask = factory.updateOne(Task);
exports.deleteTask = factory.deleteOne(Task);

exports.submitTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const submission = {
      student: req.user.studentId, // Ensure req.user has studentId
      content: req.body.content,
      submittedAt: new Date(),
      status: 'Submitted'
    };

    task.submissions.push(submission);
    await task.save();

    res.json({ success: true, data: task });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.gradeSubmission = async (req, res) => {
  try {
    const { taskId, submissionId } = req.params;
    const { grade, feedback } = req.body;
    
    const task = await Task.findOneAndUpdate(
      { _id: taskId, 'submissions._id': submissionId, schoolId: req.user.schoolId },
      { 
        $set: { 
          'submissions.$.grade': grade, 
          'submissions.$.feedback': feedback,
          'submissions.$.status': 'Graded'
        } 
      },
      { new: true }
    );

    res.json({ success: true, data: task });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// @desc    Get tasks for logged in student
// @route   GET /api/tasks/my-tasks
// @access  Private (Student)
exports.getMyTasks = async (req, res) => {
  try {
    const Student = require('../models/Student');
    const student = await Student.findById(req.user.studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });

    const tasks = await Task.find({
      schoolId: req.user.schoolId,
      status: 'Published',
      $or: [
        { targetType: 'Class', className: student.currentClass, section: student.section },
        { targetType: 'Student', targetStudents: student._id }
      ]
    }).populate('assignedBy', 'name photo').populate('targetStudents', 'firstName lastName');

    // Attach student's submission status for each task
    const tasksWithStatus = tasks.map(t => {
      const sub = t.submissions.find(s => s.student?.toString() === student._id.toString());
      return {
        ...t.toObject(),
        mySubmission: sub || null,
        isSubmitted: !!sub
      };
    });

    res.json({ success: true, data: tasksWithStatus });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
