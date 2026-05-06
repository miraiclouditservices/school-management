const router = require('express').Router();
const Notice = require('../models/Notice');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { category, audience, priority, academicYear } = req.query;
    const query = { schoolId: req.user.schoolId, isActive: true };
    if (category) query.category = category;
    if (audience) query.audience = { $in: [audience, 'All'] };
    if (priority) query.priority = priority;
    if (academicYear) query.academicYear = academicYear;
    const data = await Notice.find(query).populate('publishedBy', 'name').sort({ publishedOn: -1 });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const total = await Notice.countDocuments({ schoolId, isActive: true });
    const byCategory = await Notice.aggregate([
      { $match: { schoolId: require('mongoose').Types.ObjectId(schoolId), isActive: true } }, 
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    res.json({ success: true, data: { total, byCategory } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', authorize('admin', 'staff'), async (req, res) => {
  try {
    req.body.schoolId = req.user.schoolId;
    req.body.publishedBy = req.user._id;
    const notice = await Notice.create(req.body);
    res.status(201).json({ success: true, data: notice });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', authorize('admin', 'staff'), async (req, res) => {
  try {
    const notice = await Notice.findOneAndUpdate({ _id: req.params.id, schoolId: req.user.schoolId }, req.body, { new: true });
    if (!notice) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: notice });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const notice = await Notice.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!notice) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
