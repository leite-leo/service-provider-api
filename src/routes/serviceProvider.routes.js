'use strict';

const express = require('express');
const controller = require('../controllers/serviceProvider.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/requireRole.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validations/serviceProvider.validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/',    requireRole('admin'), validate(schemas.list),            controller.list);
router.get('/:id',                       validate(schemas.show),            controller.show);
router.post('/',   requireRole('admin'), validate(schemas.create),          controller.create);
router.post('/:id/approve',           requireRole('admin'), validate(schemas.approve),          controller.approve);
router.post('/:id/deactivate',        requireRole('admin'), validate(schemas.deactivate),       controller.deactivate);
router.post('/:id/regenerate-invite', requireRole('admin'), validate(schemas.regenerateInvite), controller.regenerateInvite);

module.exports = router;
