import { Injectable } from '@angular/core';
import { ElementModel } from 'src/app/core/models/element.model';
import { ObservationModel } from 'src/app/core/models/observation.model';
import { DataSelectorsValues } from './form-entry.component';
import { FieldType } from 'src/app/core/models/entry-form.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { ControlDefinition } from '../controls/value-flag-input/value-flag-input.component';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';


export interface FieldDefinition {
  id: number;
  name: string;
}

export interface EntryFieldItem { fieldProperty: FieldType, fieldValues: number[] }

@Injectable({
  providedIn: 'root'
})
export class FormEntryService {


  public getEntryFieldDefs(entryField: FieldType, elements: ElementModel[], year: number, month: number, hours: number[],): [number, string][] {

    let fieldDefs: [number, string][] = [];

    switch (entryField) {
      case 'ELEMENT':
        //create field definitions for the selected elements only
        fieldDefs = ArrayUtils.getTuppleWithNumbersAsKeys(elements, "id", "abbreviation");
        break;
      case 'DAY':
        //create field definitions for days of the selected month only
        //note, there is no days selection in the form builder
        fieldDefs = ArrayUtils.getTuppleWithNumbersAsKeys(DateUtils.getDaysInMonthList(year, month), "id", "name");
        break;
      case 'HOUR':
        //create field definitions for the selected hours only
        //note there is always hours selection in the form builder
        fieldDefs = ArrayUtils.getTuppleWithNumbersAsKeys(hours.length > 0 ? DateUtils.getHours(hours) : DateUtils.getHours(), "id", "name");
        break;
      default:
      //Not supported
      //todo. display error in set up 
    }

    return fieldDefs;
  }

  public getControlDefsLinear(dataSelectors: DataSelectorsValues, entryFieldItem: EntryFieldItem, observations: ObservationModel[]): ControlDefinition[] {

    const controlDefs: ControlDefinition[] = [];
    for (const firstFieldValue of entryFieldItem.fieldValues) {

      const newEntryData: ObservationModel = this.getNewEntryData(dataSelectors, [{ entryFieldProperty: entryFieldItem.fieldProperty, entryPropFieldValue: firstFieldValue }])

      controlDefs.push({ entryData: this.getExistingObservationIfItExists(observations, newEntryData) });

    }

    return controlDefs;
  }

  public getControlDefsGrid(dataSelectors: DataSelectorsValues, entryFieldItems: [EntryFieldItem, EntryFieldItem], observations: ObservationModel[]): ControlDefinition[][] {

    const controlDefs: ControlDefinition[][] = [];
    for (const firstFieldValue of entryFieldItems[0].fieldValues) {
      const subArrControlDefs: ControlDefinition[] = [];
      for (const secondFieldValue of entryFieldItems[1].fieldValues) {
        const newEntryData: ObservationModel = this.getNewEntryData(dataSelectors,
          [{ entryFieldProperty: entryFieldItems[0].fieldProperty, entryPropFieldValue: firstFieldValue },
          { entryFieldProperty: entryFieldItems[1].fieldProperty, entryPropFieldValue: secondFieldValue }]);

        subArrControlDefs.push({ entryData: this.getExistingObservationIfItExists(observations, newEntryData) });
      }

      controlDefs.push(subArrControlDefs);

    }

    return controlDefs;
  }


  private getNewEntryData(dataSelectors: DataSelectorsValues,
    entryFields: [{ entryFieldProperty: FieldType, entryPropFieldValue: number }, { entryFieldProperty: FieldType, entryPropFieldValue: number }?]): ObservationModel {
    //create new entr data
    const entryData: ObservationModel = {
      stationId: dataSelectors.stationId,
      sourceId: dataSelectors.sourceId,
      elementId: 0, level: 'surface', datetime: '', value: null, flag: null, qcStatus: 0, period: 0, comment: null, log: null
    };

    //set other fields
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
    const firstEntryField = entryFields[0]
    if (firstEntryField.entryFieldProperty === 'ELEMENT') {
      entryData.elementId = firstEntryField.entryPropFieldValue;
    } else if (firstEntryField.entryFieldProperty === 'DAY') {
      datetimeVars[2] = firstEntryField.entryPropFieldValue;
    } else if (firstEntryField.entryFieldProperty === 'HOUR') {
      datetimeVars[3] = firstEntryField.entryPropFieldValue;
    } else {
      // Not supported yet
      // Todo throw an error
    }

    if (entryFields.length > 1 && entryFields[1]) {

      const secondEntryField = entryFields[1];
      if (secondEntryField.entryFieldProperty === 'ELEMENT') {
        entryData.elementId = secondEntryField.entryPropFieldValue;
      } else if (secondEntryField.entryFieldProperty === 'DAY') {
        datetimeVars[2] = secondEntryField.entryPropFieldValue;
      } else if (secondEntryField.entryFieldProperty === 'HOUR') {
        datetimeVars[3] = secondEntryField.entryPropFieldValue;
      } else {
        // Not supported yet
        // Todo throw an error
      }

    }

    //set datetime from date time variables. year-month-day hour. JS months are 0 based 
    entryData.datetime = DateUtils.getDateInSQLFormat(datetimeVars[0], datetimeVars[1], datetimeVars[2], datetimeVars[3], 0, 0);

    return entryData;
  }



  private getExistingObservationIfItExists(savedObservations: ObservationModel[], newEntryData: ObservationModel): ObservationModel {
    for (const savedObservation of savedObservations) {

      // Look for the observation element id and date time.
      // Todo. add station, source id, level and period

      // Todo. confirm this check for duplicates. 
      // For instance when level and period is not part of the data selector
      if (newEntryData.elementId === savedObservation.elementId && newEntryData.datetime === savedObservation.datetime) {
        return savedObservation;
      }

    }

    return newEntryData;

  }




}
