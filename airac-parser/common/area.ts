import SQL from 'sql-template-strings';
import { Database } from 'sqlite';
import { Area } from '../../utils/interfaces';
import { createHash } from 'crypto';

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

const getBoundary = async (
  id: number,
  db: Promise<Database>
): Promise<{
  name: string;
  type: string;
  restrictive_type: string;
  restrictive_designation: string;
  max_laty: number;
  max_lonx: number;
  min_laty: number;
  min_lonx: number;
  multiple_code: string;
  points: [number, number][];
} | null> => {
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
): boolean => {
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

export const extractAreas = async (db: Promise<Database>): Promise<Area[]> => {
  const firName = 'Bangkok';
  const data: Area[] = [];
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
          const pointsBuffer = Buffer.allocUnsafe(
            boundary.points.length * 2 * 4
          );
          let position = 0;
          for (const p of boundary.points) {
            for (const n of p) {
              pointsBuffer.writeFloatBE(n, position);
              position += 4;
            }
          }
          const nameBuffer = Buffer.from(boundary.name, 'utf-8');
          const typeBuffer = Buffer.from(boundary.type, 'utf-8');
          const allBuffer = Buffer.concat([
            pointsBuffer,
            nameBuffer,
            typeBuffer
          ]);
          const sha512 = createHash('sha512');
          sha512.update(allBuffer);
          data.push({
            ...boundary,
            digest: sha512.digest('hex')
          });
        }
      }
    }
  }
  return data;
};
