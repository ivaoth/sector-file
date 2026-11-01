const adjustedWaypointIdents = new Set(['MODON', 'BLAFF']);

export function adjustLat(ident: string, dmsLat: string): string {
  if (!adjustedWaypointIdents.has(ident)) {
    return dmsLat;
  }

  let [degrees, minutes, seconds, milliseconds] = dmsLat
    .substring(1)
    .split(/[.]/)
    .map((value) => parseInt(value, 10));

  milliseconds += 1;
  if (milliseconds >= 1000) {
    milliseconds = 0;
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

  const direction = dmsLat[0];
  const adjustedLat = `${direction}${degrees.toString().padStart(3, '0')}.${minutes
    .toString()
    .padStart(2, '0')}.${seconds.toString().padStart(2, '0')}.${milliseconds
    .toString()
    .padStart(3, '0')}`;

  console.log(`Adjusted ${ident}: ${adjustedLat}`);
  return adjustedLat;
}
