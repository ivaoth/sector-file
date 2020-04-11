import { Database } from 'sqlite3';
import { open } from 'sqlite';
import { resolve } from 'path';
import { convertPoint } from './latlon';
import { writeFileSync, ensureDirSync } from 'fs-extra';

(async () => {
  const basePath = resolve(__dirname);
  const buildPath = resolve(basePath, 'build', '04-FIXES');

  ensureDirSync(buildPath);

  const db = await open({
    filename: resolve(basePath, '..' , 'little_navmap_navigraph.sqlite'),
    driver: Database
  });

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
  const waypoints = await db.all<{
    ident: string;
    laty: number;
    lonx: number;
  }[]>(
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
    `
  );
  let out = '';
  let outNearby = '';
  const padder1 = '       ';
  const padder2 = '000';
  for (let i = 0; i <= waypoints.length - 1; i++) {
    const row = waypoints[i];
    out += (row.ident + padder1).substr(0, 6);
    out += convertPoint([row.laty, row.lonx], true);
    out += '\n';
  }

  outNearby += ';- Followings are fixes outside Bangkok FIR\n';

  for (let wpt of inclusion) {
    const data = (await db.get<{
      ident: string,
      laty: number,
      lonx: number
    }>(
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
    ))!;
    outNearby += (data.ident + padder1).substr(0, 6);
    outNearby += convertPoint([data.laty, data.lonx], true);
    outNearby += '\n';
  }
  writeFileSync(resolve(buildPath, '02-THAI.txt'), out);
  writeFileSync(resolve(buildPath, '03-NEARBY.txt'), outNearby);
})();
