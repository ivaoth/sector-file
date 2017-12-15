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
  '01-INFO',
  '02-VOR',
  '03-NDB',
  '04-FIXES',
  '05-AIRPORT',
  '06-RWY',
  '09-HI_AIRWAY',
  '11-ARTCC_HI'
];

const folders = [
  ['SID', '07-SID'],
  ['STAR', '08-STAR'],
  ['ARTCC', '10-ARTCC'],
  ['ARTCC_LO', '12-ARTCC_LO'],
  ['GEO', '13-GEO']
];

const orders = [
  '01-INFO',
  '02-VOR',
  '03-NDB',
  '04-FIXES',
  '05-AIRPORT',
  '06-RWY',
  '07-SID',
  '08-STAR',
  '09-HI_AIRWAY',
  '10-ARTCC',
  '11-ARTCC_HI',
  '12-ARTCC_LO',
  '13-GEO'
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
