import { Database } from 'sqlite';
import SQL from 'sql-template-strings';
import { Ndb } from '../../utils/interfaces';

interface NdbDbData {
  ident: string;
  name: string;
  frequency: number;
  laty: number;
  lonx: number;
}

export const extractNdbs = async (db: Promise<Database>, extra: number[]) => {
  const ndbs: Promise<Ndb[]> = (await db).all<NdbDbData[]>(SQL`
    SELECT
    ident, name, frequency, laty, lonx
    FROM
    ndb
    WHERE
    region = 'VT'
  `);
  const ids = `(${extra.join(',')})`;
  const extraNdbs: Promise<Ndb[]> = (await db).all<NdbDbData[]>(
    SQL`
    SELECT
    N.ident, N.name, N.frequency, N.laty, N.lonx
    FROM
    (
      waypoint W
      INNER JOIN
      ndb N
      ON W.nav_id = N.ndb_id
    )
    WHERE
    w.waypoint_id IN
  `.append(ids).append(SQL`
    AND
    W.type = 'N'
  `)
  );
  return (await ndbs).concat(await extraNdbs);
};
