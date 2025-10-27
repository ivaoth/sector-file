import {
  copySync,
  existsSync,
  readFileSync,
  removeSync,
  writeFileSync,
  ensureDirSync
} from 'fs-extra';
import { resolve } from 'path';
import {
  Airport,
  Fir,
  Metadata,
  Ndb,
  Segment,
  Vor,
  Waypoint,
  Area,
  AreaDetail
} from '../utils/interfaces';
import { formatAirways } from './utils/formatAirways';
import { zipDirectory } from './utils/zipFolder';

const basePath = resolve(__dirname);
const rootPath = resolve(basePath, '..');
const dataPath = resolve(rootPath, 'data');
const generatedDataPath = resolve(dataPath, 'generated');
const buildPath = resolve(rootPath, 'build');
const resultPath = resolve(rootPath, 'result');
const outPath = resolve(buildPath, 'aurora');
const outFile = resolve(outPath, `Bangkok FIR (VTBB).isc`);

const metadataFile = resolve(dataPath, 'metadata.json');
const airportsFile = resolve(generatedDataPath, 'airports.json');
const waypointsFile = resolve(generatedDataPath, 'waypoints.json');
const ndbsFile = resolve(generatedDataPath, 'ndbs.json');
const vorsFile = resolve(generatedDataPath, 'vors.json');
const airwaysFile = resolve(generatedDataPath, 'airways.json');
const firsFile = resolve(generatedDataPath, 'firs.json');
const areasFile = resolve(generatedDataPath, 'areas.json');
const geoFile = resolve(dataPath, 'geo.json');
const areaDetailsFile = resolve(dataPath, 'area-details.json');
const auroraPath = resolve(dataPath, 'aurora');
const extraFilesFile = resolve(auroraPath, 'files.json');
const resultFile = resolve(resultPath, 'vtbb-aurora.zip');

let out = '';

const metadata = JSON.parse(readFileSync(metadataFile).toString()) as Metadata;
const airports = JSON.parse(readFileSync(airportsFile).toString()) as Airport[];
const waypoints = JSON.parse(
  readFileSync(waypointsFile).toString()
) as Waypoint[];
const ndbs = JSON.parse(readFileSync(ndbsFile).toString()) as Ndb[];
const vors = JSON.parse(readFileSync(vorsFile).toString()) as Vor[];
const airways = JSON.parse(readFileSync(airwaysFile).toString()) as Segment[][];
const firs = JSON.parse(readFileSync(firsFile).toString()) as Fir[];
const areas = JSON.parse(readFileSync(areasFile).toString()) as Area[];
const geo = JSON.parse(readFileSync(geoFile).toString()) as {
  lat: number;
  lon: number;
}[][];
const areaDetails = JSON.parse(
  readFileSync(areaDetailsFile).toString()
) as AreaDetail[];

const auroraIncludePath = resolve(outPath, 'Include', metadata.include);

const extraFiles = JSON.parse(readFileSync(extraFilesFile).toString()) as {
  atc: string[];
  taxiway: string[];
  gates: string[];
  geo: string[];
  fillcolor: string[];
  sid: string[];
  star: string[];
  vfrfix: string[];
  mva: string[];
  mvaenr: string[];
  elevation: string[];
  lairspace: string[];
  hairspace: string[];
  colorscheme: string[];
  manualAirport: string[];
  manualRunway: string[];
  manualTaxiway: string[];
};

//Delete for override by Tatpol's new shape
//const region = 'VT';

function decimalToDMS(decimal: number, isLat: boolean): string {
  const degrees = Math.floor(Math.abs(decimal));
  const minutes = Math.floor((Math.abs(decimal) - degrees) * 60);
  const seconds = Math.round(((Math.abs(decimal) - degrees) * 60 - minutes) * 60 * 100) / 100;
  const direction = decimal >= 0 ? (isLat ? 'N' : 'E') : (isLat ? 'S' : 'W');

  return `${direction}${degrees.toString().padStart(3, '0')}.${minutes.toString().padStart(2, '0')}.${seconds.toFixed(3).padStart(6, '0')}`;
}

removeSync(outPath);

