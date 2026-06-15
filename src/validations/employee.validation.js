'use strict';

const { z } = require('zod');

const employeeParams = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const paginationQuery = z.object({
  query: z.object({
    page:       z.coerce.number().int().min(1).optional(),
    limit:      z.coerce.number().int().min(1).max(100).optional(),
    status:     z.enum(['active', 'inactive']).optional(),
    providerId: z.string().uuid().optional(),
  }),
});

const list       = paginationQuery;
const show       = employeeParams;
const deactivate = employeeParams;

const create = z.object({
  body: z.object({
    name:         z.string().min(1),
    governmentId: z.string().min(1),
    email:        z.string().email(),
    phone:        z.string().min(1),
    role:         z.string().min(1),
  }),
});

const update = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name:         z.string().min(1).optional(),
    governmentId: z.string().min(1).optional(),
    email:        z.string().email().optional(),
    phone:        z.string().min(1).optional(),
    role:         z.string().min(1).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided' },
  ),
});

module.exports = { list, show, create, update, deactivate };
