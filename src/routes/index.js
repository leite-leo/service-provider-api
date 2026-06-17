'use strict';

const express = require('express');
const loginRoutes = require('./login.routes');
const serviceProviderRoutes = require('./serviceProvider.routes');
const employeeRoutes = require('./employee.routes');
const vehicleRoutes = require('./vehicle.routes');
const documentRoutes = require('./document.routes');

const router = express.Router();

router.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
router.use('/login', loginRoutes);
router.use('/providers', serviceProviderRoutes);
router.use('/employees', employeeRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/', documentRoutes);

module.exports = router;
