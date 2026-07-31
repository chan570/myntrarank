import express from 'express';
import v1Router from './api.v1.js';

const router = express.Router();

// Mount Version 1 APIs
router.use('/v1', v1Router);

// Maintain Legacy Routing (Backward Compatibility)
router.use('/', v1Router);

export default router;