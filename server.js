const Sentry = require('./instrument'); // MUST be the first require
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./src/config/app.config');
const routes = require('./src/routes');
const errorMiddleware = require('./src/middlewares/error.middleware');
const { runPendingMigrations } = require('./src/utils/migrate.utils');
const { runSeeders } = require('./src/utils/seed.utils');
const { NotFoundError } = require('./src/utils/errors.utils');

const app = express();

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(routes);

// 404 handler for unmatched routes — must come AFTER all route definitions
// and BEFORE error handlers so unmatched paths return our JSON format
// instead of Express's default HTML response.
app.use((req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});

/*
 * Sentry's Express error handler must come BEFORE the application
 * error middleware so that the exception is captured with full request
 * context before our middleware formats the JSON response.
 */
Sentry.setupExpressErrorHandler(app);
app.use(errorMiddleware);

async function bootstrap() {
  if (config.app.env === 'production') {
    console.log('Running pending migrations...');
    await runPendingMigrations();

    console.log('Running seeders...');
    await runSeeders();
  }

  app.listen(config.app.port, () => {
    console.log(`Server listening on port ${config.app.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});
