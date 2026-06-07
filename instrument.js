const Sentry = require('@sentry/node');
const config = require('./src/config/config');

/*
 * Sentry is only initialized in production. Dev and test environments
 * never report errors externally, even if a DSN is accidentally present
 * in the environment. The DSN existence check is a defensive guard
 * against deploying without the variable configured.
 */
if (config.app.env === 'production' && config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    tracesSampleRate: 1.0,
  });
  console.log('Sentry initialized for production environment.');
} else {
  console.log('Sentry disabled: not running in production or DSN not set.');
}

module.exports = Sentry;
