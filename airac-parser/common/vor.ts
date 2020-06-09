import { Database } from 'sqlite';
import SQL from 'sql-template-strings';
import { Vor } from '../../utils/interfaces';

interface VorDbData {
  ident: string;
  name: string;
  frequency: number;
  laty: number;
  lonx: number;
}

export const extractVors = async (
  db: Promise<Database>,
  extra: number[]
): Promise<Vor[]> => {
  const vors: Promise<Vor[]> = (await db).all<VorDbData[]>(SQL`
    SELECT
    ident, name, frequency, laty, lonx
    FROM
    vor
    WHERE
    region = 'VT'
  `);
  const ids = `(${extra.join(',')})`;
  const extraVors: Promise<Vor[]> = (await db).all<VorDbData[]>(
    SQL`
    SELECT
    V.ident, V.name, V.frequency, V.laty, V.lonx
    FROM
    (
      waypoint W
      INNER JOIN
      vor V
      ON W.nav_id = V.vor_id
    )
    WHERE
    w.waypoint_id IN
  `.append(ids).append(SQL`
    AND
    W.type = 'V'
  `)
  );
  return (await vors).concat(await extraVors);
};
