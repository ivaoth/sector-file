import { SQL } from 'sql-template-strings';
import { Database } from 'sqlite';
import { legsToPoints } from './utils/legs-to-points';
import pad from 'pad';

export const extractSTAR = async (
  db: Promise<Database>,
  airport: { airport_id: number; ident: string }
): Promise<string> => {
  let out = '';
  // Query for STARs
  const stars = await (
    await db
  ).all<
    {
      approach_id: number;
      fix_ident: string;
      runway_name: string;
      runway_end_id: number;
      arinc_name: string;
    }[]
  >(SQL`
    SELECT
      approach_id, fix_ident, runway_name, runway_end_id, arinc_name
    FROM
      approach
    WHERE
      type = 'GPS'
        AND
      has_gps_overlay = 1
        AND
      suffix = 'A'
        AND
      airport_id = ${airport.airport_id}
  `);
  const star_ids = stars.map((star) => star.approach_id);
  if (star_ids.length > 0) {
    console.log(`> Processing ${airport.ident} (${airport.airport_id})`);
    for (const star_id of star_ids) {
      const star = stars.find((v) => v.approach_id === star_id)!;
      const name = `${airport.ident}-${star.arinc_name} ${star.fix_ident}`;
      console.log(`>> Processing ${name} (${star_id})`);
      // Query for legs
      const legs = await (
        await db
      ).all<
        {
          leg_id: number;
          type: string;
          fix_ident: string;
          fix_type: string;
        }[]
      >(SQL`
        SELECT
          approach_leg_id as leg_id, type, fix_ident, fix_type
        FROM
          approach_leg
        WHERE
          approach_id = ${star_id}
      `);
      const points: string[] = await legsToPoints(
        legs,
        airport.airport_id,
        await db
      );
      for (let i = 0; i <= points.length - 2; i++) {
        const point_a = points[i];
        const point_b = points[i + 1];
        const prefix = i === 0 ? name : '';
        out += pad(prefix, 25) + ' ';
        out += pad(point_a, 29) + ' ';
        out += pad(point_b, 29) + '\n';
      }
      const star_transitions = await (
        await db
      ).all<
        {
          fix_ident: string;
          transition_id: number;
        }[]
      >(SQL`
        SELECT
          fix_ident, transition_id
        FROM
          transition
        WHERE
          approach_id = ${star_id}
      `);
      const star_transition_ids = star_transitions.map(
        (star) => star.transition_id
      );
      for (const star_transition_id of star_transition_ids) {
        const star_transition = star_transitions.find(
          (v) => v.transition_id === star_transition_id
        )!;
        const transition_name = `${airport.ident}-${star.arinc_name} ${star.fix_ident}.${star_transition.fix_ident}`;
        console.log(
          `>>> Processing ${transition_name} (${star_transition_id})`
        );
        const transition_legs = await (
          await db
        ).all<
          {
            leg_id: number;
            type: string;
            fix_ident: string;
          }[]
        >(SQL`
          SELECT
            transition_leg_id as leg_id, type, fix_ident
          FROM
            transition_leg
          WHERE
            transition_id = ${star_transition_id}
        `);
        const transition_points = await legsToPoints(transition_legs);
        for (let i = 0; i <= transition_points.length - 2; i++) {
          const point_a = transition_points[i];
          const point_b = transition_points[i + 1];
          const prefix = i === 0 ? transition_name : '';
          out += pad(prefix, 25) + ' ';
          out += pad(point_a, 29) + ' ';
          out += pad(point_b, 29) + '\n';
        }
      }
    }
  }
  return out;
};
