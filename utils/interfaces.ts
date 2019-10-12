export interface Airport {
  ident: string;
  name: string;
  tower_frequency: number | null;
  lonx: number;
  laty: number;
  mag_var: number;
  runways: Runway[];
  airspaceClass: string;
  altitude: number;
}

interface Runway {
  runway1: string;
  ils1: string;
  lon1: number;
  lat1: number;
  hdg1: number;
  alt1: number;
  runway2: string;
  ils2: string;
  lon2: number;
  lat2: number;
  hdg2: number;
  alt2: number;
}

export interface Segment {
  name: string;
  segment_no: number;
  sequence_no: number;
  wpt_from: string;
  wpt_to: string;
  type: string;
  from_lat: number;
  from_lon: number;
  to_lat: number;
  to_lon: number;
  direction: "N" | "B" | "F";
  region_from: string;
  region_to: string;
}

export interface Vor {
  ident: string;
  name: string;
  frequency: number;
  laty: number;
  lonx: number;
}

export interface Ndb {
  ident: string;
  name: string;
  frequency: number;
  laty: number;
  lonx: number;
}

export interface Waypoint {
  ident: string;
  laty: number;
  lonx: number;
}

export interface Fir {
  name: string;
  code: string;
  points: [number, number][];
}

export interface Area {
  name: string;
  points: [number, number][];
  type: string;
  restrictive_type: string;
  restrictive_designation: string;
  max_laty: number;
  max_lonx: number;
  min_laty: number;
  min_lonx: number;
  multiple_code: string;
}

export interface Metadata {
  icao: string;
  defaultPosition: string;
  defaultAirport: string;
  defaultCentrePoint: [number, number];
  ratio: [number, number];
  magVar: number;
  scalingFactor: number;
  include: string;
}
