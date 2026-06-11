'use strict';

const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const { sequelize } = require('../models');

async function runPendingMigrations() {
  const umzug = new Umzug({
    migrations: {
      glob: path.join(__dirname, '../database/migrations/*.js'),
      resolve: ({ name, path: filepath, context }) => {
        const migration = require(filepath);
        return {
          name,
          up: async () => migration.up(context, sequelize.Sequelize),
          down: async () => migration.down(context, sequelize.Sequelize),
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  });

  await umzug.up();
}

module.exports = { runPendingMigrations };