out += '[INFO]\n';
out += `${metadata.defaultCentrePoint[0].toFixed(7)}\n`;
out += `${metadata.defaultCentrePoint[1].toFixed(7)}\n`;
out += `${metadata.ratio[0]}\n`;
out += `${metadata.ratio[1]}\n`;
out += `${metadata.magVar}\n`;
out += `${metadata.include}\n`;

out += '[COLORSCHEME]\n';
out += `F;${metadata.colorScheme}\n`;

// TODO: DEFINE
out += '[ATC]\n';

for (const tf of extraFiles.atc) {
  out += `F;${tf}\n`;
  copySync(resolve(auroraPath, tf), resolve(auroraIncludePath, tf));
}

out += '[AIRPORT]\n';

const airportFileName = 'VTBB.apt';
const airportFile = resolve(auroraIncludePath, airportFileName);

let aptOut = '';

for (const airport of airports) {
  const dmsLat = decimalToDMS(airport.laty, true); // Convert latitude to DMS
  const dmsLon = decimalToDMS(airport.lonx, false); // Convert longitude to DMS

  aptOut += `${airport.ident};${airport.altitude};11000;${dmsLat};${dmsLon};${airport.name};\n`;
}

for (const tf of extraFiles.manualAirport) {
  out += `F;${tf}\n`;
  copySync(resolve(auroraPath, tf), resolve(auroraIncludePath, tf));
}

writeFileSync(airportFile, aptOut);

out += `F;${airportFileName}\n`;

out += '[RUNWAY]\n';

for (const tf of extraFiles.manualRunway) {
  out += `F;${tf}\n`;
  copySync(resolve(auroraPath, tf), resolve(auroraIncludePath, tf));
}

for (const airport of airports) {
  let rwyOut = '';
  const runwayFileName = `${airport.ident}.rwy`;
  const runwayFile = resolve(auroraIncludePath, runwayFileName);
  for (const runway of airport.runways) {
    const dmsLat1 = decimalToDMS(runway.lat1, true); // Convert start latitude to DMS
    const dmsLon1 = decimalToDMS(runway.lon1, false); // Convert start longitude to DMS
    const dmsLat2 = decimalToDMS(runway.lat2, true); // Convert end latitude to DMS
    const dmsLon2 = decimalToDMS(runway.lon2, false); // Convert end longitude to DMS

    rwyOut += `${airport.ident};${runway.runway1};${runway.runway2};${runway.alt1};${runway.alt2};${(runway.hdg1 - airport.mag_var).toFixed(0)};${(runway.hdg2 - airport.mag_var).toFixed(0)};${dmsLat1};${dmsLon1};${dmsLat2};${dmsLon2};\n`;
  }
  out += `F;${airport.ident}.rwy\n`;
  writeFileSync(runwayFile, rwyOut);
}
out += '[TAXIWAY]\n';

for (const tf of extraFiles.manualTaxiway) {
  out += `F;${tf}\n`;
  copySync(resolve(auroraPath, tf), resolve(auroraIncludePath, tf));
}

for (const airport of airports) {
  const fileName = `${airport.ident}.txi`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const tf of extraFiles.taxiway) {
  out += `F;${tf}\n`;
  copySync(resolve(auroraPath, tf), resolve(auroraIncludePath, tf));
}

out += '[GATES]\n';

for (const airport of airports) {
  const fileName = `${airport.ident}.gts`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const gf of extraFiles.gates) {
  out += `F;${gf}\n`;
  copySync(resolve(auroraPath, gf), resolve(auroraIncludePath, gf));
}

out += '[FIXES]\n';

const fixesFileName: string = 'VTBB.fix';
const fixesFile: string = resolve(auroraIncludePath, fixesFileName);

let outFix: string = '';

