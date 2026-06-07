const Sentry = require('./instrument'); // MUST be the first require
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./src/config/app.config');
const errorMiddleware = require('./src/middlewares/error.middleware');

const app = express();

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/*
 * Sentry's Express error handler must come BEFORE the application
 * error middleware so that the exception is captured with full request
 * context before our middleware formats the JSON response.
 */
Sentry.setupExpressErrorHandler(app);
app.use(errorMiddleware);

app.listen(config.app.port, () => {
  console.log(`Server listening on port ${config.app.port}`);
});
