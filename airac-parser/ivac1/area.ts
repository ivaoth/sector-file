import SQL from 'sql-template-strings';
import { Database } from 'sqlite';
import { convertPoint } from './latlon';

const firName = 'Bangkok';

const drpMap = {
  D: 'Danger',
  R: 'Restricted',
  P: 'Prohibited'
};

const getBoundary = async (
  id: number,
  db: Database
): Promise<{
  name: string;
  boundary_id: number;
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
  }>(SQL`SELECT * FROM 'boundary' WHERE boundary_id = ${id}`);
  if (!data) return null;
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
  point: number[],
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

export const extractAreas = async (
  db: Promise<Database>
): Promise<{ drpOut: string; tmaOut: string }> => {
  const { geometry: fir, ..._firMetadata } = (await (
    await db
  ).get<{
    geometry: Buffer;
    max_laty: number;
    max_lonx: number;
    min_laty: number;
    min_lonx: number;
  }>(
    SQL`SELECT * FROM 'boundary' WHERE name = ${firName.toUpperCase()} AND type = 'FIR' LIMIT 1`
  ))!;
  const firPoints: [number, number][] = [];
  let index = 0;
  const size = fir.readInt32BE(index);
  index += 4;
  for (let i = 1; i <= size; i++) {
    firPoints.push([fir.readFloatBE(index), fir.readFloatBE(index + 4)]);
    index += 8;
  }
  const { count: boundaryCount } = (await (
    await db
  ).get<{ count: number }>(
    SQL`SELECT MAX(boundary_id) AS 'count' FROM 'boundary';`
  ))!;
  let drpOut = '';
  let tmaOut = '';
  for (let i = 1; i <= boundaryCount; i++) {
    const boundary = await getBoundary(i, await db);
    if (boundary && boundary.type !== 'C' && boundary.type !== 'FIR') {
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
          if (boundary.restrictive_type) {
            drpOut += `; VT(${boundary.restrictive_type})-${boundary.restrictive_designation}: ${boundary.name}\n`;
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
            tmaOut += `; ${boundary.name}`;
            if (boundary.multiple_code) {
              tmaOut += ` [${boundary.multiple_code}]`;
            }
            tmaOut += ` (${boundary.type})\n`;
            for (let i = 0; i <= boundary.points.length - 1; i++) {
              const point1 = boundary.points[i];
              const point2 =
                i === boundary.points.length - 1
                  ? boundary.points[0]
                  : boundary.points[i + 1];
              tmaOut += `           ${convertPoint(point1)} ${convertPoint(
                point2
              )}\n`;
            }
          }
        }
      }
    }
  }
  return { drpOut, tmaOut };
};