for (const waypoint of waypoints) {
  let dmsLat: string = decimalToDMS(waypoint.laty, true); // Convert latitude to DMS
  const dmsLon: string = decimalToDMS(waypoint.lonx, false); // Convert longitude to DMS

  // Manually adjust MODON's latitude if required
  if (waypoint.ident === 'MODON') {
    let [degrees, minutes, seconds, miliseconds] = dmsLat
      .substring(1) // Strip the direction for processing
      .split(/[.]/)
      .map((val) => parseInt(val, 10));
    miliseconds += 1;
    if (miliseconds >= 1000) {
      miliseconds = 0;
      seconds += 1;
    }
    if (seconds >= 60) {
      seconds = 0;
      minutes += 1;
    }
    if (minutes >= 60) {
      minutes = 0;
      degrees += 1;
    }
    const direction = dmsLat[0]; // Retrieve direction
    dmsLat = `${direction}${degrees.toString().padStart(3, '0')}.${minutes
      .toString().padStart(2, '0')}.${seconds.toString().padStart(2, '0')}.${miliseconds.toString().padStart(3, '0')}`;
    console.log(`Adjusted MODON: ${dmsLat}`);
  }

  outFix += `${waypoint.ident};${dmsLat};${dmsLon};${
    waypoint.is_extra
     ? 3 :
      waypoint.is_enroute
        ? waypoint.is_terminal
          ? 2
          : 0
        : waypoint.is_terminal
          ? 1
          : 3
  };${waypoint.is_boundary ? 1 : 0};\n`;
}

writeFileSync(fixesFile, outFix);

out += `F;${fixesFileName}\n`;

out += '[NDB]\n';

const ndbFileName = 'VTBB.ndb';
const ndbFile = resolve(auroraIncludePath, ndbFileName);

let outNdb = '';

for (const ndb of ndbs) {
  const dmsLat = decimalToDMS(ndb.laty, true); // Convert latitude to DMS
  const dmsLon = decimalToDMS(ndb.lonx, false); // Convert longitude to DMS

  outNdb += `${ndb.ident};${(ndb.frequency / 100).toFixed(3)};${dmsLat};${dmsLon};${
    ndb.is_extra
    ? 1
    : 0
  };\n`;
}

writeFileSync(ndbFile, outNdb);

out += `F;${ndbFileName}\n`;

out += '[VOR]\n';

const vorFileName = 'VTBB.vor';
const vorFile = resolve(auroraIncludePath, vorFileName);

let outVor = '';

for (const vor of vors) {
  const dmsLat = decimalToDMS(vor.laty, true); // Convert latitude to DMS
  const dmsLon = decimalToDMS(vor.lonx, false); // Convert longitude to DMS

  outVor += `${vor.ident};${(vor.frequency / 1000).toFixed(3)};${dmsLat};${dmsLon};${
    vor.is_extra
    ? 1
    : 0
  };${
    vor.is_tacan
    ? (vor.is_vor ? 2 : 3)
    : (vor.is_vor
    ? (vor.is_vor_only ? 0 : 1)
    : (vor.is_dme_only ? 4 : 0))
  };${
    vor.channel ? `CH${vor.channel}` : ''
  };\n`;
}

writeFileSync(vorFile, outVor);

out += `F;${vorFileName}\n`;

out += '[LOW AIRWAY]\n';

const lAirwayFileName = 'VTBB.lairway';
const lAirwayFile = resolve(auroraIncludePath, lAirwayFileName);

let outLAirway = '';

outLAirway += formatAirways(airways, 'V');

writeFileSync(lAirwayFile, outLAirway);

out += `F;${lAirwayFileName}\n`;

out += '[HIGH AIRWAY]\n';

const hAirwayFileName = 'VTBB.hairway';
const hAirwayFile = resolve(auroraIncludePath, hAirwayFileName);

let outHAirway = '';

outHAirway += formatAirways(airways, 'J');

writeFileSync(hAirwayFile, outHAirway);

out += `F;${hAirwayFileName}\n`;

out += '[AIRSPACE]\n';

for (const fir of firs) {
  const airspaceFileName = `${fir.code}.airspace`;
  const airspaceFile = resolve(auroraIncludePath, airspaceFileName);
  let firOut = '';

  for (const point of fir.points) {
    firOut += `T;${fir.code}_CTR;${decimalToDMS(point[0], true)};${decimalToDMS(point[1], false)};\n`;
  }
  firOut += `T;${fir.code}_CTR;${decimalToDMS(fir.points[0][0], true)};${decimalToDMS(fir.points[0][1], false)};\n`;
  writeFileSync(airspaceFile, firOut);
  out += `F;${airspaceFileName}\n`;
}

