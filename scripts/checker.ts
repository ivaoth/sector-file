import { readFileSync } from 'fs-extra';
import { resolve } from 'path';

const lines = readFileSync(resolve(__dirname, '../result/vtbb.sct'))
  .toString()
  .split('\n')
  .map((s) => {
    return s.split(';', 2)[0].trimRight();
  });

enum Modes {
  Preamable,
  Info,
  VOR,
  NDB,
  Fix,
  Airport,
  Runway,
  SID,
  STAR,
  HighAirway,
  LowAirway,
  ARTCC,
  HighARTCC,
  LowARTCC,
  Geographical
}

enum Directions {
  Longtitude = 1 << 0,
  Latitude = 1 << 1
}

const checkCoordinateFormat = (
  text: string,
  directions: Directions
): boolean => {
  if (text.length !== 14) {
    return false;
  } else {
    if (
      (text[0] === 'N' || text[0] === 'S') &&
      !(directions & Directions.Latitude)
    ) {
      return false;
    } else if (
      (text[0] === 'E' || text[0] === 'W') &&
      !(directions & Directions.Longtitude)
    ) {
      return false;
    } else if (['N', 'E', 'S', 'W'].indexOf(text[0]) === -1) {
      return false;
    } else {
      const parts = text.match(/^([NEWS])(\d{3})\.(\d{2})\.(\d{2})\.(\d{3})$/);
      if (parts) {
        let hasNaN = false;
        const numbers = parts.slice(2).map((n) => {
          const x = Number(n);
          if (isNaN(x)) {
            hasNaN = true;
          }
          return x;
        });
        if (hasNaN) {
          return false;
        } else {
          switch (parts[1]) {
            case 'N':
            case 'S':
              if (numbers[0] >= 90) {
                return false;
              }
              break;
            case 'E':
            case 'W':
              if (numbers[0] >= 180) {
                return false;
              }
              break;
            default:
              return false;
          }
          if (numbers[1] >= 60 || numbers[2] >= 60) {
            return false;
          } else {
            return true;
          }
        }
      } else {
        return false;
      }
    }
  }
};

const checkFrequencyFormat = (text: string): boolean => {
  const result = text.match(/^(\d{3})\.(\d{3})$/);
  if (result) {
    return !result.some((n) => {
      const x = Number(n);
      if (isNaN(x)) {
        return true;
      }
      return false;
    });
  } else {
    return false;
  }
};

const errors: { line: number; reason: string }[] = [];

const identifiers: string[] = [];

const identifiersToCheck: { line: number; name: string }[] = [];

const getNewMode = (text: string): string | null => {
  if (text[0] === '[' && text[text.length - 1] === ']') {
    return text.substring(1, text.length - 1);
  } else {
    return null;
  }
};

let mode = Modes.Preamable;

