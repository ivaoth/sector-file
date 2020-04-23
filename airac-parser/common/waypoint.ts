import { Database } from 'sqlite';
import SQL from 'sql-template-strings';
import { Waypoint } from '../../utils/interfaces';

interface WaypointDbData {
  ident: string;
  name: string;
  frequency: number;
  laty: number;
  lonx: number;
}

export const extractWaypoints = async (db: Promise<Database>, extra: number[]) => {
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

  return (await waypoints).concat(await extraWaypoints);
};
