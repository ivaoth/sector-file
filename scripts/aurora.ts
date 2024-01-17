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
  lairspace: string[];
  colorscheme: string[];
  manualAirport: string[];
};

const region = 'VT';

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
  aptOut += `${airport.ident};${airport.altitude};11000;${airport.laty.toFixed(
    6
  )};${airport.lonx.toFixed(7)};${airport.name};\n`;
}

for (const tf of extraFiles.manualAirport) {
  out += `F;${tf}\n`;
  copySync(resolve(auroraPath, tf), resolve(auroraIncludePath, tf));
}

writeFileSync(airportFile, aptOut);

out += `F;${airportFileName}\n`;

out += '[RUNWAY]\n';

for (const airport of airports) {
  let rwyOut = '';
  const runwayFileName = `${airport.ident}.rwy`;
  const runwayFile = resolve(auroraIncludePath, runwayFileName);
  for (const runway of airport.runways) {
    rwyOut += `${airport.ident};${runway.runway1};${runway.runway2};${
      runway.alt1
    };${runway.alt2};${(runway.hdg1 - airport.mag_var).toFixed(0)};${(
      runway.hdg2 - airport.mag_var
    ).toFixed(0)};${runway.lat1.toFixed(7)};${runway.lon1.toFixed(
      6
    )};${runway.lat2.toFixed(7)};${runway.lon2.toFixed(7)};\n`;
  }
  out += `F;${airport.ident}.rwy\n`;
  writeFileSync(runwayFile, rwyOut);
}

out += '[TAXIWAY]\n';

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

const fixesFileName = 'VTBB.fix';
const fixesFile = resolve(auroraIncludePath, fixesFileName);

let outFix = '';

for (const waypoint of waypoints) {
  outFix += `${waypoint.ident};${waypoint.laty.toFixed(
    7
  )};${waypoint.lonx.toFixed(6)};${
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
  outNdb += `${ndb.ident};${(ndb.frequency / 100).toFixed(
    3
  )};${ndb.laty.toFixed(6)};${ndb.lonx.toFixed(7)};\n`;
}

writeFileSync(ndbFile, outNdb);

out += `F;${ndbFileName}\n`;

out += '[VOR]\n';

const vorFileName = 'VTBB.vor';
const vorFile = resolve(auroraIncludePath, vorFileName);

let outVor = '';

for (const vor of vors) {
  outVor += `${vor.ident};${(vor.frequency / 1000).toFixed(
    3
  )};${vor.laty.toFixed(6)};${vor.lonx.toFixed(7)};\n`;
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
    firOut += `T;${fir.code}_CTR;${point[0].toFixed(7)};${point[1].toFixed(
      7
    )};\n`;
  }
  firOut += `T;${fir.code}_CTR;${fir.points[0][0].toFixed(
    7
  )};${fir.points[0][1].toFixed(7)};\n`;
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
    areaOut += `T;${areaDetail.name};${point[1].toFixed(7)};${point[0].toFixed(
      7
    )};\n`;
  }
  areaOut += `T;${areaDetail.name};${area.points[0][1].toFixed(
    7
  )};${area.points[0][0].toFixed(7)};\n`;
  writeFileSync(areaFile, areaOut);
  out += `F;${areaFileName}\n`;
}

for (const ef of extraFiles.lairspace) {
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
      coastOut += `${segment[i].lat.toFixed(7)};${segment[i].lon.toFixed(
        7
      )};${segment[i + skip].lat.toFixed(7)};${segment[i + skip].lon.toFixed(
        7
      )};Coast;\n`;
    }
  }
  i -= skip;
  if (i !== segment.length - 1) {
    coastOut += `${segment[i].lat.toFixed(7)};${segment[i].lon.toFixed(
      7
    )};${segment[segment.length - 1].lat.toFixed(7)};${segment[
      segment.length - 1
    ].lon.toFixed(7)};Coast;\n`;
  }
}

writeFileSync(coastFile, coastOut);

out += `F;${coastFileName}\n`;

const dangerFileName = 'danger.geo';
const restrictedFileName = 'restricted.geo';
const prohibitedFileName = 'prohibited.geo';

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
