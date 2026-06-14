'use strict';

const loginService = require('../services/login.service');

module.exports = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await loginService.signIn(email, password);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  },
};
