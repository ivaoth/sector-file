import * as sqlite3 from 'sqlite3';
import { resolve } from 'path';
import { Coordinate, convertCoordinate } from './latlon';
import { writeFileSync, ensureDirSync } from 'fs-extra';
import * as xml from 'xml';

const basePath = resolve(__dirname);
const buildPath = resolve(basePath, 'build');

ensureDirSync(buildPath);

const db = new sqlite3.Database(
  resolve(basePath, '..', 'little_navmap_navigraph.sqlite')
);

const outData = { airports: [] as any[] }

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
  const data: {
    airport_id: number;
    ident: string;
    name: string;
    tower_frequency: number | null;
    lonx: number;
    laty: number;
    mag_var: number;
    altitude: number;
  }[] = await query(
    db,
    `SELECT
  airport_id, ident, name, tower_frequency, lonx, laty, mag_var, altitude
  FROM
  airport
  where
  ident LIKE 'VT%'
  AND
  country = 'PAC'`
  );
  for (let airport of data) {
    const airportData = [];
    airportData.push({
      _attr: {
        icao: airport.ident,
        name: airport.name,
        lat: convertCoordinate(airport.laty, Coordinate.Latitude),
        lon: convertCoordinate(airport.lonx, Coordinate.Longtitude),
        elev: airport.altitude
      }
    })
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
      airportData.push({
        runway: {
          _attr: {
            identifier: runway.name1
          }
        }
      });
      airportData.push({
        runway: {
          _attr: {
            identifier: runway.name2
          }
        }
      })
    }
    outData.airports.push({airport: airportData});
  }
  writeFileSync(resolve(buildPath, 'airports.xml'), xml(outData, {indent: '  '}));
};

main().then(() => console.log('Done')).catch((err) => console.log(err));
