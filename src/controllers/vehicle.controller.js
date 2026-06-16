'use strict';

const vehicleService = require('../services/vehicle.service');
const { ForbiddenError } = require('../utils/errors.utils');

module.exports = {
  async list(req, res, next) {
    try {
      const { providerId, status, vehicleType, page, limit } = req.query;
      const result = await vehicleService.findAll(
        { providerId, status, vehicleType, page, limit },
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
      const vehicle = await vehicleService.findById(id);

      const isAdmin = req.user.role === 'admin';
      const isOwnVehicle = req.user.serviceProviderId === vehicle.serviceProviderId;
      if (!isAdmin && !isOwnVehicle) {
        throw new ForbiddenError("Cannot view another provider's vehicle");
      }

      return res.status(200).json(vehicle);
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { vin, licensePlate, make, model, vehicleType, year } = req.body;
      const vehicle = await vehicleService.create(
        { vin, licensePlate, make, model, vehicleType, year },
        req.user,
      );
      return res.status(201).json(vehicle);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { vin, licensePlate, make, model, vehicleType, year } = req.body;
      const vehicle = await vehicleService.update(
        id,
        { vin, licensePlate, make, model, vehicleType, year },
        req.user,
      );
      return res.status(200).json(vehicle);
    } catch (error) {
      return next(error);
    }
  },

  async deactivate(req, res, next) {
    try {
      const { id } = req.params;
      const vehicle = await vehicleService.deactivate(id, req.user);
      return res.status(200).json(vehicle);
    } catch (error) {
      return next(error);
    }
  },
};
