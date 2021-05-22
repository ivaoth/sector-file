import { Database } from 'sqlite';
import { convertPoint } from './latlon';
import SQL from 'sql-template-strings';

export const extractWaypoints = async (
  db: Promise<Database>,
  extras: number[]
): Promise<{
  waypointsOut: string;
  waypointsNearbyOut: string;
}> => {
  const waypoints = await (
    await db
  ).all<
    {
      ident: string;
      laty: number;
      lonx: number;
    }[]
  >(
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
  let waypointsOut = '';
  let waypointsNearbyOut = '';
  const padder1 = '       ';
  for (let i = 0; i <= waypoints.length - 1; i++) {
    const row = waypoints[i];
    waypointsOut += (row.ident + padder1).substr(0, 6);
    waypointsOut += convertPoint([row.laty, row.lonx], true);
    waypointsOut += '\n';
  }

  waypointsNearbyOut += ';- Followings are fixes outside Bangkok FIR\n';

  const ids = `(${extras.join(',')})`;

  const extraWaypoints = (await db).all<
    {
      ident: string;
      laty: number;
      lonx: number;
    }[]
  >(
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

  for (const wpt of (await extraWaypoints).sort((a, b) =>
    a.ident < b.ident ? -1 : a.ident === b.ident ? 0 : 1
  )) {
    waypointsNearbyOut += (wpt.ident + padder1).substr(0, 6);
    waypointsNearbyOut += convertPoint([wpt.laty, wpt.lonx], true);
    waypointsNearbyOut += '\n';
  }

  return { waypointsOut, waypointsNearbyOut };
};
