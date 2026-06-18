'use strict';

const complianceService = require('../services/compliance.service');

module.exports = {
  async compute(req, res, next) {
    try {
      const { id } = req.params;
      const result = await complianceService.compute(id, req.user);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  },
};
