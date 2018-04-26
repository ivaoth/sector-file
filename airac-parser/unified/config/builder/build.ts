import { resolve } from 'path';
import { Database } from 'sqlite3';

import { buildAirportConfig } from './airport';
import { buildAirwayConfig } from './airway';

const dbPath = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'little_navmap_navigraph.sqlite'
);

const db = new Database(dbPath);

console.log('> Bulding configuration files...');
const main = async () => {
  console.log('>> Building airport configuration file...');
  await buildAirportConfig(db);
  console.log('<< Done building airport configuration file');

  console.log('>> Building airway configuration file...');
  await buildAirwayConfig(db);
  console.log('<< Done building airway configuration file');
};

main().then(() => {
  console.log('< Done building configuration files');
});
