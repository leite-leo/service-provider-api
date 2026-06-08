'use strict';

const { ServiceProvider } = require('../models');
const { NotFoundError } = require('../utils/errors.utils');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

class ServiceProviderService {
  async findById(id) {
    const provider = await ServiceProvider.findByPk(id);
    if (!provider) throw new NotFoundError('Service provider not found');
    return provider;
  }

  async findAll({ status, country, page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
    const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
    const offset = (page - 1) * safeLimit;

    const where = {};
    if (status) where.status = status;
    if (country) where.country = country;

    const { count, rows } = await ServiceProvider.findAndCountAll({
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
        total_pages: Math.ceil(count / safeLimit),
      },
    };
  }
}

module.exports = new ServiceProviderService();
