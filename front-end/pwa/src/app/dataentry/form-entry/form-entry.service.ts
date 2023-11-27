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
import { ControlDefinition } from '../controls/value-flag-input/value-flag-input.component';


export interface FieldDefinition {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormEntryService {

  public getFieldDefinitionItems<T>(items: T[], idProp: keyof T, nameProp: keyof T): FieldDefinition[] {
    const fieldDefinitions: FieldDefinition[] = [];
    for (const item of items) {
      fieldDefinitions.push({ id: Number(item[idProp]), name: String(item[nameProp]) });
    }
    return fieldDefinitions;
  }

  public getFieldDefinitions(
    entryField: string,
    elements: ElementModel[],
    year: number, month: number,
    hours: number[],
  ): FieldDefinition[] {

    let fieldDefinitions: FieldDefinition[];

    switch (entryField) {
      case "elementId":
        //create field definitions for the selected elements only
        fieldDefinitions = this.getFieldDefinitionItems(elements, "id", "abbreviation");
        break;
      case "day":
        //create field definitions for days of the selected month only
        //note, there is no days selection in the form builder
        fieldDefinitions = this.getFieldDefinitionItems(DateUtils.getDaysInMonthList(year, month), "id", "name");
        break;
      case "hour":
        //create field definitions for the selected hours only
        //note there is always hours selection in the form builder
        fieldDefinitions = this.getFieldDefinitionItems(hours.length > 0 ? DateUtils.getHours(hours) : DateUtils.getHours(), "id", "name");
        break;
      default:
        //Not supported
        //todo. display error in set up
        return [];
    }

    return fieldDefinitions;
  }

  //gets an array of control definitions from the passed array
  public getNewControlDefs(
    dataSelectors: DataSelectorsValues,
    observationFieldId: string,
    observationFieldItems: FieldDefinition[],
    observations: ObservationModel[],
    setLabel: boolean,
  ): ControlDefinition[] {

    const controlDefinitions: ControlDefinition[] = [];
    for (const item of observationFieldItems) {

      let observation: ObservationModel = this.getNewEntryDataDelete(dataSelectors,
        [observationFieldId], [item.id])

      const controlDefinition: ControlDefinition = { entryData: observation }

      if (setLabel) {
        controlDefinition.label = item.name;
      }

      for (const observation of observations) {
        // Look for the observation element id and date time.
        // The other criteria is taken care of by data selectors; station and source id

        // Todo. confirm this check for duplicates. 
        // For instance when level and period is not part of the data selector
        if (controlDefinition.entryData.elementId === observation.elementId && controlDefinition.entryData.datetime === observation.datetime) {
          controlDefinition.entryData = observation;
        }
      }

      controlDefinitions.push(controlDefinition);
    }
    return controlDefinitions;
  }


  public getNewControlDefs1(
    dataSelectors: DataSelectorsValues,
    obsFieldItems: { obsFieldProperty: string, obsFieldValues: number[] }
  ): ControlDefinition[] {

    const controlDefinitions: ControlDefinition[][] = this.getNewControlDefs2(
      dataSelectors, [obsFieldItems]
    );

    return controlDefinitions.flatMap(data => (data));
  }

  public getNewControlDefs2(
    dataSelectors: DataSelectorsValues,
    obsFieldItems: [
      { obsFieldProperty: string, obsFieldValues: number[] },
      { obsFieldProperty: string, obsFieldValues: number[] }?]
  ): ControlDefinition[][] {

    const controlDefinitions: ControlDefinition[][] = [];
    let controlDef: ControlDefinition;

    const obsFieldproperty1 = obsFieldItems[0].obsFieldProperty;

    if ( obsFieldItems.length>1 && obsFieldItems[1]) {

      const obsFieldproperty2 = obsFieldItems[1].obsFieldProperty;

      for (const obsFieldValue1 of obsFieldItems[0].obsFieldValues) {

        const subControlDefs: ControlDefinition[] = [];

        for (const obsFieldValue2 of obsFieldItems[1].obsFieldValues) {
          controlDef = this.getNewControlDefNew(dataSelectors,
            [{ obsFieldProperty: obsFieldproperty1, obsFieldValue: obsFieldValue1 },
            { obsFieldproperty: obsFieldproperty2, obsFieldValue: obsFieldValue2 }]);

          subControlDefs.push(controlDef);
        }

        controlDefinitions.push(subControlDefs);

      }
    } else {
      for (const obsFieldValue1 of obsFieldItems[0].obsFieldValues) {
        controlDef = this.getNewControlDefNew(dataSelectors,
          [{ obsFieldProperty: obsFieldproperty1, obsFieldValue: obsFieldValue1 }, undefined]);

        controlDefinitions.push([controlDef]);

      }
    }



    return controlDefinitions;
  }

  private getNewControlDefNew(
    dataSelectors: DataSelectorsValues,
    obsFieldItems: [
      { obsFieldProperty: string, obsFieldValue: number },
      { obsFieldproperty: string, obsFieldValue: number }?],
  ): ControlDefinition {


    let observation: ObservationModel = this.getNewEntryData(dataSelectors, obsFieldItems)

    return { entryData: observation };
  }

  public getNewEntryData(dataSelectors: DataSelectorsValues,
    entryFields: [{ obsFieldProperty: string, obsFieldValue: number },
      { obsFieldproperty: string, obsFieldValue: number }?]): ObservationModel {
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
    const firstObsField = entryFields[0]
    if (firstObsField.obsFieldProperty === "elementId") {
      entryData.elementId = firstObsField.obsFieldValue;
    } else if (firstObsField.obsFieldProperty === "day") {
      datetimeVars[2] = firstObsField.obsFieldValue;
    } else if (firstObsField.obsFieldProperty === "hour") {
      datetimeVars[3] = firstObsField.obsFieldValue;
    } else {
      // Not supported yet
      // Todo throw an error
    }

    if (entryFields.length > 1 && entryFields[1]) {

      const secondObsField = entryFields[1];
      if (secondObsField.obsFieldproperty === "elementId") {
        entryData.elementId = secondObsField.obsFieldValue;
      } else if (secondObsField.obsFieldproperty === "day") {
        datetimeVars[2] = secondObsField.obsFieldValue;
      } else if (secondObsField.obsFieldproperty === "hour") {
        datetimeVars[3] = secondObsField.obsFieldValue;
      } else {
        // Not supported yet
        // Todo throw an error
      }


    }

    //set datetime from date time variables. year-month-day hour. JS months are 0 based 
    entryData.datetime = DateUtils.getDateInSQLFormat(datetimeVars[0], datetimeVars[1], datetimeVars[2], datetimeVars[3], 0, 0);

    return entryData;
  }


  public getNewEntryDataDelete(dataSelectors: DataSelectorsValues, entryFields: string[], entryFieldValue: number[]): ObservationModel {
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

  public setExistingObsToControlDefs(controlsDefs: ControlDefinition[], observations: ObservationModel[]): void {


    for (const controlDef of controlsDefs) {

      for (const observation of observations) {

        // Look for the observation element id and date time.
        // Todo. add station, source id, level and period

        // Todo. confirm this check for duplicates. 
        // For instance when level and period is not part of the data selector
        if (controlDef.entryData.elementId === observation.elementId && controlDef.entryData.datetime === observation.datetime) {
          controlDef.entryData = observation;
        }

      }

    }

  }



}
