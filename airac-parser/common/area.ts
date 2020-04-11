import { ensureDirSync, writeFileSync } from 'fs-extra';
import { resolve } from 'path';
import SQL from 'sql-template-strings';
import { Database, open } from 'sqlite';
import * as sqlite3 from 'sqlite3';
import { Area } from '../../utils/interfaces';

interface AreaDbData {
  name: string;
  geometry: Buffer;
  type: string;
  restrictive_type: string;
  restrictive_designation: string;
  max_laty: number;
  max_lonx: number;
  min_laty: number;
  min_lonx: number;
  multiple_code: string;
}

const getBoundary = async (id: number, db: Promise<Database>) => {
  const data = await (await db).get<AreaDbData>(SQL`
    SELECT
      name,
      geometry,
      type,
      restrictive_type,
      restrictive_designation,
      max_laty,
      max_lonx,
      min_laty,
      min_lonx,
      multiple_code
    FROM
      'boundary'
    WHERE
      boundary_id = ${id}
  `);
  if (!data) {
    return null;
  }
  const { geometry: fir, ...otherData } = data;
  const points: [number, number][] = [];
  let index = 0;
  const size = fir.readInt32BE(index);
  index += 4;
  for (let i = 1; i <= size; i++) {
    points.push([fir.readFloatBE(index), fir.readFloatBE(index + 4)]);
    index += 8;
  }
  return { ...otherData, points };
};

const pointInPolygon = (
  point: [number, number],
  polygon: [number, number][]
) => {
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
  const firName = 'Bangkok';
  const basePath = resolve(__dirname);
  const buildPath = resolve(basePath, 'build');
  const buildFile = resolve(buildPath, 'areas.json');
  const data: Area[] = [];
  ensureDirSync(buildPath);
  const db = open({filename: resolve(basePath, '..', 'little_navmap_navigraph.sqlite'), driver: sqlite3.Database});
  const { geometry: fir } = (await (await db).get<{
    geometry: Buffer;
  }>(
    `SELECT geometry FROM 'boundary' WHERE name LIKE '%${firName}%' AND type = 'C' LIMIT 1`
  ))!;
  const firPoints: [number, number][] = [];
  let index = 0;
  const size = fir.readInt32BE(index);
  index += 4;
  for (let i = 1; i <= size; i++) {
    firPoints.push([fir.readFloatBE(index), fir.readFloatBE(index + 4)]);
    index += 8;
  }
  const { count: boundaryCount } = (await (await db).get<{ count: number }>(
    SQL`SELECT MAX(boundary_id) AS 'count' FROM 'boundary';`
  ))!;
  for (let i = 1; i <= boundaryCount; i++) {
    const boundary = await getBoundary(i, db);
    if (boundary && boundary.type !== 'C') {
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
          data.push(boundary);
        }
      }
    }
  }
  writeFileSync(buildFile, JSON.stringify(data, null, 2));
};

main();
