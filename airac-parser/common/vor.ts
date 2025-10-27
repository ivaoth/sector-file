import { Database } from 'sqlite';
import SQL from 'sql-template-strings';
import { Vor } from '../../utils/interfaces';

interface VorDbData {
  ident: string;
  name: string;
  type: string;
  frequency: number;
  channel: string;
  dme_only: number;
  dme_altitude: number;
  laty: number;
  lonx: number;
}

interface VorDbExtraRow extends VorDbData {
  waypoint_id: number;
}

export const extractVors = async (
  db: Promise<Database>,
  extra: number[],
  boundary: number[]
): Promise<Vor[]> => {

  const boundarySet = new Set(boundary);

  const addIsExtra =
    (isExtra: boolean) =>
    (s: VorDbData[]): Vor[] => {
      return s.map((w) => {
        const { type, dme_altitude, dme_only, ...others } = w;
        return {
          ...others,
          is_vor: type === 'H' || type === 'L',
          is_vor_only: dme_altitude === null,
          is_dme_only: dme_only === 1,
          is_tacan: !!w.channel,
          is_extra: isExtra
        }
      });
    };

  const vors: Promise<Vor[]> = (await db).all<VorDbData[]>(SQL`
    SELECT
    ident, name, type, frequency, channel, dme_only, dme_altitude, laty, lonx
    FROM
    vor
    WHERE
    region = 'VT'
  `)
  .then(addIsExtra(false));;
  
  const ids = `(${extra.join(',')})`;
  const extraVors: Promise<Vor[]> = (await db)
    .all<VorDbExtraRow[]>(
      SQL`
        SELECT
          W.waypoint_id AS waypoint_id,
          V.ident, V.name, V.type, V.frequency, V.channel, V.dme_only, V.dme_altitude, V.laty, V.lonx
        FROM
          waypoint W
          INNER JOIN vor V ON W.nav_id = V.vor_id
        WHERE
          W.waypoint_id IN
      `.append(ids).append(SQL`
          AND W.type = 'V'
      `)
    )
    .then((rows) =>
      rows.map((r) => {
        const { waypoint_id, type, dme_altitude, dme_only, ...others } = r;
        const t = (type ?? '').toUpperCase();
        const isExtraFlag = !boundarySet.has(waypoint_id); // boundary-linked → NOT extra

        return {
          ...others,                                     // ident, name, frequency, channel, laty, lonx
          is_vor: t === 'H' || t === 'L',
          is_vor_only: dme_altitude === null,
          is_dme_only: dme_only === 1,
          is_tacan: !!r.channel,
          is_extra: isExtraFlag
        } as Vor;
      })
    );

  return (await vors).concat(await extraVors);
};
