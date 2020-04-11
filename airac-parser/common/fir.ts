import * as sqlite from 'sqlite';
import * as sqlite3 from 'sqlite3';
import { resolve } from 'path';
import { writeFileSync, ensureDirSync } from 'fs-extra';
import { Fir } from '../../utils/interfaces';

interface FirDbData {
  geometry: Buffer;
}

const main = async () => {
  const basePath = resolve(__dirname);
  const buildPath = resolve(basePath, 'build');
  const firsPath = resolve(buildPath, 'firs.json');

  ensureDirSync(buildPath);

  const db = sqlite.open({
    filename: resolve(basePath, '..', 'little_navmap_navigraph.sqlite'),
    driver: sqlite3.Database
  });

  const firs = [
    ['VTBB', 'Bangkok'],
    ['VDPP', 'Phnom Penh'],
    ['VLVT', 'Vientiane'],
    ['VVTS', 'Ho Chi Minh'],
    ['VYYY', 'Yangon'],
    ['WMFC', 'Kuala Lumpur'],
    ['WSJC', 'Singapore']
  ];

  const firsOut: Fir[] = [];

  for (let fir of firs) {
    const firData = (await db).get<FirDbData>(`
      SELECT
      geometry
      FROM
      'boundary'
      WHERE
      name LIKE '%${fir[1]}%'
      AND
      type = 'C'
      LIMIT 1
    `);
    const data = (await firData)!.geometry;
    let index = 0;
    const size = data.readInt32BE(index);
    index += 4;
    const points: [number, number][] = [];
    for (let i = 1; i <= size; i++) {
      points.push([data.readFloatBE(index + 4), data.readFloatBE(index)]);
      index += 8;
    }
    firsOut.push({
      name: fir[1],
      code: fir[0],
      points
    });
  }
  writeFileSync(firsPath, JSON.stringify(firsOut, null, 2));
};

main();
