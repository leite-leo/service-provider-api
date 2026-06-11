const Sentry = require('./instrument'); // MUST be the first require
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./src/config/app.config');
const routes = require('./src/routes');
const errorMiddleware = require('./src/middlewares/error.middleware');
const { runPendingMigrations } = require('./src/utils/migrate.utils');

const app = express();

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(routes);

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
  }

  app.listen(config.app.port, () => {
    console.log(`Server listening on port ${config.app.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});
