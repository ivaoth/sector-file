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
  boundary: number[],
  enrouteFixes: number[]
): Promise<Waypoint[]> => {

  const addIsEnrouteAndIsBoundaryInfo =
    (isBoundary: boolean, isExtra: boolean) =>
      (s: WaypointDbData[]): Waypoint[] => {
        return s.map((w) => {
          const { waypoint_id, airport_id, ...others } = w;
          return {
            ...others,
            is_enroute: enrouteFixes.indexOf(waypoint_id) !== -1,
            is_terminal: !!airport_id,
            is_boundary: isBoundary,
            is_extra: isExtra
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
          AND type = 'WN'
          AND ident NOT GLOB 'SV[0-9][0-9][0-9]'
      `
    )
    .then(addIsEnrouteAndIsBoundaryInfo(false, false));

  const boundarySet = new Set(boundary);
  const extraUnique = Array.from(new Set(extra));
  const boundaryUnique = Array.from(new Set(boundary));

  const extraOnly = extraUnique.filter((id) => !boundarySet.has(id));

  const extraWaypoints: Promise<Waypoint[]> =
    extraOnly.length === 0
      ? Promise.resolve([])
      : (await db)
          .all<WaypointDbData[]>(
            SQL`
              SELECT waypoint_id, ident, laty, lonx
              FROM waypoint
              WHERE waypoint_id IN
            `
              .append(`(${extraOnly.join(',')})`)
              .append(SQL` AND (type = 'WN' OR type = 'WU')`)
          )
          .then(addIsEnrouteAndIsBoundaryInfo(false, true));

  // ---- Boundary (WN/WU) ----
  const boundaryWaypoints: Promise<Waypoint[]> =
    boundaryUnique.length === 0
      ? Promise.resolve([])
      : (await db)
          .all<WaypointDbData[]>(
            SQL`
              SELECT waypoint_id, ident, laty, lonx
              FROM waypoint
              WHERE waypoint_id IN
            `
              .append(`(${boundaryUnique.join(',')})`)
              .append(SQL` AND (type = 'WN' OR type = 'WU')`)
          )
          .then(addIsEnrouteAndIsBoundaryInfo(true, false));

  return (await waypoints)
    .concat(await boundaryWaypoints)
    .concat(await extraWaypoints);
};
