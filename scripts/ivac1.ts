import {
  copySync,
  createFileSync,
  emptyDirSync,
  ensureDirSync,
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'fs-extra';
import { resolve } from 'path';

const basePath = resolve(__dirname, '..');
const filesPath = resolve(basePath, 'files');
const buildPath = resolve(basePath, 'build');
const resultFile = resolve(basePath, 'result', `vtbb.sct`);

const copy = (src: string, dest: string = src): void => {
  copySync(resolve(filesPath, src), resolve(buildPath, dest));
};

if (existsSync(buildPath)) {
  console.log('Old build files exists, cleaning');
  emptyDirSync(buildPath);
}

console.log('Copying files');

ensureDirSync(buildPath);

const files = [
  '01-INFO.txt',
  '09-HI_AIRWAY.txt',
  '10-LO_AIRWAY.txt',
  '12-ARTCC_HI.txt'
];

const folders = [
  ['02-VOR', '02-VOR.txt'],
  ['03-NDB', '03-NDB.txt'],
  ['04-FIXES', '04-FIXES.txt'],
  ['05-AIRPORT', '05-AIRPORT.txt'],
  ['06-RUNWAY', '06-RUNWAY.txt'],
  ['07-SID', '07-SID.txt'],
  ['08-STAR', '08-STAR.txt'],
  ['11-ARTCC', '11-ARTCC.txt'],
  ['13-ARTCC_LO', '13-ARTCC_LO.txt'],
  ['14-GEO', '14-GEO.txt']
];

const orders = [
  '01-INFO.txt',
  '02-VOR.txt',
  '03-NDB.txt',
  '04-FIXES.txt',
  '05-AIRPORT.txt',
  '06-RUNWAY.txt',
  '07-SID.txt',
  '08-STAR.txt',
  '09-HI_AIRWAY.txt',
  '10-LO_AIRWAY.txt',
  '11-ARTCC.txt',
  '12-ARTCC_HI.txt',
  '13-ARTCC_LO.txt',
  '14-GEO.txt'
];

for (const file of files) {
  copy(file);
}

for (const folderMap of folders) {
  copy(folderMap[0], folderMap[1]);
}

createFileSync(resultFile);

let out = '';

for (const name of orders) {
  const path = resolve(buildPath, name);
  if (lstatSync(path).isDirectory()) {
    const files = readdirSync(path);
    for (const file of files) {
      out += readFileSync(resolve(path, file)).toString();
    }
  } else {
    out += readFileSync(path).toString();
  }
}

writeFileSync(resultFile, out);
