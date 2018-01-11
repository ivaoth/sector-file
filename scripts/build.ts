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

const copy = (src: string, dest: string = src) => {
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
  '02-VOR.txt',
  '03-NDB.txt',
  '05-1-AIRPORT.txt',
  '05-2-CUSTOM_AIRPORT.txt',
  '06-1-RWY.txt',
  '06-2-CUSTOM_RWY.txt',
  '09-HI_AIRWAY.txt',
  '10-LO_AIRWAY.txt',
  '12-ARTCC_HI.txt'
];

const folders = [
  ['FIXES', '04-FIXES.txt'],
  ['SID', '07-SID.txt'],
  ['STAR', '08-STAR.txt'],
  ['ARTCC', '11-ARTCC.txt'],
  ['ARTCC_LO', '13-ARTCC_LO.txt'],
  ['GEO', '14-GEO.txt']
];

const orders = [
  '01-INFO.txt',
  '02-VOR.txt',
  '03-NDB.txt',
  '04-FIXES.txt',
  '05-1-AIRPORT.txt',
  '05-2-CUSTOM_AIRPORT.txt',
  '06-1-RWY.txt',
  '06-2-CUSTOM_RWY.txt',
  '07-SID.txt',
  '08-STAR.txt',
  '09-HI_AIRWAY.txt',
  '10-LO_AIRWAY.txt',
  '11-ARTCC.txt',
  '12-ARTCC_HI.txt',
  '13-ARTCC_LO.txt',
  '14-GEO.txt'
];

for (let file of files) {
  copy(file);
}

for (let folderMap of folders) {
  copy(folderMap[0], folderMap[1]);
}

createFileSync(resultFile);

let out = '';

for (let name of orders) {
  const path = resolve(buildPath, name);
  if (lstatSync(path).isDirectory()) {
    const files = readdirSync(path);
    for (let file of files) {
      out += readFileSync(resolve(path, file)).toString();
    }
  } else {
    out += readFileSync(path).toString();
  }
}

writeFileSync(resultFile, out);
