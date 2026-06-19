'use strict';

const cron = require('node-cron');
const Sentry = require('@sentry/node');
const { Op } = require('sequelize');
const { Document } = require('../models');

function startDocumentExpirationJob() {
  cron.schedule('0 3 * * *', async () => {
    try {
      const [count] = await Document.update(
        { status: 'expired' },
        {
          where: {
            status: 'active',
            expiresAt: { [Op.ne]: null, [Op.lt]: new Date() },
          },
        },
      );
      console.log(`Document expiration job: ${count} documents marked as expired`);
    } catch (err) {
      console.error('Document expiration job failed:', err);
      Sentry.captureException(err);
    }
  }, { timezone: 'UTC' });

  console.log('Document expiration job scheduled (03:00 UTC daily)');
}

module.exports = startDocumentExpirationJob;
