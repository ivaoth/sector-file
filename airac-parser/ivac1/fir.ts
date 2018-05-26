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
  ['VYYY', 'Yangon', '02'],
  ['WMFC', 'Kuala Lumpur', '03'],
  ['VTBB', 'Bangkok', '04'],
  ['AAAA', 'Dhaka', '05'],
  ['BBBB', 'Kolkata', '06'],
  ['CCCC', 'Guwahati', '07'],
  ['DDDD', 'Chennai', '08']
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
  for (let i = 0; i <= points.length - 2; i++) {
    const point1 = points[i];
    const point2 = points[i + 1];
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
