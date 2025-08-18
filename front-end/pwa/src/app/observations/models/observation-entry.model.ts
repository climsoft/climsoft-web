import { ObservationDefinition } from "src/app/data-ingestion/form-entry/defintitions/observation.definition";

export interface ObservationEntry {
  obsDef: ObservationDefinition;
  stationName: string;
  elementAbbrv: string;
  sourceName: string;
  formattedDatetime: string;
  intervalName: string;
  delete: boolean;
}