'use strict';

const express = require('express');
const controller = require('../controllers/vehicle.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/requireRole.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validations/vehicle.validation');

const router = express.Router();

router.use(authMiddleware);

/**
 * @openapi
 * /vehicles:
 *   get:
 *     summary: List vehicles with optional filters
 *     tags: [Vehicles]
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
 *           enum: [active, inactive]
 *       - in: query
 *         name: vehicleType
 *         schema:
 *           type: string
 *           enum: [car, van, truck, motorcycle]
 *       - in: query
 *         name: providerId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Paginated list of vehicles
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
 */
router.get('/',                                            validate(schemas.list),       controller.list);
/**
 * @openapi
 * /vehicles:
 *   post:
 *     summary: Add a vehicle for the authenticated provider
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vin, licensePlate, make, model, vehicleType, year]
 *             properties:
 *               vin:
 *                 type: string
 *                 minLength: 17
 *                 maxLength: 17
 *               licensePlate:
 *                 type: string
 *                 minLength: 4
 *                 maxLength: 10
 *               make: { type: string }
 *               model: { type: string }
 *               vehicleType:
 *                 type: string
 *                 enum: [car, van, truck, motorcycle]
 *               year: { type: integer }
 *     responses:
 *       '201':
 *         description: Vehicle created
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
 *         description: VIN or license plate already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/',               requireRole('provider'),    validate(schemas.create),     controller.create);
/**
 * @openapi
 * /vehicles/{id}:
 *   get:
 *     summary: Get a vehicle by ID
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Vehicle object
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
 *         description: Caller cannot view this vehicle
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
router.get('/:id',                                         validate(schemas.show),       controller.show);
/**
 * @openapi
 * /vehicles/{id}:
 *   patch:
 *     summary: Update a vehicle's details
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               vin: { type: string, minLength: 17, maxLength: 17 }
 *               licensePlate: { type: string, minLength: 4, maxLength: 10 }
 *               make: { type: string }
 *               model: { type: string }
 *               vehicleType:
 *                 type: string
 *                 enum: [car, van, truck, motorcycle]
 *               year: { type: integer }
 *     responses:
 *       '200':
 *         description: Vehicle updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       '400':
 *         description: Validation error or no fields provided
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
router.patch('/:id',           requireRole('provider'),    validate(schemas.update),     controller.update);
/**
 * @openapi
 * /vehicles/{id}/deactivate:
 *   post:
 *     summary: Deactivate a vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Vehicle deactivated
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
 *       '404':
 *         description: Vehicle not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/deactivate', requireRole('provider'),    validate(schemas.deactivate), controller.deactivate);

module.exports = router;
