import { resolve } from 'path';
import { readFileSync, outputFileSync } from 'fs-extra';
import { Area, AreaDetail } from '../utils/interfaces';

const basePath = resolve(__dirname);
const rootPath = resolve(basePath, '..');
const dataPath = resolve(rootPath, 'data');
const generatedDataPath = resolve(dataPath, 'generated');
const areasFile = resolve(generatedDataPath, 'areas.json');
const areaDetailsFile = resolve(dataPath, 'area-details.json');
const areas = JSON.parse(readFileSync(areasFile).toString()) as Area[];
const areaDetails = JSON.parse(
  readFileSync(areaDetailsFile).toString()
) as AreaDetail[];
const extractedAreaDigests = areas.map((a) => a.digest);
const areaDetailDigests = areaDetails.map((a) => a.digest);
const missingDigests: string[] = [];
const extraDigests: string[] = [];

for (const d of extractedAreaDigests) {
  if (areaDetailDigests.indexOf(d) === -1) {
    missingDigests.push(d);
  }
}

for (const d of areaDetailDigests) {
  if (extractedAreaDigests.indexOf(d) === -1) {
    extraDigests.push(d);
  }
}

if (missingDigests.length !== 0 || extraDigests.length !== 0) {
  process.exitCode = 1;
  const missingAreaDetails: AreaDetail[] = missingDigests.map((d) => {
    const area = areas.find((a) => a.digest === d)!;
    const type = (area.restrictive_type ? area.restrictive_type : '') as
      | 'D'
      | 'R'
      | 'P'
      | 'TMA'
      | 'CTR'
      | 'ATZ'
      | 'other';
    return {
      digest: d,
      type,
      name: area.name,
      use: true,
      checked: ['D', 'R', 'P'].indexOf(type) !== -1 ? true : false
    };
  });
  const out: AreaDetail[] = [
    ...areaDetails.filter((ad) => extraDigests.indexOf(ad.digest) === -1),
    ...missingAreaDetails
  ];
  outputFileSync(areaDetailsFile, JSON.stringify(out, null, 2));
} else {
  if (areaDetails.some((s) => !s.checked)) {
    const unchecked = areaDetails.filter((s) => !s.checked);
    for (const u of unchecked) {
      console.log(`Unchecked: ${u.digest} (${u.name})`);
    }
    process.exitCode = 1;
  }
}
