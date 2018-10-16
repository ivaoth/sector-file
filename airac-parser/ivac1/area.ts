import { open, Database } from 'sqlite';
import { resolve } from 'path';
import { Coordinate, convertCoordinate, convertPoint } from './latlon';
import { writeFileSync, ensureDirSync } from 'fs-extra';
import * as inquirer from 'inquirer';

const basePath = resolve(__dirname);
const buildGeoPath = resolve(basePath, 'build', '14-GEO');
const buildLowArtccPath = resolve(basePath, 'build', '13-ARTCC_LO');

ensureDirSync(buildGeoPath);
ensureDirSync(buildLowArtccPath);

const firName = 'Bangkok';

const drpMap = {
  D: 'Danger',
  R: 'Restricted',
  P: 'Prohibited'
};

const getBoundary = async (id: number, db: Database) => {
  const data = await db.get<{
    name: string;
    geometry: Buffer;
    boundary_id: number;
    type: string;
    restrictive_type: string;
    restrictive_designation: string;
    max_laty: number;
    max_lonx: number;
    min_laty: number;
    min_lonx: number;
    multiple_code: string;
  }>(`SELECT * FROM 'boundary' WHERE boundary_id = ${id}`);
  if (!data) return null;
  const { geometry: fir, ...otherData } = data;
  const points: number[][] = [];
  let index = 0;
  const size = fir.readInt32BE(index);
  index += 4;
  for (let i = 1; i <= size; i++) {
    points.push([fir.readFloatBE(index), fir.readFloatBE(index + 4)]);
    index += 8;
  }
  return { ...otherData, points };
};

const pointInPolygon = (point: number[], polygon: number[][]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const intersect =
      polygon[i][0] > point[0] !== polygon[j][0] > point[0] &&
      point[1] <
        ((polygon[j][1] - polygon[i][1]) * (point[0] - polygon[i][0])) /
          (polygon[j][0] - polygon[i][0]) +
          polygon[i][1];
    if (intersect) inside = !inside;
  }
  return inside;
};

const main = async () => {
  const db = await open(
    resolve(basePath, '..', 'little_navmap_navigraph.sqlite')
  );
  const { geometry: fir, ...firMetadata } = await db.get<{
    geometry: Buffer;
    max_laty: number;
    max_lonx: number;
    min_laty: number;
    min_lonx: number;
  }>(
    `SELECT * FROM 'boundary' WHERE name LIKE '%${firName}%' AND type = 'C' LIMIT 1`
  );
  const firPoints: number[][] = [];
  let index = 0;
  const size = fir.readInt32BE(index);
  index += 4;
  for (let i = 1; i <= size; i++) {
    firPoints.push([fir.readFloatBE(index), fir.readFloatBE(index + 4)]);
    index += 8;
  }
  const { count: boundaryCount } = await db.get<{ count: number }>(
    `SELECT MAX(boundary_id) AS 'count' FROM 'boundary';`
  );
  let drpOut = '';
  let tmaOut = '';
  for (let i = 1; i <= boundaryCount; i++) {
    const boundary = await getBoundary(i, db);
    if (boundary) {
      let inside = 0;
      for (let j = 0; j < boundary.points.length; j++) {
        const point = boundary.points[j];
        if (pointInPolygon(point, firPoints)) {
          inside += 1;
        }
      }
      if (inside > 1) {
        const mid_laty = (boundary.max_laty + boundary.min_laty) / 2;
        const mid_lonx = (boundary.max_lonx + boundary.min_lonx) / 2;
        if (pointInPolygon([mid_lonx, mid_laty], firPoints)) {
          let questionText = `Use (${boundary.boundary_id}) ${boundary.name}`;
          if (boundary.restrictive_type) {
            questionText += ` VT(${boundary.restrictive_type})-${
              boundary.restrictive_designation
            }`;
          }
          questionText += '?';
          if (
            inside === boundary.points.length ||
            (await inquirer.prompt<{ use: boolean }>({
              type: 'confirm',
              name: 'use',
              message: questionText
            })).use
          ) {
            if (boundary.restrictive_type) {
              drpOut += `; VT(${boundary.restrictive_type})-${
                boundary.restrictive_designation
              }: ${boundary.name}\n`;
              for (let j = 0; j <= boundary.points.length - 1; j++) {
                const point1 = boundary.points[j];
                const point2 =
                  j === boundary.points.length - 1
                    ? boundary.points[0]
                    : boundary.points[j + 1];
                drpOut += `${convertPoint(point1)} ${convertPoint(point2)} ${
                  drpMap[boundary.restrictive_type as 'D' | 'R' | 'P']
                }\n`;
              }
            } else {
              tmaOut += `; ${boundary.name}`
              if (boundary.multiple_code) {
                tmaOut += ` [${boundary.multiple_code}]`
              }
              tmaOut += ` (${boundary.type})\n`
              for (let i = 0; i <= boundary.points.length - 1; i++) {
                const point1 = boundary.points[i];
                const point2 = i === boundary.points.length - 1 ? boundary.points[0] : boundary.points[i + 1];
                tmaOut += `           ${convertPoint(point1)} ${convertPoint(point2)}\n`;
              }
            }
          }
        }
      }
    }
  }
  writeFileSync(resolve(buildGeoPath, '04-DRP_AREA.txt'), drpOut);
  writeFileSync(resolve(buildLowArtccPath, '02-TMA_CTR.txt'), tmaOut);
};

main().then(() => {
  console.log('Done');
});
