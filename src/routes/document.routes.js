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

/**
 * @openapi
 * /providers/{providerId}/documents:
 *   post:
 *     summary: Upload a document for a provider (tax_id)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: documentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [tax_id]
 *       - in: query
 *         name: issuedAt
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: expiresAt
 *         schema: { type: string, format: date }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '201':
 *         description: Document uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       '400':
 *         description: Validation error or unsupported file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Caller is not a provider user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Provider not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/providers/:providerId/documents', requireRole('provider'), validateUploadQuery, setUploadContext, uploadMiddleware, controller.uploadProviderDocument);
/**
 * @openapi
 * /employees/{employeeId}/documents:
 *   post:
 *     summary: Upload a document for an employee
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: documentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [government_id, driver_license, employment_contract]
 *       - in: query
 *         name: issuedAt
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: expiresAt
 *         description: Required for driver_license
 *         schema: { type: string, format: date }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '201':
 *         description: Document uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       '400':
 *         description: Validation error or unsupported file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Caller is not a provider user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/employees/:employeeId/documents', requireRole('provider'), validateUploadQuery, setUploadContext, uploadMiddleware, controller.uploadEmployeeDocument);
/**
 * @openapi
 * /vehicles/{vehicleId}/documents:
 *   post:
 *     summary: Upload a document for a vehicle (vehicle_registration)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: documentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [vehicle_registration]
 *       - in: query
 *         name: issuedAt
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: expiresAt
 *         required: true
 *         description: Required for vehicle_registration
 *         schema: { type: string, format: date }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '201':
 *         description: Document uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       '400':
 *         description: Validation error or unsupported file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Caller is not a provider user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Vehicle not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/vehicles/:vehicleId/documents',   requireRole('provider'), validateUploadQuery, setUploadContext, uploadMiddleware, controller.uploadVehicleDocument);

/**
 * @openapi
 * /providers/{providerId}/documents:
 *   get:
 *     summary: List documents for a provider
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: documentType
 *         schema: { type: string, enum: [tax_id] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, expired, archived] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       '200':
 *         description: List of provider documents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { type: object }
 *                 pagination:
 *                   type: object
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Caller cannot view this provider's documents
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Provider not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/providers/:providerId/documents', controller.listProviderDocuments);
/**
 * @openapi
 * /employees/{employeeId}/documents:
 *   get:
 *     summary: List documents for an employee
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: documentType
 *         schema:
 *           type: string
 *           enum: [government_id, driver_license, employment_contract]
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, expired, archived] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       '200':
 *         description: List of employee documents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { type: object }
 *                 pagination:
 *                   type: object
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Caller cannot view this employee's documents
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/employees/:employeeId/documents', controller.listEmployeeDocuments);
/**
 * @openapi
 * /vehicles/{vehicleId}/documents:
 *   get:
 *     summary: List documents for a vehicle
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: documentType
 *         schema: { type: string, enum: [vehicle_registration] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, expired, archived] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       '200':
 *         description: List of vehicle documents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { type: object }
 *                 pagination:
 *                   type: object
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Caller cannot view this vehicle's documents
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Vehicle not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/vehicles/:vehicleId/documents',   controller.listVehicleDocuments);
/**
 * @openapi
 * /documents/{id}:
 *   get:
 *     summary: Get a document by ID including a pre-signed download URL
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Document object with fileUrl
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Caller cannot view this document
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/documents/:id',                   controller.showDocument);

module.exports = router;
