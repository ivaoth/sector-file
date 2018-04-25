import { resolve } from 'path';
import { ensureDirSync, writeFileSync } from 'fs-extra';
import { convertPoint } from './coordinates/ivac1_coordinate';
import { convertCoordinate } from './coordinates/ivac2_coordinate';
import { Coordinate } from './coordinates/coordinate';
import * as xml from 'xml';

const sectors = [
  [
    [100.5966944, 13.9183333],
    [100.8300278, 13.3350278],
    [100.8300278, 12.6850833],
    [100.8513889, 12.4166667],
    [101.4172222, 10.6916667],
    [100.9966944, 11.0018889],
    [99.5801944, 11.6684722],
    null,
    [99.2135556000001, 13.5016667]
  ],
  [
    [100.5966944, 13.9183333],
    [102.0498333, 16.2248333],
    [103, 16.1633333],
    [103, 14.2172222]
  ],
  [
    [100.5966944, 13.9183333],
    [103, 14.2172222],
    null,
    [102.9833333, 11.6216667],
    null,
    [102.6, 10.85],
    null,
    [102.25, 10],
    [101.4172222, 10.6916667],
    [100.8513889, 12.4166667],
    [100.8300278, 12.6850833],
    [100.8300278, 13.3350278]
  ],
  [
    [100.5966944, 13.9183333],
    [99.2135556000001, 13.5016667],
    null,
    [98.9102222, 16.3847778],
    [102.0498333, 16.2248333]
  ],
  [
    [100.0035833, 9.0443889],
    [99.9965556, 6.7906944],
    [98.3063028, 8.1152306],
    [97.8216666999999, 10.0019167],
    null,
    [98.7537778, 10.3927778]

    // This is original Sector 5
    // [99.9968056, 11.4851667],
    // [99.9968056, 6.4355278],
    // null,
    // [99.4969166999999, 6.5021944],
    // [97.9970833, 7.2521389],
    // [96.49725, 10.0019167],
    // [98.6469999999999, 10.0019167],
    // null,
    // [99.5801944, 11.6684722]
  ],
  [
    [100.0035833, 9.0443889],
    [101.6279444, 10.0455556],
    [101.4172222, 10.6916667],
    [102.25, 10],
    null,
    [103, 7],
    null,
    [102.2775, 6.285],
    null,
    [99.9968056, 6.4355278]

    // This is original Sector 6
    // [99.9968056, 11.4851667],
    // [100.9966944, 11.0018889],
    // [101.4172222, 10.6916667],
    // [102.25, 10],
    // null,
    // [103, 7],
    // null,
    // [102.2775, 6.285],
    // null,
    // [99.9968056, 6.4355278]
  ],
  [[98.9102222, 16.3847778], null, [103, 17.9808333], [103, 16.1633333]],
  [[103, 17.9808333], null, [103, 14.2172222]],
  [
    [99.9965556, 6.7906944],
    [99.9968056, 6.4355278],
    null,
    [99.4969166999999, 6.5021944],
    null,
    [97.9970833, 7.2521389],
    null,
    [96.49725, 10.0019167],
    null,
    [97.8216666999999, 10.0019167],
    [98.3063028, 8.1152306]
  ],
  [
    [99.5801944, 11.6684722],
    [100.9966944, 11.0018889],
    [101.4172222, 10.6916667],
    [101.6279444, 10.0455556],
    [100.0035833, 9.0443889],
    [98.7537778, 10.3927778],
    null
  ]
];

const sectorNames = ['1', '2', '3', '4', '5', '6', '7', '8', '5/1', '5/2'];

const basePath = resolve(__dirname);
const buildPath = resolve(basePath, 'build');
const ivac1BuildPath = resolve(buildPath, 'ivac1');
const ivac1FirPath = resolve(ivac1BuildPath, '11-ARTCC');
const ivac2BuildPath = resolve(buildPath, 'ivac2');
const ivac2FirPath = resolve(ivac2BuildPath, 'maps', 'fir');

ensureDirSync(ivac1FirPath);
ensureDirSync(ivac2FirPath);

const sectorsDataToIvac1 = () => {
  let out = '; Bangkok FIR Sectors';
  for (let sector of sectors) {
    for (let i = 0; i <= sector.length - 1; i++) {
      const point1 = sector[i];
      const point2 = i === sector.length - 1 ? sector[0] : sector[i + 1];
      if (point1 && point2) {
        out += `           ${convertPoint(point1)} ${convertPoint(point2)}\n`;
      }
    }
  }
  writeFileSync(resolve(ivac1FirPath, `09-VTBB_CTR-SECTORS.txt`), out);
};

const sectorsDataToIvac2 = () => {
  const outXml = { maps: [] as any[] };
  for (let i = 0; i <= sectors.length - 1; i++) {
    const sector = sectors[i];
    outXml.maps.push({
      map: [
        {
          _attr: {
            id: `vtbbsec${sectorNames[i]}`,
            name: `Sector ${sectorNames[i]} Boundary`,
            group: 'vtbbradar',
            text: false,
            visible: true,
            layer: 101
          }
        },
        {
          lines: [
            {
              _attr: {
                stroke_width: 1,
                stroke_color: 'ctr_sectors',
                stroke_pattern: '2'
              }
            }
          ]
        }
      ]
    });
    const firstLines = outXml.maps[i].map[1].lines as any[];
    for (let j = 0; j <= sector.length - 1; j++) {
      const point1 = sector[j];
      const point2 = j === sector.length - 1 ? sector[0] : sector[j + 1];
      if (point1 && point2) {
        firstLines.push({
          point: {
            _attr: {
              lat: convertCoordinate(point1[1], Coordinate.Latitude),
              lon: convertCoordinate(point1[0], Coordinate.Longtitude)
            }
          }
        });
        firstLines.push({
          point: {
            _attr: {
              lat: convertCoordinate(point2[1], Coordinate.Latitude),
              lon: convertCoordinate(point2[0], Coordinate.Longtitude)
            }
          }
        });
      }
    }
  }
  writeFileSync(
    resolve(ivac2FirPath, `VTBB-sectors.map`),
    xml(outXml, { indent: '  ' }) + '\n'
  );
};

sectorsDataToIvac1();
sectorsDataToIvac2();
