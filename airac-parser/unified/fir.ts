import { ensureDirSync, writeFileSync } from 'fs-extra';
import { resolve } from 'path';
import * as sqlite3 from 'sqlite3';
import * as xml from 'xml';

import { Coordinate } from './coordinates/coordinate';
import { convertPoint as ivac1ConvertPoint } from './coordinates/ivac1_coordinate';
import { convertCoordinate as ivac2ConverCoordinate } from './coordinates/ivac2_coordinate';

const basePath = resolve(__dirname);
const buildPath = resolve(basePath, 'build');
const ivac1BuildPath = resolve(buildPath, 'ivac1');
const ivac1FirPath = resolve(ivac1BuildPath, '11-ARTCC');
const ivac2BuildPath = resolve(buildPath, 'ivac2');
const ivac2FirPath = resolve(ivac2BuildPath, 'maps', 'fir');

ensureDirSync(ivac1FirPath);
ensureDirSync(ivac2FirPath);

const db = new sqlite3.Database(
  resolve(basePath, '..', 'little_navmap_navigraph.sqlite')
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

const extractFir = (
  row: { geometry: Buffer },
  name: string,
  num: string,
  fullname: string
) => {
  const data = row.geometry;
  let index = 0;
  const size = data.readInt32BE(index);
  index += 4;
  const points: number[][] = [];
  for (let i = 1; i <= size; i++) {
    points.push([data.readFloatBE(index), data.readFloatBE(index + 4)]);
    index += 8;
  }
  firDataforIvac1(points, name, num);
  firDataforIvac2(points, name, fullname);
};

const firDataforIvac1 = (points: number[][], name: string, num: string) => {
  let out = '';
  for (let i = 0; i <= points.length - 2; i++) {
    const point1 = points[i];
    const point2 = points[i + 1];
    if (i === 0) {
      out += `${name}_CTR`;
    } else {
      out += '        ';
    }
    out += `   ${ivac1ConvertPoint(point1)} ${ivac1ConvertPoint(point2)}\n`;
  }
  out += `   ${ivac1ConvertPoint(
    points[points.length - 1]
  )} ${ivac1ConvertPoint(points[0])}\n`;
  writeFileSync(resolve(ivac1FirPath, `${num}-${name}_CTR.txt`), out);
};

const firDataforIvac2 = (
  points: number[][],
  name: string,
  fullname: string
) => {
  const outXml = { maps: [] as any[] };
  outXml.maps.push({
    map: [
      {
        _attr: {
          id: `${name}_FIR`,
          name: `${fullname} FIR`,
          group: 'geo',
          text: false,
          visible: true,
          layer: 100
        }
      },
      {
        path: [
          {
            _attr: {
              stroke_width: 1,
              stroke_color: 'airspace',
              close: true
            }
          }
        ]
      }
    ]
  });
  const firstPath = outXml.maps[0].map[1].path as any[];
  for (let i = 0; i <= points.length - 1; i++) {
    firstPath.push({
      point: {
        _attr: {
          lat: ivac2ConverCoordinate(points[i][1], Coordinate.Latitude),
          lon: ivac2ConverCoordinate(points[i][0], Coordinate.Longtitude)
        }
      }
    });
  }
  writeFileSync(
    resolve(ivac2FirPath, `${name}.map`),
    xml(outXml, { indent: '  ' }) + '\n'
  );
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
      extractFir(row, fir[0], fir[2], fir[1]);
    }
  );
}
