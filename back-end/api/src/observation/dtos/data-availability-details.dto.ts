export class DataAvailaibilityDetailsDto {
  stationId: string;
  elementId: number;
  level: number;
  interval: number;
  fromDate: string;
  toDate: string;
  expected: number;
  nonMissing: number;
  confirmedMissing: number;
  gaps: number;
  gapsPlusMissing: number;
  qcNones: number;
  qcPasses: number;
  qcFails: number;
}