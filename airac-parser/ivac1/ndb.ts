import { Database } from 'sqlite';
import { convertPoint } from './latlon';
import SQL from 'sql-template-strings';

export const extractNDB = async (
  db: Promise<Database>,
  extras: number[]
): Promise<{
  NDBOut: string;
  NDBNearbyOut: string;
}> => {
  const ndbs = await (await db).all<
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
    ndb
    WHERE
    region = 'VT'
    `
  );
  let NDBOut = '';
  let NDBNearbyOut = '';
  const padder1 = '       ';
  const padder2 = '000';
  for (let i = 0; i <= ndbs.length - 1; i++) {
    const row = ndbs[i];
    NDBOut += (row.ident + padder1).substr(0, 6);
    const num1 = Math.floor(row.frequency / 100);
    const num2 = row.frequency % 100;
    NDBOut += `${num1}.${(num2 + padder2).substr(0, 3)} `;
    NDBOut += convertPoint([row.laty, row.lonx], true);
    NDBOut += ` ;- ${row.name}`;
    NDBOut += '\n';
  }

  NDBNearbyOut += ';- Followings are NDB outside Bangkok FIR\n';

  const ids = `(${extras.join(',')})`;

  const extraNdbs: Promise<
    {
      ident: string;
      frequency: number;
      laty: number;
      lonx: number;
      name: string;
    }[]
  > = (await db).all<
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

  for (const ndb of (await extraNdbs).sort((a, b) =>
    a.ident < b.ident ? -1 : a.ident === b.ident ? 0 : 1
  )) {
    NDBNearbyOut += (ndb.ident + padder1).substr(0, 6);
    const num1 = Math.floor(ndb.frequency / 100);
    const num2 = ndb.frequency % 100;
    NDBNearbyOut += `${num1}.${(num2 + padder2).substr(0, 3)} `;
    NDBNearbyOut += convertPoint([ndb.laty, ndb.lonx], true);
    NDBNearbyOut += ` ;- ${ndb.name}`;
    NDBNearbyOut += '\n';
  }

  return { NDBOut, NDBNearbyOut };
};
