'use strict';

const { z } = require('zod');

const SUPPORTED_COUNTRIES = ['BR', 'US', 'DE', 'GB', 'FR'];

const providerParams = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const paginationQuery = z.object({
  query: z.object({
    page:    z.coerce.number().int().min(1).optional(),
    limit:   z.coerce.number().int().min(1).max(100).optional(),
    status:  z.enum(['pending', 'pending_review', 'approved', 'inactive']).optional(),
    country: z.enum(SUPPORTED_COUNTRIES).optional(),
  }),
});

const list       = paginationQuery;
const show       = providerParams;
const approve    = providerParams;
const deactivate = providerParams;

const create = z.object({
  body: z.object({
    corporateName:      z.string().min(1),
    taxId:              z.string().min(1),
    country:            z.enum(SUPPORTED_COUNTRIES),
    phone:              z.string().min(1),
    email:              z.string().email(),
    address:            z.string().min(1),
    city:               z.string().min(1),
    state:              z.string().min(1),
    postalCode:         z.string().min(1),
    representativeName: z.string().min(1),
    password:           z.string().min(1),
  }),
});

const submit = z.object({});

const reject = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    reason: z.string().optional(),
  }),
});

module.exports = { list, show, create, approve, deactivate, submit, reject };
