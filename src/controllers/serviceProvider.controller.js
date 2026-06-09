'use strict';

const serviceProviderService = require('../services/serviceProvider.service');

module.exports = {
  async list(req, res, next) {
    try {
      const { status, country, page, limit } = req.query;
      const result = await serviceProviderService.findAll({ status, country, page, limit });
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  },

  async show(req, res, next) {
    try {
      const { id } = req.params;
      const provider = await serviceProviderService.findById(id);
      return res.status(200).json(provider);
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { corporateName, taxId, country, phone, email, address,
        city, state, postalCode, representativeName } = req.body;
      const result = await serviceProviderService.create(
        { corporateName, taxId, country, phone, email, address,
          city, state, postalCode, representativeName },
        req.user.id,
      );
      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  },

  async approve(req, res, next) {
    try {
      const { id } = req.params;
      const provider = await serviceProviderService.approve(id, req.user.id);
      return res.status(200).json(provider);
    } catch (error) {
      return next(error);
    }
  },

  async deactivate(req, res, next) {
    try {
      const { id } = req.params;
      const provider = await serviceProviderService.deactivate(id, req.user.id);
      return res.status(200).json(provider);
    } catch (error) {
      return next(error);
    }
  },

  async regenerateInvite(req, res, next) {
    try {
      const { id } = req.params;
      const result = await serviceProviderService.regenerateInvite(id);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  },
};
