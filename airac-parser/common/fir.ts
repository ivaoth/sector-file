import { Database } from 'sqlite';
import { Fir } from '../../utils/interfaces';

interface FirDbData {
  geometry: Buffer;
}

export const extractFirs = async (db: Promise<Database>): Promise<Fir[]> => {
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

  for (const fir of firs) {
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
  return firsOut;
};
