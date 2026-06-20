'use strict';

const express = require('express');
const controller = require('../controllers/employee.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/requireRole.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validations/employee.validation');

const router = express.Router();

router.use(authMiddleware);

/**
 * @openapi
 * /employees:
 *   get:
 *     summary: List employees with optional filters
 *     tags: [Employees]
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
 *         name: providerId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Paginated list of employees
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
 * /employees:
 *   post:
 *     summary: Create an employee for the authenticated provider
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, governmentId, email, phone, role]
 *             properties:
 *               name: { type: string }
 *               governmentId: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               role: { type: string }
 *     responses:
 *       '201':
 *         description: Employee created
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
 *         description: governmentId or email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/',               requireRole('provider'),    validate(schemas.create),     controller.create);
/**
 * @openapi
 * /employees/{id}:
 *   get:
 *     summary: Get an employee by ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Employee object
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
 *         description: Caller cannot view this employee
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
router.get('/:id',                                         validate(schemas.show),       controller.show);
/**
 * @openapi
 * /employees/{id}:
 *   patch:
 *     summary: Update an employee's details
 *     tags: [Employees]
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
 *               name: { type: string }
 *               governmentId: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               role: { type: string }
 *     responses:
 *       '200':
 *         description: Employee updated
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
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id',           requireRole('provider'),    validate(schemas.update),     controller.update);
/**
 * @openapi
 * /employees/{id}/deactivate:
 *   post:
 *     summary: Deactivate an employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Employee deactivated
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
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/deactivate', requireRole('provider'),    validate(schemas.deactivate), controller.deactivate);

module.exports = router;
