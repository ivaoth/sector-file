import * as sqlite3 from 'sqlite3';
import { resolve } from 'path';
import { Coordinate, convertCoordinate, convertPoint } from './latlon';
import { writeFileSync, ensureDirSync } from 'fs-extra';

const basePath = resolve(__dirname);
const buildPath = resolve(basePath, 'build', '11-ARTCC');

ensureDirSync(buildPath);

const db = new sqlite3.Database(
  resolve(basePath, '..' , 'little_navmap_navigraph.sqlite')
);

const firs = [
  ['VTBB', 'Bangkok', '02'],
  ['VDPP', 'Phnom Penh', '03'],
  ['VLVT', 'Vientiane', '04'],
  ['VVTS', 'Ho Chi Minh', '05'],
  ['VYYY', 'Yangon', '06'],
  ['WMFC', 'Kuala Lumpur', '07'],
  ['WSJC', 'Singapore', '08']
];

const extractFir = (row: { geometry: Buffer }, name: string, num: string) => {
  const data = row.geometry;
  let index = 0;
  const size = data.readInt32BE(index);
  index += 4;
  const points: number[][] = [];
  for (let i = 1; i <= size; i++) {
    points.push([data.readFloatBE(index), data.readFloatBE(index + 4)]);
    index += 8;
  }
  let out = '';
  for (let i = 0; i <= points.length - 1; i++) {
    const point1 = points[i];
    const point2 = i === points.length - 1 ? points[0] : points[i + 1];
    if (i === 0) {
      out += `${name}_CTR`;
    } else {
      out += '        ';
    }
    out += `   ${convertPoint(point1)} ${convertPoint(point2)}\n`;
  }
  writeFileSync(resolve(buildPath, `${num}-${name}_CTR.txt`), out);
};

for (let fir of firs) {
  db.get(
    `SELECT
  *
  FROM
  'boundary'
  WHERE
  name LIKE '%${fir[1]}%'
  AND
  type = 'C'
  LIMIT 1`,
    (err: any, row: { geometry: Buffer }) => {
      extractFir(row, fir[0], fir[2]);
    }
  );
}
