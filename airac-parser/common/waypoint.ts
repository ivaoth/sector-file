import { Database } from 'sqlite';
import SQL from 'sql-template-strings';
import { Waypoint } from '../../utils/interfaces';

interface WaypointDbData {
  waypoint_id: number;
  ident: string;
  name: string;
  laty: number;
  lonx: number;
  airport_id: number;
}

export const extractWaypoints = async (
  db: Promise<Database>,
  extra: number[],
  enrouteFixes: number[]
): Promise<Waypoint[]> => {
  const addIsEnrouteAndIsBoundaryInfo =
    (isBoundary: boolean) =>
    (s: WaypointDbData[]): Waypoint[] => {
      return s.map((w) => {
        const { waypoint_id, airport_id, ...others } = w;
        return {
          ...others,
          is_enroute: enrouteFixes.indexOf(waypoint_id) !== -1,
          is_terminal: !!airport_id,
          is_boundary: isBoundary
        };
      });
    };
  const waypoints: Promise<Waypoint[]> = (await db)
    .all<WaypointDbData[]>(
      SQL`
    SELECT
    waypoint_id, ident, laty, lonx, airport_id
    FROM
    waypoint
    WHERE
    region = 'VT'
    AND
    type = 'WN'
  `
    )
    .then(addIsEnrouteAndIsBoundaryInfo(false));

  const ids = `(${extra.join(',')})`;
  const extraWaypoints: Promise<Waypoint[]> = (await db)
    .all<WaypointDbData[]>(
      SQL`
    SELECT
    waypoint_id, ident, laty, lonx, airport_id
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
    )
    .then(addIsEnrouteAndIsBoundaryInfo(true));

  return (await waypoints).concat(await extraWaypoints);
};
