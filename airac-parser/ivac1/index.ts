import { open } from 'sqlite';
import { Database } from 'sqlite3';
import { resolve } from 'path';
import { extractAirports } from './airport';
import { extractAirways } from './airway';
import { extractAreas } from './area';
import { extractFir } from './fir';
import { extractNDB } from './ndb';
import { extractSID } from './sid';
import { extractSTAR } from './star';
import { extractVORs } from './vor';
import { outputFileSync, removeSync } from 'fs-extra';
import SQL from 'sql-template-strings';
import { extractWaypoints } from './waypoint';

(async (): Promise<void> => {
  const basePath = resolve(__dirname);
  const buildPath = resolve(basePath, 'build');

  console.log('Cleaning build directory...');

  removeSync(buildPath);

  const dbPath = resolve(__dirname, '..', 'little_navmap_navigraph.sqlite');
  console.log('Opening database...');
  const db = open({
    filename: dbPath,
    driver: Database
  });
  console.log('Reading aerodromes...');

  const buildAptPath = resolve(buildPath, '05-AIRPORT');
  const buildRwyPath = resolve(buildPath, '06-RUNWAY');

  const airportsResult = extractAirports(db);

  outputFileSync(
    resolve(buildAptPath, '02-AIRPORT.txt'),
    (await airportsResult).airportOut
  );
  outputFileSync(
    resolve(buildRwyPath, '02-RUNWAY.txt'),
    (await airportsResult).runwayOut
  );

  console.log('Reading airways...');

  const airwaysResult = extractAirways(db);

  outputFileSync(
    resolve(buildPath, '09-HI_AIRWAY.txt'),
    (await airwaysResult).hiAirwayOut
  );
  outputFileSync(
    resolve(buildPath, '10-LO_AIRWAY.txt'),
    (await airwaysResult).lowAirwayOut
  );

  console.log('Reading areas...');

  const buildGeoPath = resolve(basePath, 'build', '14-GEO');
  const buildLowArtccPath = resolve(basePath, 'build', '13-ARTCC_LO');

  const areasResult = extractAreas(db);

  outputFileSync(
    resolve(buildGeoPath, '04-DRP_AREA.txt'),
    (await areasResult).drpOut
  );
  outputFileSync(
    resolve(buildLowArtccPath, '02-TMA_CTR.txt'),
    (await areasResult).tmaOut
  );

  console.log('Reading FIRs...');

  const firs: [string, string][] = [
    ['VTBB', 'Bangkok'],
    ['VDPP', 'Phnom Penh'],
    ['VLVT', 'Vientiane'],
    ['VVTS', 'Ho Chi Minh'],
    ['VYYY', 'Yangon'],
    ['WMFC', 'Kuala Lumpur'],
    ['WSJC', 'Singapore']
  ];
  const buildARTCCPath = resolve(basePath, 'build', '11-ARTCC');

  let num = 2;
  for (const fir of firs) {
    const [code, name] = fir;
    const firResult = extractFir(db, name, code);
    outputFileSync(
      resolve(buildARTCCPath, `${`${num}`.padStart(2, '0')}-${code}_CTR.txt`),
      await firResult
    );
    num += 1;
  }

  console.log('Reading NDBs...');

  const buildNDBPath = resolve(basePath, 'build', '03-NDB');

  const NDBResult = extractNDB(db, (await airwaysResult).extras);

  outputFileSync(
    resolve(buildNDBPath, '02-THAI.txt'),
    (await NDBResult).NDBOut
  );
  outputFileSync(
    resolve(buildNDBPath, '03-NEARBY.txt'),
    (await NDBResult).NDBNearbyOut
  );

  console.log('Preparing airports for SIDs and STARs readings...');

  const allowedSIDandSTARAirportsIdents = [
    'VTBD',
    'VTBS',
    'VTSP',
    'VTPM',
    'VTUD'
  ];
  const airports = (await db).all<{ airport_id: number; ident: string }[]>(SQL`
    SELECT
      airport_id, ident
    FROM
      airport
    WHERE
      region = 'VT'
  `);
  const SIDandSTARAirports = (await airports).filter((airport) => {
    return (
      allowedSIDandSTARAirportsIdents.length === 0 ||
      allowedSIDandSTARAirportsIdents.indexOf(airport.ident) !== -1
    );
  });

  console.log('Reading SIDs...');

  const buildSidPath = resolve(buildPath, '07-SID');
  num = 2;
  for (const airport of SIDandSTARAirports) {
    const SIDResult = extractSID(db, airport);
    if ((await SIDResult) !== '') {
      outputFileSync(
        resolve(
          buildSidPath,
          `${`${num}`.padStart(3, '0')}-${airport.ident}.txt`
        ),
        await SIDResult
      );
      num += 1;
    }
  }

  console.log('Reading STAR...');

  const buildStarPath = resolve(buildPath, '08-STAR');

  num = 2;
  for (const airport of SIDandSTARAirports) {
    const STARResult = extractSTAR(db, airport);
    if ((await STARResult) !== '') {
      outputFileSync(
        resolve(
          buildStarPath,
          `${`${num}`.padStart(3, '0')}-${airport.ident}.txt`
        ),
        await STARResult
      );
      num += 1;
    }
  }

  console.log('Reading VORs...');

  const buildVORsPath = resolve(basePath, 'build', '02-VOR');

  const VORResult = extractVORs(db, (await airwaysResult).extras);

  outputFileSync(
    resolve(buildVORsPath, '02-THAI.txt'),
    (await VORResult).VOROut
  );
  outputFileSync(
    resolve(buildVORsPath, '03-NEARBY.txt'),
    (await VORResult).VORNearbyOut
  );

  console.log('Reading waypoints...');

  const buildWaypointsPath = resolve(basePath, 'build', '04-FIXES');

  const waypointResult = extractWaypoints(db, (await airwaysResult).extras);

  outputFileSync(
    resolve(buildWaypointsPath, '02-THAI.txt'),
    (await waypointResult).waypointsOut
  );
  outputFileSync(
    resolve(buildWaypointsPath, '03-NEARBY.txt'),
    (await waypointResult).waypointsNearbyOut
  );

  console.log('Closing database...');

  await (await db).close();

  console.log('Done!');
})();
