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

interface NdbDbExtraRow extends NdbDbData {
  waypoint_id: number;
}

export const extractNdbs = async (
  db: Promise<Database>,
  extra: number[],
  boundary: number[]
): Promise<Ndb[]> => {

  const boundarySet = new Set(boundary);

  const addIsExtra =
    (isExtra: boolean) =>
    (s: NdbDbData[]): Ndb[] => {
      return s.map((w) => {
        const { ...others } = w;
        return {
          ...others,
          is_extra: isExtra
        };
      });
    };

  const ndbs: Promise<Ndb[]> = (await db).all<NdbDbData[]>(SQL`
    SELECT
    ident, name, frequency, laty, lonx
    FROM
    ndb
    WHERE
    region = 'VT'
  `)
  .then(addIsExtra(false));

  const ids = `(${extra.join(',')})`;
  
  const extraNdbs: Promise<Ndb[]> = (await db)
    .all<NdbDbExtraRow[]>(
      SQL`
        SELECT
          W.waypoint_id AS waypoint_id,
          N.ident, N.name, N.frequency, N.laty, N.lonx
        FROM
          waypoint W
          INNER JOIN ndb N ON W.nav_id = N.ndb_id
        WHERE
          W.waypoint_id IN
      `.append(ids).append(SQL`
          AND W.type = 'N'
      `)
    )
    .then((rows) =>
      rows.map((r) => {
        const { waypoint_id, ...rest } = r;
        const isExtraFlag = !boundarySet.has(waypoint_id); // boundary-linked → NOT extra
        return {
          ...rest,
          is_extra: isExtraFlag
        } as Ndb;
      })
    );

  return (await ndbs).concat(await extraNdbs);
};