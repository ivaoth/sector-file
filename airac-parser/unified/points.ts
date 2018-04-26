import { ensureDirSync, writeFileSync } from 'fs-extra';
import { resolve } from 'path';
import * as sqlite3 from 'sqlite3';
import * as xml from 'xml';

import { convertPoint } from './tools/coordinate/ivac1_coordinate';
import { convertCoordinate } from './tools/coordinate/ivac2_coordinate';
import { Coordinate } from './tools/coordinate/coordinate';

const basePath = resolve(__dirname);
const buildPath = resolve(basePath, 'build');
const ivac1BuildPath = resolve(buildPath, 'ivac1');
const ivac1FixesPath = resolve(ivac1BuildPath, '04-FIXES');
const ivac1VorsPath = resolve(ivac1BuildPath, '02-VOR');
const ivac1NdbsPath = resolve(ivac1BuildPath, '03-NDB');
const ivac2BuildPath = resolve(buildPath, 'ivac2');
const ivac2PointsPath = resolve(ivac2BuildPath);

ensureDirSync(ivac1FixesPath);
ensureDirSync(ivac1VorsPath);
ensureDirSync(ivac1NdbsPath);
ensureDirSync(ivac2PointsPath);

const db = new sqlite3.Database(
  resolve(basePath, '..', 'little_navmap_navigraph.sqlite')
);

const inclusionFixes: string[] = [
  'ARATO',
  'BASIT',
  'BIDEM',
  'DALAN',
  'DALER',
  'EKAVO',
  'GOGOM',
  'KADAX',
  'KAKIP',
  'KARMI',
  'MAKAS',
  'OBMOG',
  'ODONO',
  'PADET',
  'PAPDA',
  'PAPRA',
  'PASVA',
  'PONUK',
  'POXEM',
  'PUMEK',
  'RIGTO',
  'RUSET',
  'SAPAM',
  'SISUK',
  'TAVUN',
  'TOMIP',
  'VIBUN',
  'XONAN'
];

const inclusionVors = [
  'BGO',
  'DWI',
  'LPB',
  'PAK',
  'PNH',
  'PTN',
  'SAV',
  'SRE',
  'VAS',
  'VKB',
  'VTN'
];

const inclusionNdbs = ['BB'];

const padder1 = '       ';
const padder2 = '000';
const padder3 = '    ';

