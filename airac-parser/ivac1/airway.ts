import { Database } from 'sqlite';

export const extractAirways = async (
  db: Promise<Database>
): Promise<{
  hiAirwayOut: string;
  lowAirwayOut: string;
  extras: number[];
}> => {
  const extras: number[] = [];
  const rows = await (
    await db
  ).all<
    {
      airway_name: string;
      wpt_from: string;
      wpt_to: string;
      airway_id: number;
      airway_fragment_no: number;
      sequence_no: number;
      region_from: string;
      region_to: string;
      id_from: number;
      id_to: number;
    }[]
  >(
    `
      SELECT
      airway.airway_name, airway.sequence_no, T1.ident as wpt_from, T2.ident as wpt_to, airway.airway_id, airway.airway_fragment_no, T1.region as region_from, T2.region as region_to, T1.waypoint_id AS id_from, T2.waypoint_id AS id_to
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
        airway.airway_type = 'J'
        OR
        airway.airway_type = 'B'
      )
      AND
      (
        T1.region = 'VT'
        OR
        T2.region = 'VT'
      )
      ORDER BY airway_id
      `
  );

  let hiAirwayOut = '[HIGH AIRWAY]\n';
  const padder1 = '                          ';
  const padder2 = '                             ';
  let prev_frag = 0,
    prev_name = '',
    prev_seq = 0;
  for (let i = 0; i <= rows.length - 1; i++) {
    const row = rows[i];
    if (
      i === 0 ||
      row.airway_name !== prev_name ||
      row.airway_fragment_no !== prev_frag ||
      row.sequence_no !== prev_seq + 1
    ) {
      hiAirwayOut += (row.airway_name + padder1).substr(0, 26);
    } else {
      hiAirwayOut += padder1;
    }
    hiAirwayOut += (row.wpt_from + padder2).substr(0, 29);
    hiAirwayOut += ' ';
    hiAirwayOut += (row.wpt_to + padder2).substr(0, 29);
    hiAirwayOut += '\n';
    prev_frag = row.airway_fragment_no;
    prev_name = row.airway_name;
    prev_seq = row.sequence_no;
    if (row.region_from !== 'VT') {
      if (extras.indexOf(row.id_from) === -1) {
        extras.push(row.id_from);
      }
    }
    if (row.region_to !== 'VT') {
      if (extras.indexOf(row.id_to) === -1) {
        extras.push(row.id_to);
      }
    }
  }

  const rows2 = await (
    await db
  ).all<
    {
      airway_name: string;
      wpt_from: string;
      wpt_to: string;
      airway_id: number;
      airway_fragment_no: number;
      sequence_no: number;
      region_from: string;
      region_to: string;
      id_from: number;
      id_to: number;
    }[]
  >(
    `
      SELECT
      airway.airway_name, airway.sequence_no, T1.ident as wpt_from, T2.ident as wpt_to, airway.airway_id, airway.airway_fragment_no, T1.region as region_from, T2.region as region_to, T1.waypoint_id AS id_from, T2.waypoint_id AS id_to
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
        airway.airway_type = 'V'
        OR
        airway.airway_type = 'B'
      )
      AND
      (
        T1.region = 'VT'
        OR
        T2.region = 'VT'
      )
      ORDER BY airway_id
      `
  );
  let lowAirwayOut = '[LOW AIRWAY]\n';
  prev_frag = 0;
  prev_name = '';
  prev_seq = 0;
  for (let i = 0; i <= rows2.length - 1; i++) {
    const row = rows2[i];
    if (
      i === 0 ||
      row.airway_name !== prev_name ||
      row.airway_fragment_no !== prev_frag ||
      row.sequence_no !== prev_seq + 1
    ) {
      lowAirwayOut += (row.airway_name + padder1).substr(0, 26);
    } else {
      lowAirwayOut += padder1;
    }
    lowAirwayOut += (row.wpt_from + padder2).substr(0, 29);
    lowAirwayOut += ' ';
    lowAirwayOut += (row.wpt_to + padder2).substr(0, 29);
    lowAirwayOut += '\n';
    prev_frag = row.airway_fragment_no;
    prev_name = row.airway_name;
    prev_seq = row.sequence_no;
    if (row.region_from !== 'VT') {
      if (extras.indexOf(row.id_from) === -1) {
        extras.push(row.id_from);
      }
    }
    if (row.region_to !== 'VT') {
      if (extras.indexOf(row.id_to) === -1) {
        extras.push(row.id_to);
      }
    }
  }
  return { hiAirwayOut, lowAirwayOut, extras };
};