out += '[AIRSPACE LOW]\n';

for (const areaDetail of areaDetails.filter(
  (a) => a.use && ['D', 'R', 'P'].indexOf(a.type) === -1
)) {
  const areaFileName = `${areaDetail.name}.lairspace`;
  const areaFile = resolve(auroraIncludePath, areaFileName);
  const area = areas.find((s) => s.digest === areaDetail.digest)!;
  let areaOut = '';
  for (const point of area.points) {
    areaOut += `T;${areaDetail.name};${decimalToDMS(point[1], true)};${decimalToDMS(point[0], false)};\n`;
  }
  areaOut += `T;${areaDetail.name};${decimalToDMS(area.points[0][1], true)};${decimalToDMS(area.points[0][0], false)};\n`;
  writeFileSync(areaFile, areaOut);
  out += `F;${areaFileName}\n`;
}

for (const ef of extraFiles.lairspace) {
  out += `F;${ef}\n`;
  copySync(resolve(auroraPath, ef), resolve(auroraIncludePath, ef));
}

out += '[AIRSPACE HIGH]\n';

for (const areaDetail of areaDetails.filter(
  (a) => a.use && ['D', 'R', 'P'].indexOf(a.type) === -1
)) {
  const areaFileName = `${areaDetail.name}.hairspace`;
  const areaFile = resolve(auroraIncludePath, areaFileName);
  const area = areas.find((s) => s.digest === areaDetail.digest)!;
  let areaOut = '';
  for (const point of area.points) {
    areaOut += `T;${areaDetail.name};${decimalToDMS(point[1], true)};${decimalToDMS(point[0], false)};\n`;
  }
  areaOut += `T;${areaDetail.name};${decimalToDMS(area.points[0][1], true)};${decimalToDMS(area.points[0][0], false)};\n`;
  writeFileSync(areaFile, areaOut);
  out += `F;${areaFileName}\n`;
}

for (const ef of extraFiles.hairspace) {
  out += `F;${ef}\n`;
  copySync(resolve(auroraPath, ef), resolve(auroraIncludePath, ef));
}

out += '[SID]\n';

for (const airport of airports) {
  const fileName = `${airport.ident}.sid`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const ef of extraFiles.sid) {
  out += `F;${ef}\n`;
  copySync(resolve(auroraPath, ef), resolve(auroraIncludePath, ef));
}

out += '[STAR]\n';

for (const airport of airports) {
  const fileName = `${airport.ident}.str`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const ef of extraFiles.star) {
  out += `F;${ef}\n`;
  copySync(resolve(auroraPath, ef), resolve(auroraIncludePath, ef));
}

out += '[VFRFIX]\n';

for (const airport of airports) {
  const fileName = `${airport.ident}.vfi`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const ef of extraFiles.vfrfix) {
  out += `F;${ef}\n`;
  copySync(resolve(auroraPath, ef), resolve(auroraIncludePath, ef));
}

out += '[MVA]\n';

for (const airport of airports) {
  const fileName = `${airport.ident}.mva`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const ef of extraFiles.mva) {
  out += `F;${ef}\n`;
  copySync(resolve(auroraPath, ef), resolve(auroraIncludePath, ef));
}

out += '[MVAENR]\n';

for (const ef of extraFiles.mva) {
  out += `F;${ef}\n`;
  copySync(resolve(auroraPath, ef), resolve(auroraIncludePath, ef));
}

out += '[ELEVATION]\n';

for (const ef of extraFiles.elevation) {
  out += `F;${ef}\n`;
  copySync(resolve(auroraPath, ef), resolve(auroraIncludePath, ef));
}

out += '[GEO]\n';

for (const gf of extraFiles.geo) {
  out += `F;${gf}\n`;
  copySync(resolve(auroraPath, gf), resolve(auroraIncludePath, gf));
}

// Coast data

const coastFileName = 'coast.geo';
const coastFile = resolve(auroraIncludePath, coastFileName);
let coastOut = '';

const skip = 20;

