import { Segment } from '../../utils/interfaces';

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
    from_lat: number;
    from_lon: number;
    to_lat: number;
    to_lon: number;
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
      out += `T;${segment.name};${segment.wpt_to};${segment.wpt_to};\n`;
      const labelCache = segmentLabelMap.find(
        (l) =>
          (l.from === segment.wpt_from && l.to === segment.wpt_to) ||
          (l.from === segment.wpt_to && l.to === segment.wpt_from)
      );
      if (labelCache) {
        labelCache.airways.push({
          name: segment.name,
          direction: getDirection(
            segment.from_lat,
            segment.from_lon,
            segment.to_lat,
            segment.to_lon,
            segment.direction
          )
        });
      } else {
        segmentLabelMap.push({
          from: segment.wpt_from,
          to: segment.wpt_to,
          airways: [
            {
              name: segment.name,
              direction: getDirection(
                segment.from_lat,
                segment.from_lon,
                segment.to_lat,
                segment.to_lon,
                segment.direction
              )
            }
          ],
          from_lat: segment.from_lat,
          from_lon: segment.from_lon,
          to_lat: segment.to_lat,
          to_lon: segment.to_lon
        });
      }
    }
  }
  for (const label of segmentLabelMap) {
    out += `L;${label.airways
      .map((s) => `${s.name}${s.direction}`)
      .join('/')};${((label.from_lat + label.to_lat) / 2).toFixed(6)};${(
      (label.from_lon + label.to_lon) /
      2
    ).toFixed(6)};\n`;
  }
  return out;
};
