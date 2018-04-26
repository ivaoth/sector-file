import { Database } from 'sqlite3';
import { all } from '../../tools/helpers/sqlite';
import { existsSync, readFileSync, writeFileSync } from 'fs-extra';
import { resolve } from 'path';

export const buildAirportConfig = async (db: Database) => {
  const airports = await all<{ airport_id: number; ident: string }>(
    db,
    `
      SELECT
      airport_id, ident
      FROM
      airport
      where
      ident LIKE 'VT%'
      AND
      country = 'PAC'`
  );
  const airportConfigPath = resolve(__dirname, '..', 'airport.json');
  let oldConfig: any[];
  if (existsSync(airportConfigPath)) {
    oldConfig = JSON.parse(readFileSync(airportConfigPath).toString());
  } else {
    oldConfig = [];
  }
  let newConfig: any[] = [];
  for (let airport of airports) {
    const oldAirport = oldConfig.find(v => v.ident === airport.ident);
    newConfig.push({
      ...airport,
      airspaceClass: oldAirport ? oldAirport.airspaceClass : ''
    });
  }
  writeFileSync(airportConfigPath, JSON.stringify(newConfig, undefined, 2));
};
