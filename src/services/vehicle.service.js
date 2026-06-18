'use strict';

const { Vehicle, ServiceProvider } = require('../models');
const { NotFoundError, ConflictError, ForbiddenError } = require('../utils/errors.utils');
const documentService = require('./document.service');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const PROVIDER_STATUSES_ALLOWING_MANAGEMENT = ['pending', 'approved'];

async function ensureProviderCanManageVehicles(providerId) {
  const provider = await ServiceProvider.findByPk(providerId);
  if (!provider) throw new NotFoundError('Service provider not found');
  if (!PROVIDER_STATUSES_ALLOWING_MANAGEMENT.includes(provider.status)) {
    throw new ConflictError(
      `Cannot manage vehicles while provider is in ${provider.status} state`,
      'ACTION_BLOCKED',
    );
  }
}

class VehicleService {
  /*
   * Internal helper used by mutation methods (update, deactivate)
   * that need a live Sequelize instance to call .save() on.
   * The public findById returns a plain enriched object instead.
   */
  async _findVehicleRecord(id) {
    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) throw new NotFoundError('Vehicle not found');
    return vehicle;
  }

  async findById(id) {
    const vehicle = await this._findVehicleRecord(id);
    const documents = await documentService.getActiveDocumentsMap('vehicle', vehicle.id);
    return {
      ...vehicle.toJSON(),
      documents,
    };
  }

  async findAll(
    { providerId, status, vehicleType, page = 1, limit = DEFAULT_PAGE_SIZE } = {},
    requestingUser,
  ) {
    const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
    const offset = (page - 1) * safeLimit;

    const where = {};

    if (requestingUser.role === 'admin') {
      if (providerId) where.serviceProviderId = providerId;
    } else {
      where.serviceProviderId = requestingUser.serviceProviderId;
    }

    if (status) where.status = status;
    if (vehicleType) where.vehicleType = vehicleType;

    const { count, rows } = await Vehicle.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: safeLimit,
      offset,
    });

    return {
      data: rows,
      pagination: {
        page,
        limit: safeLimit,
        total: count,
        totalPages: Math.ceil(count / safeLimit),
      },
    };
  }

  async create(data, requestingUser) {
    await ensureProviderCanManageVehicles(requestingUser.serviceProviderId);

    const vehicle = await Vehicle.create({
      ...data,
      serviceProviderId: requestingUser.serviceProviderId,
      status: 'active',
    });

    return vehicle;
  }

  async update(id, data, requestingUser) {
    const vehicle = await this._findVehicleRecord(id);

    if (vehicle.serviceProviderId !== requestingUser.serviceProviderId) {
      throw new ForbiddenError("Cannot update another provider's vehicle");
    }

    await ensureProviderCanManageVehicles(vehicle.serviceProviderId);

    // Apply only provided fields (PATCH semantics; undefined fields are skipped)
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) vehicle[key] = value;
    }
    await vehicle.save();
    return vehicle;
  }

  async deactivate(id, requestingUser) {
    const vehicle = await this._findVehicleRecord(id);

    if (vehicle.serviceProviderId !== requestingUser.serviceProviderId) {
      throw new ForbiddenError("Cannot deactivate another provider's vehicle");
    }

    if (vehicle.status !== 'active') {
      throw new ConflictError(
        `Cannot deactivate a vehicle in ${vehicle.status} state`,
        'ACTION_BLOCKED',
      );
    }

    await ensureProviderCanManageVehicles(vehicle.serviceProviderId);

    vehicle.status = 'inactive';
    await vehicle.save();
    return vehicle;
  }
}

module.exports = new VehicleService();
