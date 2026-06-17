'use strict';

const { z } = require('zod');

const DOCUMENT_TYPES_BY_OWNER = {
  provider: ['tax_id'],
  employee: ['government_id', 'driver_license', 'employment_contract'],
  vehicle: ['vehicle_registration'],
};

const EXPIRY_REQUIRED_TYPES = new Set(['driver_license', 'vehicle_registration']);

const upload = z
  .object({
    documentType: z.enum([
      'tax_id',
      'government_id',
      'driver_license',
      'employment_contract',
      'vehicle_registration',
    ]),
    ownerType: z.enum(['provider', 'employee', 'vehicle']),
    issuedAt:  z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (EXPIRY_REQUIRED_TYPES.has(data.documentType) && !data.expiresAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expiresAt'],
        message: `expiresAt is required for ${data.documentType} documents`,
      });
    }
  })
  .superRefine((data, ctx) => {
    const allowed = DOCUMENT_TYPES_BY_OWNER[data.ownerType];
    if (!allowed.includes(data.documentType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documentType'],
        message: `document type '${data.documentType}' cannot be uploaded under /${data.ownerType}s endpoint`,
      });
    }
  });

module.exports = { upload };
