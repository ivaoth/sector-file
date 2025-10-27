import { Segment } from '../../utils/interfaces';

// Function to convert decimal degrees to DMS (Degrees, Minutes, Seconds) format
function decimalToDMS(decimal: number, isLat: boolean): string {
  const degrees = Math.floor(Math.abs(decimal));
  const minutes = Math.floor((Math.abs(decimal) - degrees) * 60);
  const seconds = Math.round(((Math.abs(decimal) - degrees) * 60 - minutes) * 60 * 100) / 100;
  const direction = decimal >= 0 ? (isLat ? 'N' : 'E') : (isLat ? 'S' : 'W');

  return `${direction}${degrees.toString().padStart(3, '0')}.${minutes.toString().padStart(2, '0')}.${seconds.toFixed(3).padStart(6, '0')}`;
}

const getDirection = (
  from_laty: number,
  from_lonx: number,
  to_laty: number,
  to_lonx: number,
  direction: 'N' | 'B' | 'F'
): '⬆️' | '↗️' | '➡️' | '↘️' | '⬇️' | '↙️' | '⬅️' | '↖️' | '' => {
  if (direction === 'N') return '';
  const diff_laty = to_laty - from_laty;
  const diff_lonx = to_lonx - from_lonx;
  if (diff_lonx === 0) {
    // Vertical
    if (diff_laty > 0 ? direction === 'F' : direction === 'B') {
      return '⬆️';
    }
    return '⬇️';
  }
  const ratio = Math.abs(diff_laty / diff_lonx);

  if (ratio < Math.tan(Math.PI / 8)) {
    if (diff_lonx > 0 ? direction === 'F' : direction === 'B') {
      return '➡️';
    }
    return '⬅️';
  }

  if (ratio > Math.tan((Math.PI * 3) / 8)) {
    if (diff_laty > 0 ? direction === 'F' : direction === 'B') {
      return '⬆️';
    }
    return '⬇️';
  }

  if (
    (diff_laty > 0 && diff_lonx > 0 && direction === 'F') ||
    (diff_laty < 0 && diff_lonx < 0 && direction === 'B')
  ) {
    return '↗️';
  }

  if (
    (diff_laty > 0 && diff_lonx < 0 && direction === 'F') ||
    (diff_laty < 0 && diff_lonx > 0 && direction === 'B')
  ) {
    return '↖️';
  }

  if (
    (diff_laty < 0 && diff_lonx < 0 && direction === 'F') ||
    (diff_laty > 0 && diff_lonx > 0 && direction === 'B')
  ) {
    return '↙️';
  }

  return '↘️';
};

export const formatAirways = (
  airways: Segment[][],
  mode: 'J' | 'V'
): string => {
  let out = '';
  const segmentLabelMap: {
    from: string;
    to: string;
    airways: {
      name: string;
      direction: '⬆️' | '↗️' | '➡️' | '↘️' | '⬇️' | '↙️' | '⬅️' | '↖️' | '';
    }[];
    from_lat_decimal: number;
    from_lon_decimal: number;
    to_lat_decimal: number;
    to_lon_decimal: number;
  }[] = [];

  for (const fragment of airways) {
    const filtered = fragment.filter((f) => f.type === mode || f.type === 'B');
    let count = -1;

    if (filtered.length > 0) {
      out += `T;${filtered[0].name};${filtered[0].wpt_from};${filtered[0].wpt_from};\n`;
    }

    for (const segment of filtered) {
      if (count !== -1 && segment.sequence_no !== count + 1) {
        console.log(
          `${mode === 'J' ? 'High' : 'Low'} airway ${segment.name} fragment ${
            segment.segment_no
          } skips from ${count} to ${segment.sequence_no}`
        );
        out += `T;DUMMY;${segment.wpt_from};${segment.wpt_from};\n`;
        out += `T;${segment.name};${segment.wpt_from};${segment.wpt_from};\n`;
      }
      count = segment.sequence_no;

      // Airway polyline output (unchanged)
      out += `T;${segment.name};${segment.wpt_to};${segment.wpt_to};\n`;

      // ⬇️ NEW: only collect label entries if either end is VT
      const touchesVT =
        segment.region_from === 'VT' || segment.region_to === 'VT';
      if (!touchesVT) continue;

      const labelCache = segmentLabelMap.find(
        (l) =>
          (l.from === segment.wpt_from && l.to === segment.wpt_to) ||
          (l.from === segment.wpt_to && l.to === segment.wpt_from)
      );

      const entry = {
        name: segment.name,
        direction: getDirection(
          segment.from_lat,
          segment.from_lon,
          segment.to_lat,
          segment.to_lon,
          segment.direction
        )
      };

      if (labelCache) {
        labelCache.airways.push(entry);
      } else {
        segmentLabelMap.push({
          from: segment.wpt_from,
          to: segment.wpt_to,
          airways: [entry],
          from_lat_decimal: segment.from_lat,
          from_lon_decimal: segment.from_lon,
          to_lat_decimal: segment.to_lat,
          to_lon_decimal: segment.to_lon
        });
      }
    }
  }

  // Emit labels only for the collected VT-touching segments
  for (const label of segmentLabelMap) {
    out += `L;${label.airways
      .map((s) => `${s.name}${s.direction}`)
      .join('/')};${decimalToDMS(
      (label.from_lat_decimal + label.to_lat_decimal) / 2,
      true
    )};${decimalToDMS(
      (label.from_lon_decimal + label.to_lon_decimal) / 2,
      false
    )};\n`;
  }

  return out;
};
