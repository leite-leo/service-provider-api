'use strict';

const express = require('express');
const loginRoutes = require('./login.routes');
const serviceProviderRoutes = require('./serviceProvider.routes');
const employeeRoutes = require('./employee.routes');

const router = express.Router();

router.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
router.use('/login', loginRoutes);
router.use('/providers', serviceProviderRoutes);
router.use('/employees', employeeRoutes);

module.exports = router;
