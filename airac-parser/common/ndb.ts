import * as sqlite from 'sqlite';
import { resolve } from 'path';
import {
  writeFileSync,
  ensureDirSync,
  existsSync,
  readFileSync
} from 'fs-extra';
import SQL from 'sql-template-strings';
import { Ndb } from '../../utils/interfaces';

interface NdbDbData {
  ident: string;
  name: string;
  frequency: number;
  laty: number;
  lonx: number;
}

const main = async () => {
  const basePath = resolve(__dirname);
  const buildPath = resolve(basePath, 'build');
  const ndbFile = resolve(buildPath, 'ndbs.json');
  const extraFile = resolve(buildPath, '_airway-extras.json');

  ensureDirSync(buildPath);
  const db = sqlite.open(
    resolve(basePath, '..', 'little_navmap_navigraph.sqlite')
  );
  const ndbs: Promise<Ndb[]> = (await db).all<NdbDbData>(SQL`
    SELECT
    ident, name, frequency, laty, lonx
    FROM
    ndb
    WHERE
    region = 'VT'
  `);

  if (existsSync(extraFile)) {
    const extra = JSON.parse(readFileSync(extraFile).toString()) as number[];
    const ids = `(${extra.join(',')})`;
    const extraNdbs: Promise<Ndb[]> = (await db).all<NdbDbData>(
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
    writeFileSync(
      ndbFile,
      JSON.stringify((await ndbs).concat(await extraNdbs), null, 2)
    );
  } else {
    writeFileSync(ndbFile, JSON.stringify(await ndbs, null, 2));
  }
};

main();
