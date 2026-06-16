'use strict';

const { z } = require('zod');

const CURRENT_YEAR = new Date().getFullYear();
const MAX_YEAR = CURRENT_YEAR + 1;
const VEHICLE_TYPES = ['car', 'van', 'truck', 'motorcycle'];

const vehicleParams = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const paginationQuery = z.object({
  query: z.object({
    page:        z.coerce.number().int().min(1).optional(),
    limit:       z.coerce.number().int().min(1).max(100).optional(),
    status:      z.enum(['active', 'inactive']).optional(),
    vehicleType: z.enum(VEHICLE_TYPES).optional(),
    providerId:  z.string().uuid().optional(),
  }),
});

const list       = paginationQuery;
const show       = vehicleParams;
const deactivate = vehicleParams;

const create = z.object({
  body: z.object({
    vin:          z.string().length(17),
    licensePlate: z.string().min(4).max(10),
    make:         z.string().min(1),
    model:        z.string().min(1),
    vehicleType:  z.enum(VEHICLE_TYPES),
    year:         z.coerce.number().int().min(1900).max(MAX_YEAR),
  }),
});

const update = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    vin:          z.string().length(17).optional(),
    licensePlate: z.string().min(4).max(10).optional(),
    make:         z.string().min(1).optional(),
    model:        z.string().min(1).optional(),
    vehicleType:  z.enum(VEHICLE_TYPES).optional(),
    year:         z.coerce.number().int().min(1900).max(MAX_YEAR).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided' },
  ),
});

module.exports = { list, show, create, update, deactivate };
