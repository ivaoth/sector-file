import * as sqlite3 from 'sqlite3';
import { resolve } from 'path';
import { Coordinate, convertCoordinate, convertPoint } from './latlon';
import { writeFileSync, ensureDirSync } from 'fs-extra';

const basePath = resolve(__dirname);
const buildPath = resolve(basePath, 'build', '04-FIXES');

ensureDirSync(buildPath);

const db = new sqlite3.Database(
  resolve(basePath, '..' , 'little_navmap_navigraph.sqlite')
);

let inclusion: string[] = [
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
  'RIMSO',
  'RUSET',
  'SAKDA',
  'SAPAM',
  'SISUK',
  'TAVUN',
  'TOMIP',
  'VIBUN',
  'XONAN'
];

if (process.env['INSIDE_ONLY'] === 'true') {
  console.log('This is going to get data inside Bangkok FIR only, be sure to run the IvAc sector file checker.');
  inclusion = [];
}

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

const main = async () => {
  db.all(
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
    )
    `,
    async (
      err: any,
      rows: {
        ident: string;
        laty: number;
        lonx: number;
      }[]
    ) => {
      let out = '';
      let outNearby = '';
      const padder1 = '       ';
      const padder2 = '000';
      for (let i = 0; i <= rows.length - 1; i++) {
        const row = rows[i];
        out += (row.ident + padder1).substr(0, 6);
        out += convertPoint([row.laty, row.lonx], true);
        out += '\n';
      }

      outNearby += ';- Followings are fixes outside Bangkok FIR\n';

      for (let wpt of inclusion) {
        const data = await query(
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
          )
        `
        );
        outNearby += (data.ident + padder1).substr(0, 6);
        outNearby += convertPoint([data.laty, data.lonx], true);
        outNearby += '\n';
      }
      writeFileSync(resolve(buildPath, '02-THAI.txt'), out);
      writeFileSync(resolve(buildPath, '03-NEARBY.txt'), outNearby);
    }
  );
};

main().then(() => console.log('Done'));
