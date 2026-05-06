const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { getUploader } = require('../config/cloudinary');

router.use(protect);

const uploader = getUploader();

// Single image upload
router.post('/image', uploader.image.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const url = req.file.path || req.file.location || `/uploads/${req.file.filename}`;
    res.json({ success: true, data: { url, filename: req.file.originalname } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Document upload
router.post('/document', uploader.document.single('document'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const url = req.file.path || req.file.location || `/uploads/${req.file.filename}`;
    res.json({ success: true, data: { url, filename: req.file.originalname } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Multiple images
router.post('/images', uploader.image.array('images', 5), (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files uploaded' });
    const urls = req.files.map(f => ({ url: f.path || f.location || `/uploads/${f.filename}`, filename: f.originalname }));
    res.json({ success: true, data: urls });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
