import * as sqlite3 from 'sqlite3';
import { resolve } from 'path';
import { Coordinate, convertCoordinate, convertPoint } from './latlon';
import { writeFileSync, ensureDirSync } from 'fs-extra';

const basePath = resolve(__dirname);
const buildPath = resolve(basePath, 'build');
const buildAptPath = resolve(buildPath, '05-AIRPORT');
const buildRwyPath = resolve(buildPath, '06-RUNWAY');

ensureDirSync(buildAptPath);
ensureDirSync(buildRwyPath);

const db = new sqlite3.Database(
  resolve(basePath, '..' , 'little_navmap_navigraph.sqlite')
);

const query = (db: sqlite3.Database, queryStr: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(queryStr, (err, rows) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const main = async () => {
  let out = '';
  let outRwy = '';
  const zeroPadder = '0000000';
  const spacePadder = '       ';
  const data: {
    airport_id: number;
    ident: string;
    name: string;
    tower_frequency: number | null;
    lonx: number;
    laty: number;
    mag_var: number;
  }[] = await query(
    db,
    `SELECT
  airport_id, ident, name, tower_frequency, lonx, laty, mag_var
  FROM
  airport
  where
  ident LIKE 'VY%'
  AND
  country = 'PAC'`
  );
  for (let airport of data) {
    out += airport.ident;
    out += ' ';
    if (airport.tower_frequency) {
      const num1 = Math.floor(airport.tower_frequency / 1000);
      const num2 = airport.tower_frequency % 1000;
      out += `${num1}.${(num2 + zeroPadder).substr(0, 3)} `;
    } else {
      out += '.       ';
    }
    out += convertPoint([airport.laty, airport.lonx], true);
    out += ` C ;- ${airport.name}`;
    out += '\n';
    outRwy += `;- ${airport.ident}\n`
    const runways: {
      name1: string;
      hdg1: number;
      lat1: number;
      lon1: number;
      name2: string;
      hdg2: number;
      lat2: number;
      lon2: number;
    }[] = await query(
      db,
      `SELECT
      RE1.name as name1, RE1.heading as hdg1, RE1.laty as lat1, RE1.lonx as lon1, RE2.name as name2, RE2.heading as hdg2, RE2.laty as lat2, RE2.lonx as lon2
      FROM
      runway R
      INNER JOIN
      runway_end RE1
      ON
      R.primary_end_id = RE1.runway_end_id
      INNER JOIN
      runway_end RE2
      ON
      R.secondary_end_id = RE2.runway_end_id
      WHERE
      airport_id = ${airport.airport_id}`
    );
    for (const runway of runways) {
      outRwy += `${(runway.name1 + spacePadder).substring(0, 4)}`;
      outRwy += `${(runway.name2 + spacePadder).substring(0, 4)}`;
      outRwy += `${(zeroPadder + Math.round(runway.hdg1 - airport.mag_var)).substr(-3)} `;
      outRwy += `${(zeroPadder + Math.round(runway.hdg2 - airport.mag_var)).substr(-3)} `;
      outRwy += convertPoint([runway.lat1, runway.lon1], true) + ' ';
      outRwy += convertPoint([runway.lat2, runway.lon2], true);
      outRwy += '\n';
    }
  }
  writeFileSync(resolve(buildAptPath, '02-AIRPORT.txt'), out);
  writeFileSync(resolve(buildRwyPath, '02-RUNWAY.txt'), outRwy);
};

main().then(() => console.log('Done'));
