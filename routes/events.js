const router = require('express').Router();
const Event = require('../models/Event');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { status, audience, academicYear } = req.query;
    const query = { schoolId: req.user.schoolId };
    if (status) query.status = status;
    if (audience) query.audience = { $in: [audience, 'All'] };
    if (academicYear) query.academicYear = academicYear;
    const data = await Event.find(query).populate('createdBy', 'name').sort({ date: 1 });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const upcoming = await Event.countDocuments({ schoolId, status: 'Upcoming', date: { $gte: new Date() } });
    const ongoing = await Event.countDocuments({ schoolId, status: 'In Progress' });
    const completed = await Event.countDocuments({ schoolId, status: 'Completed' });
    res.json({ success: true, data: { upcoming, ongoing, completed } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', authorize('admin', 'staff'), async (req, res) => {
  try {
    req.body.schoolId = req.user.schoolId;
    req.body.createdBy = req.user._id;
    const event = await Event.create(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', authorize('admin', 'staff'), async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate({ _id: req.params.id, schoolId: req.user.schoolId }, req.body, { new: true });
    if (!event) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: event });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!event) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
