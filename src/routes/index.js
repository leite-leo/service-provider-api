'use strict';

const express = require('express');
const serviceProviderRoutes = require('./serviceProvider.routes');

const router = express.Router();

router.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
router.use('/providers', serviceProviderRoutes);

module.exports = router;
