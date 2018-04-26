import { existsSync, readFileSync, writeFileSync } from 'fs-extra';
import { resolve } from 'path';
import { Database } from 'sqlite3';

import { all } from '../../tools/helpers/sqlite';

export const buildAirwayConfig = async (db: Database) => {
  const airwaysAtBoundary = await all<{
    airway_name: string;
    wpt_from: string;
    wpt_to: string;
    region_from: string;
    region_to: string;
    airway_id: number;
    id_from: number;
    id_to: number;
  }>(
    db,
    `
      SELECT
        airway.airway_name,
        T1.ident as wpt_from,
        T2.ident as wpt_to,
        airway.airway_id,
        T1.region as region_from,
        T2.region as region_to,
        T1.waypoint_id as id_from,
        T2.waypoint_id as id_to
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
        (
          T1.region = 'VT'
          AND
          T2.region != 'VT'
        )
        OR
        (
          T2.region = 'VT'
          AND
          T1.region != 'VT'
        )
      )
      ORDER BY
        airway_id`
  );
  const airwayConfigPath = resolve(__dirname, '..', 'airway.json');
  let oldConfig: any[];
  if (existsSync(airwayConfigPath)) {
    oldConfig = JSON.parse(readFileSync(airwayConfigPath).toString());
  } else {
    oldConfig = [];
  }
  let newConfig: any[] = [];
  for (let airway of airwaysAtBoundary) {
    const oldAirway = oldConfig.find(v => {
      return (
        v.airway_name === airway.airway_name &&
        v.wpt_from === airway.wpt_from &&
        v.wpt_to === airway.wpt_to
      );
    });
    newConfig.push({
      ...airway,
      use: oldAirway ? oldAirway.use : ''
    });
  }
  writeFileSync(airwayConfigPath, JSON.stringify(newConfig, undefined, 2));
};
