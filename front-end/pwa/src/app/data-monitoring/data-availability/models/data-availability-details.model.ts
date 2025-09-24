export interface DataAvailaibilityDetails {
  stationId: string;
  elementId: string;
  fromDate: string;
  toDate: string;
  expected: number;
  nonMissing: number;
  confirmedMissing: number;
  gaps: number;
  gapsNMissing: number;
  qcFails: number;

  // TODO. Remove from here
  stationName: string;
  elementAbbrv: string;
}