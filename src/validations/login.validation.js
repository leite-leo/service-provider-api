'use strict';

const { z } = require('zod');

const login = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

module.exports = { login };
