'use strict';

const express = require('express');
const controller = require('../controllers/login.controller');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validations/login.validation');

const router = express.Router();

router.post('/', validate(schemas.login), controller.login);

module.exports = router;
