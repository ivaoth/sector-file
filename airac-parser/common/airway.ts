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
  extras: number[];     // all non-VT endpoints (unchanged semantics)
  boundary: number[];   // NEW: non-VT endpoints directly connected to VT
  enroute: number[];
}> => {
const filteredSegments = (await db).all<SegmentsDbData[]>(SQL`
SELECT
  airway.airway_name AS name,
  airway.airway_fragment_no AS segment_no,
  airway.sequence_no,
  T1.ident AS wpt_from,
  T2.ident AS wpt_to,
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
FROM airway
JOIN waypoint T1 ON airway.from_waypoint_id = T1.waypoint_id
JOIN waypoint T2 ON airway.to_waypoint_id   = T2.waypoint_id
WHERE
  (
    substr(airway.airway_name, 1, 1) IN ('H','J','V','W','Q','T','Y','Z')
    AND EXISTS (
      SELECT 1
      FROM airway a2
      JOIN waypoint f ON a2.from_waypoint_id = f.waypoint_id
      JOIN waypoint t ON a2.to_waypoint_id   = t.waypoint_id
      WHERE a2.airway_name = airway.airway_name
        AND a2.airway_fragment_no = airway.airway_fragment_no
        AND f.region = 'VT'
        AND t.region = 'VT'     -- require at least one VT↔VT segment
    )
  )
  OR
  (
    substr(airway.airway_name, 1, 1) IN ('A','B','G','R','L','M','N','P')
    AND EXISTS (
      SELECT 1
      FROM airway a3
      JOIN waypoint f2 ON a3.from_waypoint_id = f2.waypoint_id
      JOIN waypoint t2 ON a3.to_waypoint_id   = t2.waypoint_id
      WHERE a3.airway_name = airway.airway_name
        AND a3.airway_fragment_no = airway.airway_fragment_no
        AND (f2.region = 'VT' OR t2.region = 'VT') -- touches VT anywhere
    )
  )
  OR
  (
    substr(airway.airway_name, 1, 1) NOT IN ('H','J','V','W','Q','T','Y','Z','A','B','G','R','L','M','N','P')
    AND EXISTS (
      SELECT 1
      FROM airway a4
      JOIN waypoint f3 ON a4.from_waypoint_id = f3.waypoint_id
      JOIN waypoint t3 ON a4.to_waypoint_id   = t3.waypoint_id
      WHERE a4.airway_name = airway.airway_name
        AND a4.airway_fragment_no = airway.airway_fragment_no
        AND (f3.region = 'VT' OR t3.region = 'VT') -- safe fallback
    )
  )
ORDER BY airway.airway_id ASC;
`);


  // use Sets to avoid duplicates while preserving insertion order via arrays later
  const extrasSet = new Set<number>();    // all non-VT endpoints
  const boundarySet = new Set<number>();  // non-VT endpoint when the other end is VT
  const enroute: number[] = [];

  const { data } = (await filteredSegments).reduce(
    (prev, curr) => {
      const { data: currData, ...others } = prev;

      // Track enroute order the same way you did
      if (
        (prev.currentName !== curr.name ||
          prev.currentFragment !== curr.segment_no ||
          prev.currentSequence + 1 !== curr.segment_no) &&
        enroute.indexOf(curr.id_from) === -1
      ) {
        enroute.push(curr.id_from);
      }
      if (enroute.indexOf(curr.id_to) === -1) {
        enroute.push(curr.id_to);
      }

      // Collect ALL non-VT endpoints in extras (unchanged)
      if (curr.region_from !== 'VT') extrasSet.add(curr.id_from);
      if (curr.region_to !== 'VT') extrasSet.add(curr.id_to);

      // NEW: boundary = non-VT endpoint when the other side is VT
      const fromIsVT = curr.region_from === 'VT';
      const toIsVT   = curr.region_to === 'VT';
      if (fromIsVT && !toIsVT) boundarySet.add(curr.id_to);   // VT → non-VT
      if (!fromIsVT && toIsVT) boundarySet.add(curr.id_from); // non-VT → VT

      // Build grouped segments (unchanged)
      const { id_from: _a, id_to: _b, ...out } = curr;
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
            [{ ...out }]
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
              { ...out }
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

  // Convert Sets to arrays (insertion order preserved by Set iteration)
  const extras   = Array.from(extrasSet);
  const boundary = Array.from(boundarySet);

  return { data, extras, boundary, enroute };
};
