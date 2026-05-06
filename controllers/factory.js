/**
 * Generic Controller Factory for CRUD operations
 * Automatically filters by School ID for multi-tenancy
 */
const asyncHandler = require('../middleware/asyncHandler');

exports.deleteOne = (Model) => asyncHandler(async (req, res, next) => {
  const doc = await Model.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId });
  if (!doc) return res.status(404).json({ success: false, message: 'No document found with that ID' });
  res.status(200).json({ success: true, data: null });
});

exports.updateOne = (Model) => asyncHandler(async (req, res, next) => {
  const doc = await Model.findOneAndUpdate(
    { _id: req.params.id, schoolId: req.user.schoolId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!doc) return res.status(404).json({ success: false, message: 'No document found with that ID' });
  res.status(200).json({ success: true, data: doc });
});

exports.createOne = (Model) => asyncHandler(async (req, res, next) => {
  req.body.schoolId = req.user.schoolId;
  const doc = await Model.create(req.body);
  res.status(201).json({ success: true, data: doc });
});

exports.getOne = (Model, populateOptions) => asyncHandler(async (req, res, next) => {
  let query = Model.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  if (populateOptions) query = query.populate(populateOptions);
  const doc = await query;
  if (!doc) return res.status(404).json({ success: false, message: 'No document found with that ID' });
  res.status(200).json({ success: true, data: doc });
});

exports.getAll = (Model, populateOptions) => asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, sort = '-createdAt', ...filters } = req.query;
  
  // Build query with school isolation + legacy fallback
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
  );
  
  // Hardened query: (schoolId == current OR schoolId does not exist) AND other filters
  const queryObj = { 
    $and: [
      { $or: [{ schoolId: req.user.schoolId }, { schoolId: { $exists: false } }] },
      cleanFilters
    ]
  };
  
  // Remove metadata fields from cleanFilters so they don't interfere with the DB query
  delete cleanFilters.searchFields;
  delete cleanFilters.search;
  
  // Handle search if present
  if (req.query.search && req.query.searchFields) {
    const searchFields = req.query.searchFields.split(',');
    queryObj.$and.push({
      $or: searchFields.map(field => ({
        [field]: { $regex: req.query.search, $options: 'i' }
      }))
    });
  }

  let query = Model.find(queryObj);
  if (populateOptions) query = query.populate(populateOptions);
  
  const total = await Model.countDocuments(queryObj);
  const data = await query.sort(sort).skip((page - 1) * limit).limit(Number(limit));

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data
  });
});
