import * as sqlite from 'sqlite';
import * as sqlite3 from 'sqlite3';
import { resolve } from 'path';
import { writeFileSync, ensureDirSync, readFileSync } from 'fs-extra';
import SQL from 'sql-template-strings';
import * as inquirer from 'inquirer';
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

const main = async () => {
  const basePath = resolve(__dirname);
  const buildPath = resolve(basePath, 'build');
  const buildFile = resolve(buildPath, 'airways.json');
  const extraFile = resolve(buildPath, '_airway-extras.json');

  ensureDirSync(buildPath);

  const db = sqlite.open({
    filename: resolve(basePath, '..', 'little_navmap_navigraph.sqlite'),
    driver: sqlite3.Database
  });

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

  const { data } = (await filteredSegments).reduce(
    (prev, curr) => {
      const { data: currData, ...others } = prev;
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
      const {id_from: _, id_to: __, ...out} = curr;
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
        const { currentSequence: currSeq, ...others2 } = others;
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

  writeFileSync(buildFile, JSON.stringify(data, null, 2));
  writeFileSync(extraFile, JSON.stringify(extras, null, 2))
};

main();
