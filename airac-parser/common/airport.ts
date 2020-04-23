import { Database } from 'sqlite';
import { SQL } from 'sql-template-strings';
import { Airport } from '../../utils/interfaces';

const aptAirspaceMap: any = {
  VTCH: "D",
  VTPH: "D",
  VTUJ: "D",
  VTBW: "D",
  VTBP: "D",
  VTSE: "D",
  VTSH: "D",
  VTBD: "C",
  VTBH: "C",
  VTBI: "C",
  VTBK: "C",
  VTBL: "C",
  VTBO: "C",
  VTBS: "C",
  VTBT: "C",
  VTBU: "C",
  VTCC: "C",
  VTCI: "C",
  VTCL: "C",
  VTCN: "C",
  VTCP: "C",
  VTCT: "C",
  VTPB: "C",
  VTPI: "C",
  VTPM: "C",
  VTPN: "C",
  VTPO: "C",
  VTPP: "C",
  VTPR: "C",
  VTPT: "C",
  VTPY: "C",
  VTSB: "C",
  VTSC: "C",
  VTSF: "C",
  VTSG: "C",
  VTSK: "C",
  VTSM: "C",
  VTSN: "C",
  VTSP: "C",
  VTSR: "C",
  VTSS: "C",
  VTST: "C",
  VTUD: "C",
  VTUI: "C",
  VTUK: "C",
  VTUL: "C",
  VTUN: "C",
  VTUO: "C",
  VTUQ: "C",
  VTUU: "C",
  VTUV: "C",
  VTUW: "C"
};

interface AirportDbData {
  airport_id: number;
  ident: string;
  name: string;
  tower_frequency: number | null;
  lonx: number;
  laty: number;
  mag_var: number;
  altitude: number;
}

interface RunwayDbData {
  airport_id: number;
  runway1: string;
  ils1: string;
  lon1: number;
  lat1: number;
  hdg1: number;
  alt1: number;
  runway2: string;
  ils2: string;
  lon2: number;
  lat2: number;
  hdg2: number;
  alt2: number;
}

export const extractAerodromes = async (db: Promise<Database>) => {
  const data: Airport[] = [];
  const airports = (await db).all<AirportDbData[]>(SQL`
  SELECT
    airport_id, ident, name, tower_frequency, lonx, laty, mag_var, altitude
  FROM
    airport
  where
    region = "VT"
  `);
  const runways = (await db).all<RunwayDbData[]>(SQL`
  SELECT
    airport.airport_id,
    RE1.name AS runway1,
    RE1.ils_ident AS ils1,
    RE1.lonx AS lon1,
    RE1.laty AS lat1,
    RE1.heading AS hdg1,
    RE1.altitude AS alt1,
    RE2.name AS runway2,
    RE2.ils_ident AS ils2,
    RE2.lonx AS lon2,
    RE2.laty AS lat2,
    RE2.heading AS hdg2,
    RE2.altitude AS alt2
  FROM
  (
    runway_end RE1
    INNER JOIN
    runway_end RE2
    INNER JOIN
    runway
    INNER JOIN
    airport
  )
  WHERE
  (
    airport.region = "VT"
    AND
    runway.airport_id = airport.airport_id
    AND
    runway.primary_end_id = RE1.runway_end_id
    AND
    runway.secondary_end_id = RE2.runway_end_id
  );
  `);
  for (let airport of await airports) {
    const { airport_id: _, ...airportData } = airport;
    const a: Airport = {
      ...airportData,
      runways: (await runways)
        .filter(r => r.airport_id === airport.airport_id)
        .map(r => {
          const { airport_id: _, ...others } = r;
          return others;
        }),
      airspaceClass: aptAirspaceMap[airport.ident]
    };
    data.push(a);
  }
  return data;
};
