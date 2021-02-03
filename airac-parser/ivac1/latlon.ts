export enum Coordinate {
  Latitude,
  Longtitude
}

export const convertCoordinate = (value: number, type: Coordinate): string => {
  let out = '';
  if (type === Coordinate.Latitude) {
    if (value >= 0) {
      out += 'N';
    } else {
      value *= -1;
      out += 'S';
    }
  } else {
    if (value >= 0) {
      out += 'E';
    } else {
      value *= -1;
      out += 'W';
    }
  }
  let num1 = Math.floor(value);
  let num2 = Math.floor((value - num1) * 60);
  let num3 = Math.floor(((value - num1) * 60 - num2) * 60);
  let num4 = Math.round((((value - num1) * 60 - num2) * 60 - num3) * 1000);
  if (num4 === 1000) {
    num4 = 0;
    num3 += 1;
  }
  if (num3 === 60) {
    num3 = 0;
    num2 += 1;
  }
  if (num2 === 60) {
    num2 = 0;
    num1 += 1;
  }
  out += `${`${num1}`.padStart(3, '0')}.${`${num2}`.padStart(
    2,
    '0'
  )}.${`${num3}`.padStart(2, '0')}.${`${num4}`.padStart(3, '0')}`;
  return out;
};

export const convertPoint = (value: number[], isLatLon = false): string => {
  if (isLatLon) {
    return `${convertCoordinate(
      value[0],
      Coordinate.Latitude
    )} ${convertCoordinate(value[1], Coordinate.Longtitude)}`;
  } else {
    return `${convertCoordinate(
      value[1],
      Coordinate.Latitude
    )} ${convertCoordinate(value[0], Coordinate.Longtitude)}`;
  }
};
