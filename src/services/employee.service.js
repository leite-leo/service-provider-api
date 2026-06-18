'use strict';

const { Employee, ServiceProvider } = require('../models');
const { NotFoundError, ConflictError, ForbiddenError } = require('../utils/errors.utils');
const documentService = require('./document.service');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const PROVIDER_STATUSES_ALLOWING_MANAGEMENT = ['pending', 'approved'];

async function ensureProviderCanManageEmployees(providerId) {
  const provider = await ServiceProvider.findByPk(providerId);
  if (!provider) throw new NotFoundError('Service provider not found');
  if (!PROVIDER_STATUSES_ALLOWING_MANAGEMENT.includes(provider.status)) {
    throw new ConflictError(
      `Cannot manage employees while provider is in ${provider.status} state`,
      'ACTION_BLOCKED',
    );
  }
}

class EmployeeService {
  /*
   * Internal helper used by mutation methods (update, deactivate)
   * that need a live Sequelize instance to call .save() on.
   * The public findById returns a plain enriched object instead.
   */
  async _findEmployeeRecord(id) {
    const employee = await Employee.findByPk(id);
    if (!employee) throw new NotFoundError('Employee not found');
    return employee;
  }

  async findById(id) {
    const employee = await this._findEmployeeRecord(id);
    const documents = await documentService.getActiveDocumentsMap('employee', employee.id);
    return {
      ...employee.toJSON(),
      documents,
    };
  }

  async findAll(
    { providerId, status, page = 1, limit = DEFAULT_PAGE_SIZE } = {},
    requestingUser,
  ) {
    const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
    const offset = (page - 1) * safeLimit;

    const where = {};

    if (requestingUser.role === 'admin') {
      if (providerId) where.serviceProviderId = providerId;
    } else {
      // Provider role: implicit scope to own provider, ignore providerId from query
      where.serviceProviderId = requestingUser.serviceProviderId;
    }

    if (status) where.status = status;

    const { count, rows } = await Employee.findAndCountAll({
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
    await ensureProviderCanManageEmployees(requestingUser.serviceProviderId);

    const employee = await Employee.create({
      ...data,
      serviceProviderId: requestingUser.serviceProviderId,
      status: 'active',
    });

    return employee;
  }

  async update(id, data, requestingUser) {
    const employee = await this._findEmployeeRecord(id);

    if (employee.serviceProviderId !== requestingUser.serviceProviderId) {
      throw new ForbiddenError("Cannot update another provider's employee");
    }

    await ensureProviderCanManageEmployees(employee.serviceProviderId);

    // Apply only provided fields (PATCH semantics; undefined fields are skipped)
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) employee[key] = value;
    }
    await employee.save();
    return employee;
  }

  async deactivate(id, requestingUser) {
    const employee = await this._findEmployeeRecord(id);

    if (employee.serviceProviderId !== requestingUser.serviceProviderId) {
      throw new ForbiddenError("Cannot deactivate another provider's employee");
    }

    if (employee.status !== 'active') {
      throw new ConflictError(
        `Cannot deactivate an employee in ${employee.status} state`,
        'ACTION_BLOCKED',
      );
    }

    await ensureProviderCanManageEmployees(employee.serviceProviderId);

    employee.status = 'inactive';
    await employee.save();
    return employee;
  }
}

module.exports = new EmployeeService();