for (const segment of geo) {
  let i: number;
  for (i = 0; i <= segment.length - 1; i += skip) {
    if (i + skip <= segment.length - 1) {
      const dmsLat1 = decimalToDMS(segment[i].lat, true);
      const dmsLon1 = decimalToDMS(segment[i].lon, false);
      const dmsLat2 = decimalToDMS(segment[i + skip].lat, true);
      const dmsLon2 = decimalToDMS(segment[i + skip].lon, false);
      coastOut += `${dmsLat1};${dmsLon1};${dmsLat2};${dmsLon2};Coast;\n`;
    }
  }
  i -= skip;
  if (i !== segment.length - 1) {
    const dmsLat1 = decimalToDMS(segment[i].lat, true);
    const dmsLon1 = decimalToDMS(segment[i].lon, false);
    const dmsLat2 = decimalToDMS(segment[segment.length - 1].lat, true);
    const dmsLon2 = decimalToDMS(segment[segment.length - 1].lon, false);
    coastOut += `${dmsLat1};${dmsLon1};${dmsLat2};${dmsLon2};Coast;\n`;
  }
}

writeFileSync(coastFile, coastOut);

out += `F;${coastFileName}\n`;

const dangerFileName = 'danger.geo';
const restrictedFileName = 'restricted.geo';
const prohibitedFileName = 'prohibited.geo';

/* Delete for override by Tatpol's new shape
const dangerFile = resolve(auroraIncludePath, dangerFileName);
const restrictedFile = resolve(auroraIncludePath, restrictedFileName);
const prohibitedFile = resolve(auroraIncludePath, prohibitedFileName);

let dangerOut = '';
let restrictedOut = '';
let prohibitedOut = '';

for (const area of areas) {
  if (area.restrictive_type) {
    const colour =
      area.restrictive_type === 'D'
        ? 'Danger'
        : area.restrictive_type === 'R'
          ? 'Restrict'
          : area.restrictive_type === 'P'
            ? 'Prohibit'
            : 'Unknown';
    const name = area.multiple_code
      ? `${region}${area.restrictive_type}-${area.restrictive_designation} (${area.multiple_code}) ${area.name}`
      : `${region}${area.restrictive_type}-${area.restrictive_designation} ${area.name}`;
    for (const line of area.points.map(
      (point, index, arr): [[number, number], [number, number]] => {
        if (index === arr.length - 1) {
          return [point, arr[0]];
        }
        return [point, arr[index + 1]];
      }
    )) {
      const lineOut = `${line[0][1].toFixed(7)};${line[0][0].toFixed(
        7
      )};${line[1][1].toFixed(7)};${line[1][0].toFixed(
        7
      )};${colour};${name};\n`;
      switch (area.restrictive_type) {
        case 'D':
          dangerOut += lineOut;
          break;
        case 'R':
          restrictedOut += lineOut;
          break;
        case 'P':
          prohibitedOut += lineOut;
          break;
      }
    }
  }
}

writeFileSync(dangerFile, dangerOut);
writeFileSync(restrictedFile, restrictedOut);
writeFileSync(prohibitedFile, prohibitedOut);
*/
out += `F;${dangerFileName}\n`;
out += `F;${restrictedFileName}\n`;
out += `F;${prohibitedFileName}\n`;

out += '[FILLCOLOR]\n';

for (const airport of airports) {
  const fileName = `${airport.ident}.tfl`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const ff of extraFiles.fillcolor) {
  out += `F;${ff}\n`;
  copySync(resolve(auroraPath, ff), resolve(auroraIncludePath, ff));
}

for (const airport of airports) {
  const fileName = `${airport.ident}.clr`;
  const checkFile = resolve(auroraPath, fileName);
  if (existsSync(checkFile)) {
    copySync(checkFile, resolve(auroraIncludePath, fileName));
  }
}

for (const ff of extraFiles.colorscheme) {
  out += `F;${ff}\n`;
  copySync(resolve(auroraPath, ff), resolve(auroraIncludePath, ff));
}

writeFileSync(outFile, out);

ensureDirSync(resultPath);

zipDirectory(outPath, resultFile);
