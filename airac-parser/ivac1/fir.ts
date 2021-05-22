import { Database } from 'sqlite';
import { convertPoint } from './latlon';

export const extractFir = async (
  db: Promise<Database>,
  name: string,
  code: string
): Promise<string> => {
  const row = (await (
    await db
  ).get<{ geometry: Buffer }>(
    `SELECT
    *
    FROM
    'boundary'
    WHERE
    name LIKE '%${name}%'
    AND
    type = 'C'
    LIMIT 1`
  ))!;
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
      out += `${code}_CTR`;
    } else {
      out += '        ';
    }
    out += `   ${convertPoint(point1)} ${convertPoint(point2)}\n`;
  }
  return out;
};
