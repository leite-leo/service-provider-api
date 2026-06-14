'use strict';

const express = require('express');
const controller = require('../controllers/serviceProvider.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/requireRole.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validations/serviceProvider.validation');

const router = express.Router();

router.get('/', authMiddleware, requireRole('admin'), validate(schemas.list), controller.list);
router.post('/', validate(schemas.create), controller.create);
router.post('/me/submit', authMiddleware, requireRole('provider'), validate(schemas.submit), controller.submit);
router.get('/:id', authMiddleware, validate(schemas.show), controller.show);
router.post('/:id/approve', authMiddleware, requireRole('admin'), validate(schemas.approve), controller.approve);
router.post('/:id/reject', authMiddleware, requireRole('admin'), validate(schemas.reject), controller.reject);
router.post('/:id/deactivate', authMiddleware, requireRole('admin'), validate(schemas.deactivate), controller.deactivate);

module.exports = router;
