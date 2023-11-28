import { Injectable } from '@angular/core';
import { FlagModel } from 'src/app/core/models/Flag.model';
import { ElementModel } from 'src/app/core/models/element.model';
import { ObservationModel } from 'src/app/core/models/observation.model';
import { ElementsService } from 'src/app/core/services/elements.service';
import { FlagsService } from 'src/app/core/services/flags.service';
import { ViewPortSize, ViewportService } from 'src/app/core/services/viewport.service';
import { DataSelectorsValues } from './form-entry.component';
import { EntryForm, FieldType } from 'src/app/core/models/entry-form.model';
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

  private getFieldDefinitionItems<T>(items: T[], idProp: keyof T, nameProp: keyof T): FieldDefinition[] {
    const fieldDefinitions: FieldDefinition[] = [];
    for (const item of items) {
      fieldDefinitions.push({ id: Number(item[idProp]), name: String(item[nameProp]) });
    }
    return fieldDefinitions;
  }

  public getFieldDefinitions(
    entryField: FieldType,
    elements: ElementModel[],
    year: number, month: number,
    hours: number[],
  ): FieldDefinition[] {

    let fieldDefinitions: FieldDefinition[];

    switch (entryField) {
      case 'ELEMENT':
        //create field definitions for the selected elements only
        fieldDefinitions = this.getFieldDefinitionItems(elements, "id", "abbreviation");
        break;
      case 'DAY':
        //create field definitions for days of the selected month only
        //note, there is no days selection in the form builder
        fieldDefinitions = this.getFieldDefinitionItems(DateUtils.getDaysInMonthList(year, month), "id", "name");
        break;
      case 'HOUR':
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

  


  public getControlDefsLinear(
    dataSelectors: DataSelectorsValues,
    obsFieldItems: { entryFieldProperty: FieldType, entryPropFieldValue: number[] }
  ): ControlDefinition[] {

    const controlDefinitions: ControlDefinition[][] = this.getControlDefsGrid(
      dataSelectors, [obsFieldItems]
    );

    return controlDefinitions.flatMap(data => (data));
  }

  public getControlDefsGrid(
    dataSelectors: DataSelectorsValues,
    obsFieldItems: [
      { entryFieldProperty: FieldType, entryPropFieldValue: number[] },
      { entryFieldProperty: FieldType, entryPropFieldValue: number[] }?]
  ): ControlDefinition[][] {

    const controlDefinitions: ControlDefinition[][] = [];
    let controlDef: ControlDefinition;

    const obsFieldproperty1 = obsFieldItems[0].entryFieldProperty;

    if ( obsFieldItems.length>1 && obsFieldItems[1]) {

      const obsFieldproperty2 = obsFieldItems[1].entryFieldProperty;

      for (const obsFieldValue1 of obsFieldItems[0].entryPropFieldValue) {

        const subControlDefs: ControlDefinition[] = [];

        for (const obsFieldValue2 of obsFieldItems[1].entryPropFieldValue) {
          controlDef = this.getNewControlDefNew(dataSelectors,
            [{ entryFieldProperty: obsFieldproperty1, entryPropFieldValue: obsFieldValue1 },
            { entryFieldProperty: obsFieldproperty2, entryPropFieldValue: obsFieldValue2 }]);

          subControlDefs.push(controlDef);
        }

        controlDefinitions.push(subControlDefs);

      }
    } else {

      for (const obsFieldValue1 of obsFieldItems[0].entryPropFieldValue) {
        controlDef = this.getNewControlDefNew(dataSelectors,
          [{ entryFieldProperty: obsFieldproperty1, entryPropFieldValue: obsFieldValue1 }, undefined]);

        controlDefinitions.push([controlDef]);

      }
    }



    return controlDefinitions;
  }

  private getNewControlDefNew(
    dataSelectors: DataSelectorsValues,
    obsFieldItems: [
      { entryFieldProperty: FieldType, entryPropFieldValue: number },
      { entryFieldProperty: FieldType, entryPropFieldValue: number }?],
  ): ControlDefinition {


    let observation: ObservationModel = this.getNewEntryData(dataSelectors, obsFieldItems)

    return { entryData: observation };
  }

  private getNewEntryData(dataSelectors: DataSelectorsValues,
    entryFields: [{ entryFieldProperty: FieldType, entryPropFieldValue: number },
      { entryFieldProperty: FieldType, entryPropFieldValue: number }?]): ObservationModel {
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
    if (firstObsField.entryFieldProperty === 'ELEMENT') {
      entryData.elementId = firstObsField.entryPropFieldValue;
    } else if (firstObsField.entryFieldProperty === 'DAY') {
      datetimeVars[2] = firstObsField.entryPropFieldValue;
    } else if (firstObsField.entryFieldProperty === 'HOUR') {
      datetimeVars[3] = firstObsField.entryPropFieldValue;
    } else {
      // Not supported yet
      // Todo throw an error
    }

    if (entryFields.length > 1 && entryFields[1]) {

      const secondObsField = entryFields[1];
      if (secondObsField.entryFieldProperty === 'ELEMENT') {
        entryData.elementId = secondObsField.entryPropFieldValue;
      } else if (secondObsField.entryFieldProperty === 'DAY') {
        datetimeVars[2] = secondObsField.entryPropFieldValue;
      } else if (secondObsField.entryFieldProperty === 'HOUR') {
        datetimeVars[3] = secondObsField.entryPropFieldValue;
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
