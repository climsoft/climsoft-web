import { Injectable } from '@angular/core';
import { FlagModel } from 'src/app/core/models/Flag.model';
import { ElementModel } from 'src/app/core/models/element.model';
import { ObservationModel } from 'src/app/core/models/observation.model';
import { ElementsService } from 'src/app/core/services/elements.service';
import { FlagsService } from 'src/app/core/services/flags.service';
import { ViewPortSize, ViewportService } from 'src/app/core/services/viewport.service';
import { DataSelectorsValues } from './form-entry.component';
import { EntryForm } from 'src/app/core/models/entry-form.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';

@Injectable({
  providedIn: 'root'
})
export class FormEntryService {



  public getNewEntryData(dataSelectors: DataSelectorsValues, entryFields: string[], entryFieldValue: number[]): ObservationModel {
    //create new entr data
    const entryData: ObservationModel = { stationId: '0', sourceId: 0, elementId: 0, level: 'surface', datetime: '', value: null, flag: null, qcStatus: 0, period: 0, comment: null, log: null };

    //set data source
    entryData.sourceId = dataSelectors.sourceId;
    entryData.stationId = dataSelectors.stationId;

    //set entry selector value
    if (dataSelectors.elementId > 0) {
      entryData.elementId = dataSelectors.elementId;
    }

    let datetimeVars: [number, number, number, number] = [-1, -1, -1, -1];

    datetimeVars[0] = dataSelectors.year;
    datetimeVars[1] = dataSelectors.month;

    if (dataSelectors.day > 0) {
      datetimeVars[2] = dataSelectors.day;
    }

    if (dataSelectors.hour > -1) {
      datetimeVars[3] = dataSelectors.hour;
    }

    //set entry field
    if (entryFields[0] === "elementId") {
      entryData.elementId = entryFieldValue[0];
    } else if (entryFields[0] === "day") {
      datetimeVars[2] = entryFieldValue[0];
    } else if (entryFields[0] === "hour") {
      datetimeVars[3] = entryFieldValue[0];
    } else {
      // Not supported yet
      // Todo throw an error
    }

    if (entryFields.length > 1 && entryFieldValue.length > 1) {

      if (entryFields[1] === "elementId") {
        entryData.elementId = entryFieldValue[1];
      } else if (entryFields[1] === "day") {
        datetimeVars[2] = entryFieldValue[1];
      } else if (entryFields[1] === "hour") {
        datetimeVars[3] = entryFieldValue[1];
      } else {
        // Not supported yet
        // Todo throw an error
      }


    }

    //set datetime from date time variables. year-month-day hour. JS months are 0 based 
    entryData.datetime = DateUtils.getDateInSQLFormat(datetimeVars[0], datetimeVars[1], datetimeVars[2], datetimeVars[3], 0, 0);

    return entryData;
  }



}
