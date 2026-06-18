'use strict';

const express = require('express');
const controller = require('../controllers/document.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/requireRole.middleware');
const validateUploadQuery = require('../middlewares/validateUploadQuery.middleware');
const setUploadContext = require('../middlewares/setUploadContext.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/providers/:providerId/documents', requireRole('provider'), validateUploadQuery, setUploadContext, uploadMiddleware, controller.uploadProviderDocument);
router.post('/employees/:employeeId/documents', requireRole('provider'), validateUploadQuery, setUploadContext, uploadMiddleware, controller.uploadEmployeeDocument);
router.post('/vehicles/:vehicleId/documents',   requireRole('provider'), validateUploadQuery, setUploadContext, uploadMiddleware, controller.uploadVehicleDocument);

router.get('/providers/:providerId/documents', controller.listProviderDocuments);
router.get('/employees/:employeeId/documents', controller.listEmployeeDocuments);
router.get('/vehicles/:vehicleId/documents',   controller.listVehicleDocuments);
router.get('/documents/:id',                   controller.showDocument);

module.exports = router;
