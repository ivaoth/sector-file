import { resolve } from 'path';
import { removeSync, outputFileSync } from 'fs-extra';
import { open } from 'sqlite';
import { Database } from 'sqlite3';
import { extractAerodromes } from './airport';
import { extractAirways } from './airway';
import { extractAreas } from './area';
import { extractFirs } from './fir';
import { extractNdbs } from './ndb';
import { extractVors } from './vor';
import { extractWaypoints } from './waypoint';

(async () => {
  const basePath = resolve(__dirname);
  const buildPath = resolve(basePath, 'build');

  console.log('Cleaning build directory...');

  removeSync(buildPath);

  const dbPath = resolve(basePath, '..', 'little_navmap_navigraph.sqlite');

  console.log('Opening database...');

  const db = open({
    filename: dbPath,
    driver: Database
  });

  console.log('Reading aerodromes...');

  const buildAptFile = resolve(buildPath, 'airports.json');

  const aerodromes = extractAerodromes(db);

  outputFileSync(buildAptFile, JSON.stringify(await aerodromes, null, 2));

  console.log('Reading airways');

  const buildAirwayFile = resolve(buildPath, 'airways.json');

  const { data: airways, extras: extrasFromAirways } = await extractAirways(db);

  outputFileSync(buildAirwayFile, JSON.stringify(airways, null, 2));

  console.log('Reading areas...');

  const buildAreaFile = resolve(buildPath, 'areas.json');

  const areas = extractAreas(db);

  outputFileSync(buildAreaFile, JSON.stringify(await areas, null, 2));

  console.log('Reading FIRs...');

  const buildFirFile = resolve(buildPath, 'firs.json');

  const firs = extractFirs(db);

  outputFileSync(buildFirFile, JSON.stringify(await firs, null, 2));

  console.log('Reading NDBs...');

  const buildNdbFile = resolve(buildPath, 'ndbs.json');

  const ndbs = extractNdbs(db, extrasFromAirways);

  outputFileSync(buildNdbFile, JSON.stringify(await ndbs, null, 2));

  console.log('Reading VORs...');

  const buildVorFile = resolve(buildPath, 'vors.json');

  const vors = extractVors(db, extrasFromAirways);

  outputFileSync(buildVorFile, JSON.stringify(await vors, null, 2));

  console.log('Reading waypoints...');

  const buildWaypointFile = resolve(buildPath, 'waypoints.json');

  const waypoints = extractWaypoints(db, extrasFromAirways);

  outputFileSync(buildWaypointFile, JSON.stringify(await waypoints, null, 2));

  console.log('Closing database...');

  await (await db).close();

  console.log('Done!');
})();
