import { Database } from 'sqlite';
import { convertPoint } from './latlon';
import SQL from 'sql-template-strings';

export const extractVORs = async (
  db: Promise<Database>,
  extras: number[]
): Promise<{
  VOROut: string;
  VORNearbyOut: string;
}> => {
  const vors = await (
    await db
  ).all<
    {
      ident: string;
      name: string;
      frequency: number;
      laty: number;
      lonx: number;
    }[]
  >(
    `
    SELECT
    ident, name, frequency, laty, lonx
    FROM
    vor
    WHERE
    region = 'VT'
    `
  );
  let VOROut = '';
  let VORNearbyOut = '';
  const padder1 = '    ';
  const padder2 = '000';
  for (let i = 0; i <= vors.length - 1; i++) {
    const row = vors[i];
    VOROut += (row.ident + padder1).substr(0, 4);
    const num1 = Math.floor(row.frequency / 1000);
    const num2 = row.frequency % 1000;
    VOROut += `${num1}.${(num2 + padder2).substr(0, 3)} `;
    VOROut += convertPoint([row.laty, row.lonx], true);
    VOROut += ` ;- ${row.name}`;
    VOROut += '\n';
  }

  VORNearbyOut += ';- Followings are VOR outside Bangkok FIR\n';

  const ids = `(${extras.join(',')})`;

  const extraVors = (await db).all<
    {
      ident: string;
      frequency: number;
      laty: number;
      lonx: number;
      name: string;
    }[]
  >(
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

  for (const vor of (await extraVors).sort((a, b) =>
    a.ident < b.ident ? -1 : a.ident === b.ident ? 0 : 1
  )) {
    VORNearbyOut += (vor.ident + padder1).substr(0, 4);
    const num1 = Math.floor(vor.frequency / 1000);
    const num2 = vor.frequency % 1000;
    VORNearbyOut += `${num1}.${(num2 + padder2).substr(0, 3)} `;
    VORNearbyOut += convertPoint([vor.laty, vor.lonx], true);
    VORNearbyOut += ` ;- ${vor.name}`;
    VORNearbyOut += '\n';
  }
  return { VOROut, VORNearbyOut };
};
