const Sentry = require('./instrument'); // MUST be the first require
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./src/config/config');

const app = express();

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(config.app.port, () => {
  console.log(`Server listening on port ${config.app.port}`);
});
