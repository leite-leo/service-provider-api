'use strict';

const employeeService = require('../services/employee.service');
const { ForbiddenError } = require('../utils/errors.utils');

module.exports = {
  async list(req, res, next) {
    try {
      const { providerId, status, page, limit } = req.query;
      const result = await employeeService.findAll(
        { providerId, status, page, limit },
        req.user,
      );
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  },

  async show(req, res, next) {
    try {
      const { id } = req.params;
      const employee = await employeeService.findById(id);

      const isAdmin = req.user.role === 'admin';
      const isOwnEmployee = req.user.serviceProviderId === employee.serviceProviderId;
      if (!isAdmin && !isOwnEmployee) {
        throw new ForbiddenError("Cannot view another provider's employee");
      }

      return res.status(200).json(employee);
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { name, governmentId, email, phone, role } = req.body;
      const employee = await employeeService.create(
        { name, governmentId, email, phone, role },
        req.user,
      );
      return res.status(201).json(employee);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, governmentId, email, phone, role } = req.body;
      const employee = await employeeService.update(
        id,
        { name, governmentId, email, phone, role },
        req.user,
      );
      return res.status(200).json(employee);
    } catch (error) {
      return next(error);
    }
  },

  async deactivate(req, res, next) {
    try {
      const { id } = req.params;
      const employee = await employeeService.deactivate(id, req.user);
      return res.status(200).json(employee);
    } catch (error) {
      return next(error);
    }
  },
};
