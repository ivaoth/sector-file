import * as sqlite from 'sqlite';
import { resolve } from 'path';
import {
  writeFileSync,
  ensureDirSync,
  existsSync,
  readFileSync
} from 'fs-extra';
import SQL from 'sql-template-strings';
import { Vor } from '../../utils/interfaces';

interface VorDbData {
  ident: string;
  name: string;
  frequency: number;
  laty: number;
  lonx: number;
}

const main = async () => {
  const basePath = resolve(__dirname);
  const buildPath = resolve(basePath, 'build');
  const vorFile = resolve(buildPath, 'vors.json');
  const extraFile = resolve(buildPath, '_airway-extras.json');

  ensureDirSync(buildPath);
  const db = sqlite.open(
    resolve(basePath, '..', 'little_navmap_navigraph.sqlite')
  );
  const vors: Promise<Vor[]> = (await db).all<VorDbData>(SQL`
    SELECT
    ident, name, frequency, laty, lonx
    FROM
    vor
    WHERE
    region = 'VT'
  `);

  if (existsSync(extraFile)) {
    const extra = JSON.parse(readFileSync(extraFile).toString()) as number[];
    const ids = `(${extra.join(',')})`;
    const extraVors: Promise<Vor[]> = (await db).all<VorDbData>(
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
    writeFileSync(
      vorFile,
      JSON.stringify((await vors).concat(await extraVors), null, 2)
    );
  } else {
    writeFileSync(vorFile, JSON.stringify(await vors, null, 2));
  }
};

main();
