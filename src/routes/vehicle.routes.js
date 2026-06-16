'use strict';

const express = require('express');
const controller = require('../controllers/vehicle.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/requireRole.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validations/vehicle.validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/',                                            validate(schemas.list),       controller.list);
router.post('/',               requireRole('provider'),    validate(schemas.create),     controller.create);
router.get('/:id',                                         validate(schemas.show),       controller.show);
router.patch('/:id',           requireRole('provider'),    validate(schemas.update),     controller.update);
router.post('/:id/deactivate', requireRole('provider'),    validate(schemas.deactivate), controller.deactivate);

module.exports = router;
