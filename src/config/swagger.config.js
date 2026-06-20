'use strict';

const swaggerJsdoc = require('swagger-jsdoc');
const { version } = require('../../package.json');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Service Provider API',
      version,
      description: 'API for managing outsourced service providers, employees, vehicles, and compliance documents.',
    },
    servers: [
      {
        url: 'https://service-provider-api-wvmh.onrender.com',
        description: 'Production',
      },
      {
        url: 'http://localhost:3000',
        description: 'Local development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string' },
                details: { nullable: true },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth' },
      { name: 'Providers' },
      { name: 'Employees' },
      { name: 'Vehicles' },
      { name: 'Documents' },
      { name: 'Compliance' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
