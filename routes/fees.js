const router = require('express').Router();
const fees = require('../controllers/feeController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(fees.getAllFees)
  .post(authorize('admin'), fees.createFee);

router.get('/summary', fees.getFeeSummary);

router.route('/:id')
  .get(fees.getFee)
  .put(authorize('admin'), fees.updateFee)
  .delete(authorize('admin'), fees.deleteFee);

router.post('/:id/collect', authorize('admin'), fees.collectPayment);

module.exports = router;
