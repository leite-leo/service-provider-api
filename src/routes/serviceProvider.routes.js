'use strict';

const express = require('express');
const controller = require('../controllers/serviceProvider.controller');
const complianceController = require('../controllers/compliance.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/requireRole.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validations/serviceProvider.validation');

const router = express.Router();

/**
 * @openapi
 * /providers:
 *   get:
 *     summary: List all providers with optional filters
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, pending_review, approved, inactive]
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           enum: [BR, US, DE, GB, FR]
 *     responses:
 *       '200':
 *         description: Paginated list of providers
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
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Caller is not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authMiddleware, requireRole('admin'), validate(schemas.list), controller.list);
/**
 * @openapi
 * /providers:
 *   post:
 *     summary: Register a new service provider
 *     tags: [Providers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [corporateName, taxId, country, phone, email, address, city, state, postalCode, representativeName, password]
 *             properties:
 *               corporateName: { type: string }
 *               taxId: { type: string }
 *               country:
 *                 type: string
 *                 enum: [BR, US, DE, GB, FR]
 *               phone: { type: string }
 *               email: { type: string, format: email }
 *               address: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               postalCode: { type: string }
 *               representativeName: { type: string }
 *               password: { type: string }
 *     responses:
 *       '201':
 *         description: Provider created — status is pending
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '409':
 *         description: taxId or email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', validate(schemas.create), controller.create);
/**
 * @openapi
 * /providers/me/submit:
 *   post:
 *     summary: Submit the authenticated provider for compliance review
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Provider status changed to pending_review
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
 *         description: Caller is not a provider user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '409':
 *         description: Provider is not in pending status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '422':
 *         description: Provider does not meet compliance requirements
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/me/submit', authMiddleware, requireRole('provider'), validate(schemas.submit), controller.submit);
/**
 * @openapi
 * /providers/{id}:
 *   get:
 *     summary: Get a provider by ID
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Provider object
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
 *         description: Caller cannot view this provider
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
router.get('/:id', authMiddleware, validate(schemas.show), controller.show);
/**
 * @openapi
 * /providers/{id}/approve:
 *   post:
 *     summary: Approve a pending_review provider (gated by compliance)
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Provider approved
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
 *         description: Caller is not an admin
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
 *       '409':
 *         description: Provider is not in pending_review status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '422':
 *         description: Provider does not meet compliance requirements
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/approve', authMiddleware, requireRole('admin'), validate(schemas.approve), controller.approve);
/**
 * @openapi
 * /providers/{id}/reject:
 *   post:
 *     summary: Reject a pending_review provider
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       '200':
 *         description: Provider rejected
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
 *         description: Caller is not an admin
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
 *       '409':
 *         description: Provider is not in pending_review status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/reject', authMiddleware, requireRole('admin'), validate(schemas.reject), controller.reject);
/**
 * @openapi
 * /providers/{id}/deactivate:
 *   post:
 *     summary: Deactivate an approved provider
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Provider deactivated
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
 *         description: Caller is not an admin
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
 *       '409':
 *         description: Provider is not in approved status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/deactivate', authMiddleware, requireRole('admin'), validate(schemas.deactivate), controller.deactivate);
/**
 * @openapi
 * /providers/{id}/compliance:
 *   get:
 *     summary: Compute compliance status for a provider
 *     tags: [Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Compliance result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isCompliant: { type: boolean }
 *                 missingDocuments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ownerType: { type: string }
 *                       ownerId: { type: string }
 *                       documentType: { type: string }
 *                 expired:
 *                   type: array
 *                   items: { type: object }
 *                 expiringSoon:
 *                   type: array
 *                   items: { type: object }
 *       '401':
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Caller cannot view this provider's compliance
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
router.get('/:id/compliance', authMiddleware, validate(schemas.compliance), complianceController.compute);

module.exports = router;
