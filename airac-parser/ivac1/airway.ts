import * as sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { resolve } from 'path';
import { Coordinate, convertCoordinate, convertPoint } from './latlon';
import { writeFileSync, ensureDirSync } from 'fs-extra';

(async () => {

  const basePath = resolve(__dirname);
  const buildPath = resolve(basePath, 'build');

  ensureDirSync(buildPath);

  const db = await open({
    filename: resolve(basePath, '..' , 'little_navmap_navigraph.sqlite'),
    driver: sqlite3.Database
  });

  let max_lat: number, max_lon: number, min_lat: number, min_lon: number;

  const rows = await db.all<{
    airway_name: string;
    wpt_from: string;
    wpt_to: string;
    airway_id: number;
    airway_fragment_no: number;
    sequence_no: number;
  }[]>(
    `
      SELECT
      airway.airway_name, airway.sequence_no, T1.ident as wpt_from, T2.ident as wpt_to, airway.airway_id, airway.airway_fragment_no, T1.region as region_from, T2.region as region_to
      FROM
      airway
      INNER JOIN
      waypoint T1
      ON
      airway.from_waypoint_id = T1.waypoint_id
      INNER JOIN
      waypoint T2
      ON
      airway.to_waypoint_id = T2.waypoint_id
      WHERE
      (
        airway.airway_type = 'J'
        OR
        airway.airway_type = 'B'
      )
      AND
      (
        T1.region = 'VT'
        OR
        T2.region = 'VT'
      )
      ORDER BY airway_id
      `
  );

  let out = '[HIGH AIRWAY]\n';
  const padder1 = '                          ';
  const padder2 = '                             ';
  let prev_frag = 0,
    prev_name = '',
    prev_seq = 0;
  for (let i = 0; i <= rows.length - 1; i++) {
    const row = rows[i];
    if (
      i === 0 ||
      row.airway_name !== prev_name ||
      row.airway_fragment_no !== prev_frag ||
      row.sequence_no !== prev_seq + 1
    ) {
      out += (row.airway_name + padder1).substr(0, 26);
    } else {
      out += padder1;
    }
    out += (row.wpt_from + padder2).substr(0, 29);
    out += ' ';
    out += (row.wpt_to + padder2).substr(0, 29);
    out += '\n';
    prev_frag = row.airway_fragment_no;
    prev_name = row.airway_name;
    prev_seq = row.sequence_no;
  }
  writeFileSync(resolve(buildPath, '09-HI_AIRWAY.txt'), out);

  const rows2 = await db.all<{
    airway_name: string;
    wpt_from: string;
    wpt_to: string;
    airway_id: number;
    airway_fragment_no: number;
    sequence_no: number;
  }[]>(
    `
      SELECT
      airway.airway_name, airway.sequence_no, T1.ident as wpt_from, T2.ident as wpt_to, airway.airway_id, airway.airway_fragment_no, T1.region as region_from, T2.region as region_to
      FROM
      airway
      INNER JOIN
      waypoint T1
      ON
      airway.from_waypoint_id = T1.waypoint_id
      INNER JOIN
      waypoint T2
      ON
      airway.to_waypoint_id = T2.waypoint_id
      WHERE
      (
        airway.airway_type = 'V'
        OR
        airway.airway_type = 'B'
      )
      AND
      (
        T1.region = 'VT'
        OR
        T2.region = 'VT'
      )
      ORDER BY airway_id
      `
  );
  out = '[LOW AIRWAY]\n';
  prev_frag = 0;
  prev_name = '';
  prev_seq = 0;
  for (let i = 0; i <= rows2.length - 1; i++) {
    const row = rows2[i];
    if (
      i === 0 ||
      row.airway_name !== prev_name ||
      row.airway_fragment_no !== prev_frag ||
      row.sequence_no !== prev_seq + 1
    ) {
      out += (row.airway_name + padder1).substr(0, 26);
    } else {
      out += padder1;
    }
    out += (row.wpt_from + padder2).substr(0, 29);
    out += ' ';
    out += (row.wpt_to + padder2).substr(0, 29);
    out += '\n';
    prev_frag = row.airway_fragment_no;
    prev_name = row.airway_name;
    prev_seq = row.sequence_no;
  }
  writeFileSync(resolve(buildPath, '10-LO_AIRWAY.txt'), out);
})();
