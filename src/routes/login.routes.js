'use strict';

const express = require('express');
const controller = require('../controllers/login.controller');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validations/login.validation');

const router = express.Router();

/**
 * @openapi
 * /login:
 *   post:
 *     summary: Sign in and obtain a Firebase ID token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 idToken:
 *                   type: string
 *                 expiresIn:
 *                   type: string
 *       '401':
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Email not registered as a local user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', validate(schemas.login), controller.login);

module.exports = router;
