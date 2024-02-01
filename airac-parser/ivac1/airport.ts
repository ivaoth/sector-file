import { Database } from 'sqlite';
import { convertPoint } from './latlon';
import SQL from 'sql-template-strings';

const aptAirspaceMap: {
  [key: string]: 'C' | 'D';
} = {
  VTCH: 'D',
  VTPH: 'D',
  VTBW: 'D',
  VTBP: 'D',
  VTSE: 'D',
  VTSH: 'D',
  VTBD: 'C',
  VTBH: 'C',
  VTBI: 'C',
  VTBK: 'C',
  VTBL: 'C',
  VTBO: 'C',
  VTBS: 'C',
  VTBT: 'C',
  VTBU: 'C',
  VTCC: 'C',
  VTCI: 'C',
  VTCL: 'C',
  VTCN: 'C',
  VTCP: 'C',
  VTCT: 'C',
  VTPB: 'C',
  VTPI: 'C',
  VTPM: 'C',
  VTPN: 'C',
  VTPO: 'C',
  VTPP: 'C',
  VTPR: 'C',
  VTPT: 'C',
  VTPY: 'C',
  VTSB: 'C',
  VTSC: 'C',
  VTSF: 'C',
  VTSG: 'C',
  VTSK: 'C',
  VTSM: 'C',
  VTSN: 'C',
  VTSP: 'C',
  VTSR: 'C',
  VTSS: 'C',
  VTST: 'C',
  VTSY: 'D',
  VTUD: 'C',
  VTUI: 'C',
  VTUK: 'C',
  VTUL: 'C',
  VTUN: 'C',
  VTUO: 'C',
  VTUQ: 'C',
  VTUU: 'C',
  VTUV: 'C',
  VTUW: 'C'
};

const getHdg = (
  airport: {
    airport_id: number;
    ident: string;
    name: string;
    tower_frequency: number | null;
    lonx: number;
    laty: number;
    mag_var: number;
  },
  runway: {
    name1: string;
    hdg1: number;
    lat1: number;
    lon1: number;
    name2: string;
    hdg2: number;
    lat2: number;
    lon2: number;
  },
  num: number
): number => {
  if (num === 1) {
    return Math.round(runway.hdg1 - airport.mag_var);
  } else {
    return Math.round(runway.hdg2 - airport.mag_var);
  }
};

export const extractAirports = async (
  db: Promise<Database>
): Promise<{
  airportOut: string;
  runwayOut: string;
}> => {
  let airportOut = '';
  let runwayOut = '';
  const zeroPadder = '0000000';
  const spacePadder = '       ';
  const data: {
    airport_id: number;
    ident: string;
    name: string;
    tower_frequency: number | null;
    lonx: number;
    laty: number;
    mag_var: number;
  }[] = await (
    await db
  ).all(SQL`
      SELECT
      airport_id, ident, name, tower_frequency, lonx, laty, mag_var
      FROM
      airport
      where
      ident LIKE 'VT%'
      AND
      country = 'PAC'`);
  for (const airport of data) {
    airportOut += airport.ident;
    airportOut += ' ';
    if (airport.tower_frequency) {
      const num1 = Math.floor(airport.tower_frequency / 1000);
      const num2 = airport.tower_frequency % 1000;
      airportOut += `${num1}.${(num2 + zeroPadder).substr(0, 3)} `;
    } else {
      airportOut += '.       ';
    }
    airportOut += convertPoint([airport.laty, airport.lonx], true);
    airportOut += ` ${aptAirspaceMap[airport.ident]} ;- ${airport.name}`;
    airportOut += '\n';
    runwayOut += `;- ${airport.ident}\n`;
    const runways: {
      name1: string;
      hdg1: number;
      lat1: number;
      lon1: number;
      name2: string;
      hdg2: number;
      lat2: number;
      lon2: number;
    }[] = await (
      await db
    ).all(
      `SELECT
      RE1.name as name1, RE1.heading as hdg1, RE1.laty as lat1, RE1.lonx as lon1, RE2.name as name2, RE2.heading as hdg2, RE2.laty as lat2, RE2.lonx as lon2
      FROM
      runway R
      INNER JOIN
      runway_end RE1
      ON
      R.primary_end_id = RE1.runway_end_id
      INNER JOIN
      runway_end RE2
      ON
      R.secondary_end_id = RE2.runway_end_id
      WHERE
      airport_id = ${airport.airport_id}`
    );
    for (const runway of runways) {
      runwayOut += `${(runway.name1 + spacePadder).substring(0, 4)}`;
      runwayOut += `${(runway.name2 + spacePadder).substring(0, 4)}`;
      runwayOut += `${(zeroPadder + getHdg(airport, runway, 1)).substr(-3)} `;
      runwayOut += `${(zeroPadder + getHdg(airport, runway, 2)).substr(-3)} `;
      runwayOut += convertPoint([runway.lat1, runway.lon1], true) + ' ';
      runwayOut += convertPoint([runway.lat2, runway.lon2], true);
      runwayOut += '\n';
    }
  }

  return { airportOut, runwayOut };
};
