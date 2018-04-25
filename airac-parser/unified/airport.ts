import { ensureDirSync, writeFileSync } from 'fs-extra';
import { resolve } from 'path';
import * as sqlite3 from 'sqlite3';
import * as xml from 'xml';

import { Coordinate } from './tools/coordinate/coordinate';
import { convertPoint } from './tools/coordinate/ivac1_coordinate';
import { convertCoordinate } from './tools/coordinate/ivac2_coordinate';

const aptAirspaceMap: any = {
  VTCH: 'D',
  VTPH: 'D',
  VTUJ: 'D',
  VTBW: 'D',
  VTBP: 'D',
  VTSE: 'D',
  VTSH: 'D',
  VTBD: 'C',
  VTBH: 'C',
  VTBI: 'C',
  VTBK: 'C',
  VTBL: 'C',
  VTBO: 'C',
  VTBS: 'C',
  VTBT: 'C',
  VTBU: 'C',
  VTCC: 'C',
  VTCI: 'C',
  VTCL: 'C',
  VTCN: 'C',
  VTCP: 'C',
  VTCT: 'C',
  VTPB: 'C',
  VTPI: 'C',
  VTPM: 'C',
  VTPN: 'C',
  VTPO: 'C',
  VTPP: 'C',
  VTPR: 'C',
  VTPT: 'C',
  VTPY: 'C',
  VTSB: 'C',
  VTSC: 'C',
  VTSF: 'C',
  VTSG: 'C',
  VTSK: 'C',
  VTSM: 'C',
  VTSN: 'C',
  VTSP: 'C',
  VTSR: 'C',
  VTSS: 'C',
  VTST: 'C',
  VTUD: 'C',
  VTUI: 'C',
  VTUK: 'C',
  VTUL: 'C',
  VTUN: 'C',
  VTUO: 'C',
  VTUQ: 'C',
  VTUU: 'C',
  VTUV: 'C',
  VTUW: 'C'
};

const basePath = resolve(__dirname);
const buildPath = resolve(basePath, 'build');
const ivac1BuildPath = resolve(buildPath, 'ivac1');
const ivac1AptPath = resolve(ivac1BuildPath, '05-AIRPORT');
const ivac1RwyPath = resolve(ivac1BuildPath, '06-RUNWAY');
const ivac2BuildPath = resolve(buildPath, 'ivac2');
const ivac2AptPath = resolve(ivac2BuildPath);

ensureDirSync(ivac1AptPath);
ensureDirSync(ivac1RwyPath);
ensureDirSync(ivac2AptPath);

const zeroPadder = '0000000';
const spacePadder = '       ';

const db = new sqlite3.Database(
  resolve(basePath, '..', 'little_navmap_navigraph.sqlite')
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
  const airports: {
    airport_id: number;
    ident: string;
    name: string;
    tower_frequency: number | null;
    lonx: number;
    laty: number;
    mag_var: number;
    altitude: number;
    runways: {
      name1: string;
      hdg1: number;
      lat1: number;
      lon1: number;
      name2: string;
      hdg2: number;
      lat2: number;
      lon2: number;
    }[];
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
  for (let airport of airports) {
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
    airport.runways = runways;
  }
  airportsDataForIvac1(airports);
  airportsDataForIvac2(airports);
};

main().then(() => console.log('Done'));

const airportDataForIvac1 = (airport: {
  airport_id: number;
  ident: string;
  name: string;
  tower_frequency: number | null;
  lonx: number;
  laty: number;
  mag_var: number;
  altitude: number;
}) => {
  let currentAirport = '';
  currentAirport += airport.ident;
  currentAirport += ' ';
  if (airport.tower_frequency) {
    const num1 = Math.floor(airport.tower_frequency / 1000);
    const num2 = airport.tower_frequency % 1000;
    currentAirport += `${num1}.${(num2 + zeroPadder).substr(0, 3)} `;
  } else {
    currentAirport += '.       ';
  }
  currentAirport += convertPoint([airport.laty, airport.lonx], true);
  currentAirport += ` ${aptAirspaceMap[airport.ident]} ;- ${airport.name}`;
  currentAirport += '\n';
  return currentAirport;
};

const runwayDataForIvac1 = (
  runway: {
    name1: string;
    hdg1: number;
    lat1: number;
    lon1: number;
    name2: string;
    hdg2: number;
    lat2: number;
    lon2: number;
  },
  airport: {
    airport_id: number;
    ident: string;
    name: string;
    tower_frequency: number | null;
    lonx: number;
    laty: number;
    mag_var: number;
  }
) => {
  let currentRunway = '';
  currentRunway += `${(runway.name1 + spacePadder).substring(0, 4)}`;
  currentRunway += `${(runway.name2 + spacePadder).substring(0, 4)}`;
  currentRunway += `${(
    zeroPadder + Math.round(runway.hdg1 - airport.mag_var)
  ).substr(-3)} `;
  currentRunway += `${(
    zeroPadder + Math.round(runway.hdg2 - airport.mag_var)
  ).substr(-3)} `;
  currentRunway += convertPoint([runway.lat1, runway.lon1], true) + ' ';
  currentRunway += convertPoint([runway.lat2, runway.lon2], true);
  currentRunway += '\n';
  return currentRunway;
};

const airportsDataForIvac1 = (
  airports: {
    airport_id: number;
    ident: string;
    name: string;
    tower_frequency: number | null;
    lonx: number;
    laty: number;
    mag_var: number;
    altitude: number;
    runways: {
      name1: string;
      hdg1: number;
      lat1: number;
      lon1: number;
      name2: string;
      hdg2: number;
      lat2: number;
      lon2: number;
    }[];
  }[]
) => {
  let ivac1OutAirport = '';
  let ivac1OutRunway = '';
  for (let airport of airports) {
    ivac1OutAirport += airportDataForIvac1(airport);
    ivac1OutRunway += `;- ${airport.ident}\n`;
    for (const runway of airport.runways) {
      ivac1OutRunway += runwayDataForIvac1(runway, airport);
    }
  }
  writeFileSync(resolve(ivac1AptPath, '02-AIRPORT.txt'), ivac1OutAirport);
  writeFileSync(resolve(ivac1RwyPath, '02-RUNWAY.txt'), ivac1OutRunway);
};

const airportsDataForIvac2 = (
  airports: {
    airport_id: number;
    ident: string;
    name: string;
    tower_frequency: number | null;
    lonx: number;
    laty: number;
    mag_var: number;
    altitude: number;
    runways: {
      name1: string;
      hdg1: number;
      lat1: number;
      lon1: number;
      name2: string;
      hdg2: number;
      lat2: number;
      lon2: number;
    }[];
  }[]
) => {
  const airportsData = { airports: [] as any[] };
  for (let airport of airports) {
    const airportData = [];
    airportData.push({
      _attr: {
        icao: airport.ident,
        name: airport.name,
        lat: convertCoordinate(airport.laty, Coordinate.Latitude),
        lon: convertCoordinate(airport.lonx, Coordinate.Longtitude),
        elev: airport.altitude
      }
    });
    for (const runway of airport.runways) {
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
      });
    }
    airportsData.airports.push({ airport: airportData });
  }
  writeFileSync(
    resolve(ivac2AptPath, 'airports.xml'),
    xml(airportsData, { indent: '  ' }) + '\n'
  );
};
