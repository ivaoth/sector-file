import * as sqlite from 'sqlite';
import * as sqlite3 from 'sqlite3';
import { resolve } from 'path';
import {
  writeFileSync,
  ensureDirSync,
  existsSync,
  readFileSync
} from 'fs-extra';
import SQL from 'sql-template-strings';
import { Waypoint } from '../../utils/interfaces';

interface WaypointDbData {
  ident: string;
  name: string;
  frequency: number;
  laty: number;
  lonx: number;
}

const main = async () => {
  const basePath = resolve(__dirname);
  const buildPath = resolve(basePath, 'build');
  const waypointFile = resolve(buildPath, 'waypoints.json');
  const extraFile = resolve(buildPath, '_airway-extras.json');

  ensureDirSync(buildPath);
  const db = sqlite.open({
    filename: resolve(basePath, '..', 'little_navmap_navigraph.sqlite'),
    driver: sqlite3.Database
  });
  const waypoints: Promise<Waypoint[]> = (await db).all<WaypointDbData[]>(SQL`
    SELECT
    ident, laty, lonx
    FROM
    waypoint
    WHERE
    region = 'VT'
    AND
    type = 'WN'
  `);

  if (existsSync(extraFile)) {
    const extra = JSON.parse(readFileSync(extraFile).toString()) as number[];
    const ids = `(${extra.join(',')})`;
    const extraWaypoints: Promise<Waypoint[]> = (await db).all<WaypointDbData[]>(
      SQL`
      SELECT
      ident, laty, lonx
      FROM
      waypoint
      WHERE
      waypoint_id IN
    `.append(ids).append(SQL`
      AND
      (
        type = 'WN'
        OR
        type = 'WU'
      )
    `)
    );
    writeFileSync(
      waypointFile,
      JSON.stringify((await waypoints).concat(await extraWaypoints), null, 2)
    );
  } else {
    writeFileSync(waypointFile, JSON.stringify(await waypoints, null, 2));
  }
};

main();