for (let i = 0; i <= lines.length - 1; i++) {
  const pushError = (reason: string): void => {
    errors.push({
      line: i + 1,
      reason
    });
  };
  const pushIdentifier = (name: string): void => {
    if (name) {
      identifiers.push(name);
    }
  };
  const pushIdentifierToCheck = (name: string): void => {
    if (name) {
      identifiersToCheck.push({ line: i + 1, name });
    }
  };
  let line = lines[i];
  if (line !== '') {
    // Check if mode is changed
    const newMode = getNewMode(line);
    if (newMode) {
      switch (newMode) {
        case 'INFO':
          mode = Modes.Info;
          break;
        case 'VOR':
          mode = Modes.VOR;
          break;
        case 'NDB':
          mode = Modes.NDB;
          break;
        case 'FIXES':
          mode = Modes.Fix;
          break;
        case 'AIRPORT':
          mode = Modes.Airport;
          break;
        case 'RUNWAY':
          mode = Modes.Runway;
          break;
        case 'SID':
          mode = Modes.SID;
          break;
        case 'STAR':
          mode = Modes.STAR;
          break;
        case 'HIGH AIRWAY':
          mode = Modes.HighAirway;
          break;
        case 'LOW AIRWAY':
          mode = Modes.LowAirway;
          break;
        case 'ARTCC':
          mode = Modes.ARTCC;
          break;
        case 'ARTCC HIGH':
          mode = Modes.HighARTCC;
          break;
        case 'ARTCC LOW':
          mode = Modes.LowARTCC;
          break;
        case 'GEO':
          mode = Modes.Geographical;
          break;
        default:
          pushError('Invalid mode');
      }
    } else {
      switch (mode) {
        case Modes.Preamable:
          break;
        case Modes.Info: {
          const infoRegexes = [
            /^[A-Z]{4}$/,
            /^[A-Z]{4}_(CTR|APP|TWR|GND)$/,
            /^[A-Z]{4}$/
          ];
          for (let j = 0; j <= infoRegexes.length - 1; j++) {
            const regex = infoRegexes[j];
            const result = line.match(regex);
            if (!result) {
              pushError(`Invalid infomation section`);
            }
            do {
              i++;
              line = lines[i];
            } while (line === '');
          }
          if (!checkCoordinateFormat(line, Directions.Latitude)) {
            pushError('Invalid infomation section - latitude');
          }
          do {
            i++;
            line = lines[i];
          } while (line === '');
          if (!checkCoordinateFormat(line, Directions.Longtitude)) {
            pushError('Invalid infomation section - longitude');
          }
          do {
            i++;
            line = lines[i];
          } while (line === '');
          if (line !== '60') {
            pushError('Invalid information section - 60');
          }
          do {
            i++;
            line = lines[i];
          } while (line === '');
          if (isNaN(Number(line))) {
            pushError('Invalid information section - distance of latitude');
          }
          do {
            i++;
            line = lines[i];
          } while (line === '');
          if (isNaN(Number(line))) {
            pushError('Invalid information section - magnetic variation');
          }
          do {
            i++;
            line = lines[i];
          } while (line === '');
          if (isNaN(Number(line))) {
            pushError('Invalid information section - scaling factor');
          }
          break;
        }
        case Modes.VOR: {
          const VORResult = line.match(
            /^([A-Z ]{3}) (\d{3}\.\d{3}) ([NS]\d{3}\.\d{2}\.\d{2}\.\d{3}) ([EW]\d{3}\.\d{2}\.\d{2}\.\d{3})$/
          );
          if (!VORResult) {
            pushError('Invalid VOR');
          } else {
            if (!checkFrequencyFormat(VORResult[2])) {
              pushError('Invalid VOR - Frequency');
            }
            if (!checkCoordinateFormat(VORResult[3], Directions.Latitude)) {
              pushError('Invalid VOR - Latitude');
            }
            if (!checkCoordinateFormat(VORResult[4], Directions.Longtitude)) {
              pushError('Invalid VOR - Longtitude');
            }
            pushIdentifier(VORResult[1].trim());
          }
          break;
        }
        case Modes.NDB: {
          const NDBResult = line.match(
            /^([A-Z ]{5}) (\d{3}\.\d{3}) ([NS]\d{3}\.\d{2}\.\d{2}\.\d{3}) ([EW]\d{3}\.\d{2}\.\d{2}\.\d{3})$/
          );
          if (!NDBResult) {
            pushError('Invalid NDB');
          } else {
            if (!checkFrequencyFormat(NDBResult[2])) {
              pushError('Invalid NDB - Frequency');
            }
            if (!checkCoordinateFormat(NDBResult[3], Directions.Latitude)) {
              pushError('Invalid NDB - Latitude');
            }
            if (!checkCoordinateFormat(NDBResult[4], Directions.Longtitude)) {
              pushError('Invalid NDB - Longtitude');
            }
            pushIdentifier(NDBResult[1].trim());
          }
          break;
        }
        case Modes.Fix: {
          const fixResult = line.match(
            /^([A-Z _0-9]{5}) ([NS]\d{3}\.\d{2}\.\d{2}\.\d{3}) ([EW]\d{3}\.\d{2}\.\d{2}\.\d{3})$/
          );
          if (!fixResult) {
            pushError('Invalid fix');
          } else {
            if (!checkCoordinateFormat(fixResult[2], Directions.Latitude)) {
              pushError('Invalid fix - Latitude');
            }
            if (!checkCoordinateFormat(fixResult[3], Directions.Longtitude)) {
              pushError('Invalid fix - Longtitude');
            }
            pushIdentifier(fixResult[1].trim());
          }
          break;
        }
        case Modes.Airport: {
          const airportResult = line.match(
            /^([A-Z0-9]{4}) (\d{3}\.\d{3}|\. {6}) ([NS]\d{3}\.\d{2}\.\d{2}\.\d{3}) ([EW]\d{3}\.\d{2}\.\d{2}\.\d{3}) .$/
          );
          if (!airportResult) {
            pushError('Invalid airport');
          } else {
            if (!checkFrequencyFormat(airportResult[2])) {
              if (
                airportResult[2] !== '.      ' &&
                airportResult[2] !== '  ?    '
              ) {
                pushError('Invalid airport - Frequency');
              }
            }
            if (!checkCoordinateFormat(airportResult[3], Directions.Latitude)) {
              pushError('Invalid airport - Latitude');
            }
            if (
              !checkCoordinateFormat(airportResult[4], Directions.Longtitude)
            ) {
              pushError('Invalid airport - Longtitude');
            }
          }
          break;
        }
        case Modes.Runway: {
          const runwayResult = line.match(
            /^([0-3][0-9])([LRC ]) ([0-3][0-9])([LRC ]) ([0-9]{3}) ([0-9]{3}) ([NS]\d{3}\.\d{2}\.\d{2}\.\d{3}) ([EW]\d{3}\.\d{2}\.\d{2}\.\d{3}) ([NS]\d{3}\.\d{2}\.\d{2}\.\d{3}) ([EW]\d{3}\.\d{2}\.\d{2}\.\d{3})$/
          );
          if (!runwayResult) {
            pushError('Invalid runway');
          } else {
            const num1 = Number(runwayResult[1]);
            const num2 = Number(runwayResult[3]);
            if (num1 > 36 || num1 < 1) {
              pushError('Invalid runway - Number 1');
            }
            if (num2 > 36 || num2 < 1) {
              pushError('Invalid runway - Number 2');
            }
            if (num1 - num2 !== 18 && num2 - num1 !== 18) {
              pushError('Invalid runway - Opposite');
            }
            // TODO: check heading
            if (!checkCoordinateFormat(runwayResult[7], Directions.Latitude)) {
              pushError('Invalid airport - Latitude 1');
            }
            if (
              !checkCoordinateFormat(runwayResult[8], Directions.Longtitude)
            ) {
              pushError('Invalid airport - Longtitude 1');
            }
            if (!checkCoordinateFormat(runwayResult[9], Directions.Latitude)) {
              pushError('Invalid airport - Latitude 2');
            }
            if (
              !checkCoordinateFormat(runwayResult[10], Directions.Longtitude)
            ) {
              pushError('Invalid airport - Longtitude 2');
            }
          }
          break;
        }
        // TODO: Should airways have name on every line?
        case Modes.SID:
        case Modes.STAR:
        case Modes.HighAirway:
        case Modes.LowAirway: {
          let word1 = '';
          switch (mode) {
            case Modes.SID:
              word1 = 'SID';
              break;
            case Modes.STAR:
              word1 = 'STAR';
              break;
            case Modes.HighAirway:
              word1 = 'High Airway';
              break;
            case Modes.LowAirway:
              word1 = 'Low Airway';
              break;
          }
          const SIDResult = line.match(
            /^(.{25}) (([NS]\d{3}\.\d{2}\.\d{2}\.\d{3}) ([EW]\d{3}\.\d{2}\.\d{2}\.\d{3})|(.{29})) (([NS]\d{3}\.\d{2}\.\d{2}\.\d{3}) ([EW]\d{3}\.\d{2}\.\d{2}\.\d{3})|(.{1,29}))$/
          );
          if (!SIDResult) {
            pushError(`Invalid ${word1}`);
          } else {
            if (SIDResult[3] === undefined) {
              pushIdentifierToCheck(SIDResult[5].trim());
            } else {
              if (!checkCoordinateFormat(SIDResult[3], Directions.Latitude)) {
                pushError(`Invalid ${word1} - Latitide 1`);
              }
              if (!checkCoordinateFormat(SIDResult[4], Directions.Longtitude)) {
                pushError(`Invalid ${word1} - Longtitide 1`);
              }
            }
            if (SIDResult[7] === undefined) {
              pushIdentifierToCheck(SIDResult[9].trim());
            } else {
              if (!checkCoordinateFormat(SIDResult[7], Directions.Latitude)) {
                pushError(`Invalid ${word1} - Latitide 2`);
              }
              if (!checkCoordinateFormat(SIDResult[8], Directions.Longtitude)) {
                pushError(`Invalid ${word1} - Longtitide 2`);
              }
            }
          }
          break;
        }
        case Modes.ARTCC:
        case Modes.HighARTCC:
        case Modes.LowARTCC: {
          let word2 = '';
          switch (mode) {
            case Modes.ARTCC:
              word2 = 'SID';
              break;
            case Modes.HighARTCC:
              word2 = 'High ARTCC';
              break;
            case Modes.LowARTCC:
              word2 = 'Low ARTCC';
              break;
          }
          const ARTCC = line.match(
            /^(.{10}) (([NS]\d{3}\.\d{2}\.\d{2}\.\d{3}) ([EW]\d{3}\.\d{2}\.\d{2}\.\d{3})|(.{29})) (([NS]\d{3}\.\d{2}\.\d{2}\.\d{3}) ([EW]\d{3}\.\d{2}\.\d{2}\.\d{3})|(.{1,29}))$/
          );
          if (!ARTCC) {
            pushError(`Invalid ${word2}`);
          } else {
            if (ARTCC[3] === undefined) {
              pushIdentifierToCheck(ARTCC[5].trim());
            } else {
              if (!checkCoordinateFormat(ARTCC[3], Directions.Latitude)) {
                pushError(`Invalid ${word2} - Latitide 1`);
              }
              if (!checkCoordinateFormat(ARTCC[4], Directions.Longtitude)) {
                pushError(`Invalid ${word2} - Longtitide 1`);
              }
            }
            if (ARTCC[7] === undefined) {
              pushIdentifierToCheck(ARTCC[9].trim());
            } else {
              if (!checkCoordinateFormat(ARTCC[7], Directions.Latitude)) {
                pushError(`Invalid ${word2} - Latitide 2`);
              }
              if (!checkCoordinateFormat(ARTCC[8], Directions.Longtitude)) {
                pushError(`Invalid ${word2} - Longtitide 2`);
              }
            }
          }
          break;
        }
        case Modes.Geographical: {
          const geoResult = line.match(
            /^([NS]\d{3}\.\d{2}\.\d{2}\.\d{3}) ([EW]\d{3}\.\d{2}\.\d{2}\.\d{3}) ([NS]\d{3}\.\d{2}\.\d{2}\.\d{3}) ([EW]\d{3}\.\d{2}\.\d{2}\.\d{3}) (.{1,14})$/
          );
          if (!geoResult) {
            pushError(`Invalid geo`);
          } else {
            if (!checkCoordinateFormat(geoResult[1], Directions.Latitude)) {
              pushError('Invalid geo - Latitide 1');
            }
            if (!checkCoordinateFormat(geoResult[2], Directions.Longtitude)) {
              pushError('Invalid geo - Longtitide 1');
            }
            if (!checkCoordinateFormat(geoResult[3], Directions.Latitude)) {
              pushError('Invalid geo - Latitide 2');
            }
            if (!checkCoordinateFormat(geoResult[4], Directions.Longtitude)) {
              pushError('Invalid geo - Longtitide 2');
            }
          }
        }
      }
    }
  }
}

for (let i = 0; i <= identifiersToCheck.length - 1; i++) {
  const check = identifiersToCheck[i];
  if (identifiers.indexOf(check.name) === -1) {
    errors.push({
      line: check.line,
      reason: `Cannot find identifier ${check.name}`
    });
  }
}

if (errors.length > 0) {
  for (let i = 0; i <= errors.length - 1; i++) {
    const error = errors[i];
    console.log(`Line ${error.line}: ${error.reason}`);
  }
  process.exitCode = 1;
}
