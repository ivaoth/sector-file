import { Database } from 'sqlite';
import SQL from 'sql-template-strings';
import { convertPoint } from '../latlon';

const logKnownLegTypes = false;

const getLegOutput = async (
  leg: { leg_id: number; type: string; fix_ident: string; fix_type?: string },
  airportId?: number,
  db?: Database
): Promise<string> => {
  if (airportId && leg.fix_type && db) {
    const fix: { type: string; lonx: number; laty: number } = (await db.get(
      SQL`
      SELECT
      type, lonx, laty
      FROM
      waypoint
      WHERE
      ident = ${leg.fix_ident}
      AND
      airport_id = ${airportId}
      `
    ))!;
    if (fix) {
      if (fix.type === 'WU') {
        return convertPoint([fix.lonx, fix.laty]);
      } else {
        return leg.fix_ident;
      }
    } else {
      return leg.fix_ident;
    }
  } else {
    return leg.fix_ident;
  }
};

export const legsToPoints = async (
  legs: {
    leg_id: number;
    type: string;
    fix_ident: string;
    fix_type?: string;
  }[],
  airportId?: number,
  db?: Database
): Promise<string[]> => {
  const points: string[] = [];
  for (const leg of legs) {
    switch (leg.type) {
      case 'CA':
        // TODO: implement this leg type
        logKnownLegTypes &&
          console.log('>>> Course to altitude: no action (yet)');
        break;
      case 'DF':
        logKnownLegTypes &&
          console.log(`>>> (${leg.leg_id}) Direct to fix: ${leg.fix_ident}`);
        points.push(await getLegOutput(leg, airportId, db));
        break;
      case 'TF':
        logKnownLegTypes &&
          console.log(`>>> (${leg.leg_id}) Track to fix: ${leg.fix_ident}`);
        points.push(await getLegOutput(leg, airportId, db));
        break;
      case 'CF':
        logKnownLegTypes &&
          console.log(`>>> (${leg.leg_id}) Course to fix: ${leg.fix_ident}`);
        points.push(await getLegOutput(leg, airportId, db));
        break;
      case 'IF':
        logKnownLegTypes &&
          console.log(`>>> (${leg.leg_id}) Initial fix: ${leg.fix_ident}`);
        points.push(await getLegOutput(leg, airportId, db));
        break;
      case 'VM':
        logKnownLegTypes &&
          console.log(
            `>>> (${leg.leg_id}) Heading to manual termination: no action`
          );
        break;
      default:
        console.log(`>>> (${leg.leg_id}) ***UNKNOWN LEG TYPE ${leg.type}***`);
    }
  }
  return points;
};
