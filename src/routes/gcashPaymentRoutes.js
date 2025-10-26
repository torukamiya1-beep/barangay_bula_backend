const express = require('express');
const router = express.Router();
const gcashPaymentController = require('../controllers/gcashPaymentController');
const { uploadGCashProof } = require('../middleware/gcashProofUpload');
const { authenticateClient } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Client routes - require client authentication
router.post(
  '/upload-proof/:requestId',
  authenticateClient,
  uploadGCashProof,
  gcashPaymentController.uploadPaymentProof
);

router.post(
  '/reupload-proof/:requestId',
  authenticateClient,
  uploadGCashProof,
  gcashPaymentController.reuploadPaymentProof
);

router.get(
  '/proof-image/:requestId',
  authenticateClient,
  gcashPaymentController.getPaymentProofImage
);

// Admin routes - require admin authentication
router.post(
  '/verify/:requestId',
  adminAuth,
  gcashPaymentController.verifyPaymentProof
);

router.post(
  '/reject/:requestId',
  adminAuth,
  gcashPaymentController.rejectPaymentProof
);

router.get(
  '/pending-proofs',
  adminAuth,
  gcashPaymentController.getPendingProofs
);

// Admin can also view proof images
router.get(
  '/admin/proof-image/:requestId',
  adminAuth,
  gcashPaymentController.getPaymentProofImage
);

module.exports = router;
