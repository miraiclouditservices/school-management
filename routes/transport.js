const express = require('express');
const router = express.Router();
const Transport = require('../models/Transport');
const factory = require('../controllers/factory');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(factory.getAll(Transport))
  .post(authorize('admin'), factory.createOne(Transport));

router.route('/:id')
  .get(factory.getOne(Transport))
  .put(authorize('admin'), factory.updateOne(Transport))
  .delete(authorize('admin'), factory.deleteOne(Transport));

module.exports = router;
