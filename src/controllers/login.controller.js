'use strict';

const { ForbiddenError } = require('../utils/errors.utils');
const loginService = require('../services/login.service');

/*
 * Restrict login to specific allowed emails. Without this safeguard
 * the endpoint could be used as a credential stuffing oracle against
 * arbitrary emails in the Firebase project. In production this would
 * be replaced by rate limiting and CAPTCHA.
 */
const ALLOWED_LOGIN_EMAILS = ['admin@admin.com'];

module.exports = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!ALLOWED_LOGIN_EMAILS.includes(email)) {
        throw new ForbiddenError('Email not authorized to log in');
      }

      const result = await loginService.signIn(email, password);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  },
};