const query = (db: sqlite3.Database, queryStr: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(queryStr, (err, rows) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const all = (db: sqlite3.Database, queryStr: string): Promise<any[]> => {
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
  const insideFixes = await all(
    db,
    `
    SELECT
    ident, laty, lonx
    FROM
    waypoint
    WHERE
    region = 'VT'
    AND
    (
      type = 'WN'
      OR
      type = 'WU'
    )
    `
  );

  const nearByFixes = [] as any[];

  for (let wpt of inclusionFixes) {
    nearByFixes.push(
      await query(
        db,
        `
          SELECT
          *
          FROM
          waypoint
          WHERE
          ident = '${wpt}'
          AND
          (
            region LIKE 'V%'
            OR
            region LIKE 'W%'
          )
          AND
          (
            type = 'WN'
            OR
            type = 'WU'
          )
        `
      )
    );
  }

  insideFixesToIvac1(insideFixes);
  nearByFixesToIvac1(nearByFixes);

  const insideVors = await all(
    db,
    `
    SELECT
    ident, name, frequency, laty, lonx
    FROM
    vor
    WHERE
    region = 'VT'
    `
  );

  const nearByVors = [] as any[];

  for (let vor of inclusionVors) {
    nearByVors.push(
      await query(
        db,
        `
        SELECT
        *
        FROM
        vor
        WHERE
        ident = '${vor}'
        AND
        (
          region LIKE 'V%'
          OR
          region LIKE 'W%'
        )
        `
      )
    );
  }

  insideVorsToIvac1(insideVors);
  nearByVorsToIvac1(nearByVors);

  const insideNdbs = await all(
    db,
    `
    SELECT
    ident, name, frequency, laty, lonx
    FROM
    ndb
    WHERE
    region = 'VT'
    `
  );

  const nearByNdbs = [] as any[];

  for (let ndb of inclusionNdbs) {
    nearByNdbs.push(
      await query(
        db,
        `
        SELECT
        *
        FROM
        ndb
        WHERE
        ident = '${ndb}'
        AND
        (
          region LIKE 'V%'
          OR
          region LIKE 'W%'
        )
        `
      )
    );
  }

  insideNdbsToIvac1(insideNdbs);
  nearByNdbsToIvac1(nearByNdbs);

  const airports = await all(
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

  pointsToIvac2(
    insideFixes,
    nearByFixes,
    insideVors,
    nearByVors,
    insideNdbs,
    nearByNdbs,
    airports
  );
};

main().then(() => console.log('Done'));

const nearByFixesToIvac1 = (nearBy: any[]) => {
  let outNearby = '';
  outNearby += ';- Followings are fixes outside Bangkok FIR\n';
  for (let data of nearBy) {
    outNearby += (data.ident + padder1).substr(0, 6);
    outNearby += convertPoint([data.laty, data.lonx], true);
    outNearby += '\n';
  }
  writeFileSync(resolve(ivac1FixesPath, '03-NEARBY.txt'), outNearby);
};

const insideFixesToIvac1 = (
  rows: { ident: string; laty: number; lonx: number }[]
) => {
  let out = '';
  for (let i = 0; i <= rows.length - 1; i++) {
    const row = rows[i];
    out += (row.ident + padder1).substr(0, 6);
    out += convertPoint([row.laty, row.lonx], true);
    out += '\n';
  }
  writeFileSync(resolve(ivac1FixesPath, '02-THAI.txt'), out);
};

const insideVorsToIvac1 = (rows: any[]) => {
  let out = '';
  for (let i = 0; i <= rows.length - 1; i++) {
    const row = rows[i];
    out += (row.ident + padder3).substr(0, 4);
    const num1 = Math.floor(row.frequency / 1000);
    const num2 = row.frequency % 1000;
    out += `${num1}.${(num2 + padder2).substr(0, 3)} `;
    out += convertPoint([row.laty, row.lonx], true);
    out += ` ;- ${row.name}`;
    out += '\n';
  }
  writeFileSync(resolve(ivac1VorsPath, '02-THAI.txt'), out);
};

const nearByVorsToIvac1 = (nearBy: any[]) => {
  let outNearby = '';
  outNearby += ';- Followings are fixes outside Bangkok FIR\n';
  for (let data of nearBy) {
    outNearby += (data.ident + padder3).substr(0, 4);
    const num1 = Math.floor(data.frequency / 1000);
    const num2 = data.frequency % 1000;
    outNearby += `${num1}.${(num2 + padder2).substr(0, 3)} `;
    outNearby += convertPoint([data.laty, data.lonx], true);
    outNearby += ` ;- ${data.name}`;
    outNearby += '\n';
  }
  writeFileSync(resolve(ivac1VorsPath, '03-NEARBY.txt'), outNearby);
};

const insideNdbsToIvac1 = (rows: any[]) => {
  let out = '';
  for (let i = 0; i <= rows.length - 1; i++) {
    const row = rows[i];
    out += (row.ident + padder1).substr(0, 6);
    const num1 = Math.floor(row.frequency / 100);
    const num2 = row.frequency % 100;
    out += `${num1}.${(num2 + padder2).substr(0, 3)} `;
    out += convertPoint([row.laty, row.lonx], true);
    out += ` ;- ${row.name}`;
    out += '\n';
  }
  writeFileSync(resolve(ivac1NdbsPath, '02-THAI.txt'), out);
};

const nearByNdbsToIvac1 = (nearBy: any[]) => {
  let outNearby = '';
  outNearby += ';- Followings are fixes outside Bangkok FIR\n';
  for (let data of nearBy) {
    outNearby += (data.ident + padder1).substr(0, 6);
    const num1 = Math.floor(data.frequency / 100);
    const num2 = data.frequency % 100;
    outNearby += `${num1}.${(num2 + padder2).substr(0, 3)} `;
    outNearby += convertPoint([data.laty, data.lonx], true);
    outNearby += ` ;- ${data.name}`;
    outNearby += '\n';
  }
  writeFileSync(resolve(ivac1NdbsPath, '03-NEARBY.txt'), outNearby);
};

const pointsToIvac2 = (
  insideFixes: any[],
  nearByFixes: any[],
  insideVors: any[],
  nearByVors: any[],
  insideNdbs: any[],
  nearByNdbs: any[],
  airports: any[]
) => {
  const outXml = { points: [] as any[] };
  const points = outXml.points;

  for (let fix of insideFixes.concat(
    nearByFixes,
    insideVors,
    nearByVors,
    insideNdbs,
    nearByNdbs,
    airports
  )) {
    points.push({
      point: {
        _attr: {
          id: fix.ident,
          lat: convertCoordinate(fix.laty, Coordinate.Latitude),
          lon: convertCoordinate(fix.lonx, Coordinate.Longtitude)
        }
      }
    });
  }
  writeFileSync(
    resolve(ivac2PointsPath, `points.xml`),
    xml(outXml, { indent: '  ' }) + '\n'
  );
};
