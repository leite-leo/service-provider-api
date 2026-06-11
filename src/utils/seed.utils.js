'use strict';

const path = require('path');
const fs = require('fs');
const { sequelize } = require('../models');

async function runSeeders() {
  const seedersDir = path.join(__dirname, '../database/seeders');
  const files = fs.readdirSync(seedersDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  const queryInterface = sequelize.getQueryInterface();

  for (const file of files) {
    console.log(`Running seeder: ${file}`);
    const seeder = require(path.join(seedersDir, file));
    await seeder.up(queryInterface, sequelize.Sequelize);
  }
}

module.exports = { runSeeders };
