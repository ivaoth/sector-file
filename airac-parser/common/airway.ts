import { Database } from 'sqlite';
import SQL from 'sql-template-strings';
import { Segment } from '../../utils/interfaces';

interface SegmentsDbData {
  name: string;
  segment_no: number;
  sequence_no: number;
  wpt_from: string;
  wpt_to: string;
  type: string;
  from_lat: number;
  from_lon: number;
  to_lat: number;
  to_lon: number;
  direction: 'N' | 'B' | 'F';
  region_from: string;
  region_to: string;
  id_from: number;
  id_to: number;
}

export const extractAirways = async (
  db: Promise<Database>
): Promise<{
  data: Segment[][];
  extras: number[];
  enroute: number[];
}> => {
  const filteredSegments = (await db).all<SegmentsDbData[]>(SQL`
  SELECT
    airway.airway_name AS name,
    airway.airway_fragment_no AS segment_no,
    airway.sequence_no,
    T1.ident as wpt_from,
    T2.ident as wpt_to,
    airway.airway_type AS type,
    airway.from_laty AS from_lat,
    airway.from_lonx AS from_lon,
    airway.to_laty AS to_lat,
    airway.to_lonx AS to_lon,
    airway.direction,
    T1.region AS region_from,
    T2.region AS region_to,
    T1.waypoint_id AS id_from,
    T2.waypoint_id AS id_to
  FROM
  (
    airway
    INNER JOIN
    waypoint T1
    ON
    airway.from_waypoint_id = T1.waypoint_id
    INNER JOIN
    waypoint T2
    ON
    airway.to_waypoint_id = T2.waypoint_id
  )
  WHERE
  (
    T1.region = 'VT'
    OR
    T2.region = 'VT'
  )
  ORDER BY airway_id ASC;
  `);

  const extras: number[] = [];
  const enroute: number[] = [];

  const { data } = (await filteredSegments).reduce(
    (prev, curr, i) => {
      const { data: currData, ...others } = prev;
      if (i === 0 && enroute.indexOf(curr.id_from) === -1) {
        enroute.push(curr.id_from);
      }
      if (enroute.indexOf(curr.id_to) === -1) {
        enroute.push(curr.id_to);
      }
      if (curr.region_from !== 'VT') {
        if (extras.indexOf(curr.id_from) === -1) {
          extras.push(curr.id_from);
        }
      }
      if (curr.region_to !== 'VT') {
        if (extras.indexOf(curr.id_to) === -1) {
          extras.push(curr.id_to);
        }
      }
      const { id_from: _, id_to: __, ...out } = curr;
      if (
        out.name !== prev.currentName ||
        out.segment_no !== prev.currentFragment ||
        out.sequence_no !== prev.currentSequence + 1
      ) {
        return {
          currentName: out.name,
          currentFragment: out.segment_no,
          currentSequence: out.sequence_no,
          data: [
            ...currData,
            [
              {
                ...out
              }
            ]
          ]
        };
      } else {
        const { currentSequence: _currSeq, ...others2 } = others;
        const lastEle = currData.slice(-1)[0];
        const otherEle = currData.slice(0, -1);
        return {
          ...others2,
          currentSequence: out.sequence_no,
          data: [
            ...otherEle,
            [
              ...lastEle,
              {
                ...out
              }
            ]
          ]
        };
      }
    },
    {
      currentName: '',
      currentFragment: 0,
      currentSequence: 0,
      data: [] as Segment[][]
    }
  );
  return { data, extras, enroute };
};
