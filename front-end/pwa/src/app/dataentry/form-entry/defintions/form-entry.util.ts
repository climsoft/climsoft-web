import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { ExtraSelectorControlType, FieldType } from 'src/app/core/models/sources/create-entry-form.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { FlagEnum } from 'src/app/core/models/observations/flag.enum';
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { FormEntryDefinition } from './form-entry.definition';
import { ObservationDefinition } from './observation.definition';



export interface EntryFieldItem { fieldProperty: FieldType, fieldValues: number[] }

export class FormEntryUtil {

  // public static getEntryFieldDefs(
  //   entryField: ExtraSelectorControlType,
  //   elements: ViewElementModel[],
  //   year: number,
  //   month: number,
  //   hours: number[]): [number, string][] {

  //   let fieldDefs: [number, string][] = [];

  //   switch (entryField) {
  //     case 'ELEMENT':
  //       //create field definitions for the selected elements only
  //       fieldDefs = ArrayUtils.getTuppleWithNumbersAsKeys(elements, "id", "abbreviation");
  //       break;
  //     case 'DAY':
  //       //create field definitions for days of the selected month only
  //       //note, there is no days selection in the form builder
  //       fieldDefs = ArrayUtils.getTuppleWithNumbersAsKeys(DateUtils.getDaysInMonthList(year, month), "id", "name");
  //       break;
  //     case 'HOUR':
  //       //create field definitions for the selected hours only
  //       //note there is always hours selection in the form builder
  //       fieldDefs = ArrayUtils.getTuppleWithNumbersAsKeys(DateUtils.getHours(hours), "id", "name");
  //       break;
  //     default:
  //     //Not supported
  //     //todo. display error in set up 
  //   }

  //   return fieldDefs;
  // }

  // public static getEntryObservationsForLinearLayout(
  //   formDefinition: FormEntryDefinition, 
  //   entryFieldItem: EntryFieldItem, 
  //   dbObservations: CreateObservationModel[], 
  //   convertDateTimeToUTC: boolean): CreateObservationModel[] {

  //   const entryObservations: CreateObservationModel[] = [];
  //   for (const fieldValue of entryFieldItem.fieldValues) {

  //     const entryObservation: CreateObservationModel = FormEntryUtil.getEntryObservation(
  //       formDefinition, 
  //       [{ entryFieldProperty: entryFieldItem.fieldProperty, entryPropFieldValue: fieldValue }], 
  //       convertDateTimeToUTC)

  //     entryObservations.push(FormEntryUtil.getExistingObservationIfItExists(dbObservations, entryObservation));

  //   }

  //   return entryObservations;
  // }

  // public static getEntryObservationsForGridLayout(formFilter: FormEntryDefinition,
  //    entryFieldItems: [EntryFieldItem, EntryFieldItem], dbObservations: CreateObservationModel[], convertDateTimeToUTC: boolean): CreateObservationModel[][] {

  //   const entryObservations: CreateObservationModel[][] = [];
  //   for (const firstFieldValue of entryFieldItems[0].fieldValues) {
  //     const subArrEntryObservations: CreateObservationModel[] = [];
  //     for (const secondFieldValue of entryFieldItems[1].fieldValues) {
  //       const entryObservation: CreateObservationModel = this.getEntryObservation(formFilter,
  //         [{ entryFieldProperty: entryFieldItems[0].fieldProperty, entryPropFieldValue: firstFieldValue },
  //         { entryFieldProperty: entryFieldItems[1].fieldProperty, entryPropFieldValue: secondFieldValue }], convertDateTimeToUTC);

  //       subArrEntryObservations.push(this.getExistingObservationIfItExists(dbObservations, entryObservation));
  //     }

  //     entryObservations.push(subArrEntryObservations);

  //   }

  //   return entryObservations;
  // }


  // private static getEntryObservation(formDefinition: FormEntryDefinition,
  //   entryFields: [
  //     { entryFieldProperty: ExtraSelectorControlType, entryPropFieldValue: number },
  //     { entryFieldProperty: ExtraSelectorControlType, entryPropFieldValue: number }?
  //   ], convertDateTimeToUTC: boolean): CreateObservationModel {
  //   //create new entr data
  //   const entryObservation: CreateObservationModel = {
  //     stationId: formDefinition.station.id,
  //     sourceId: formDefinition.sourceId,
  //     elementId: 0, elevation: 0,
  //     datetime: '',
  //     value: null, flag: null,
  //     period: formDefinition.formMetadata.period,
  //     comment: null,
  //   };

  //   //set other fields
  //   if (formDefinition.elementSelectorValue) {
  //     entryObservation.elementId = formDefinition.elementSelectorValue;
  //   }

  //   let datetimeVars: [number, number, number, number] = [-1, -1, -1, -1];

  //   datetimeVars[0] = formDefinition.yearSelectorValue;
  //   datetimeVars[1] = formDefinition.monthSelectorValue;

  //   if (formDefinition.daySelectorValue) {
  //     datetimeVars[2] = formDefinition.daySelectorValue;
  //   }

  //   if (formDefinition.hourSelectorValue !== null) {
  //     datetimeVars[3] = formDefinition.hourSelectorValue;
  //   }

  //   //set entry field
  //   const firstEntryField = entryFields[0]
  //   if (firstEntryField.entryFieldProperty === 'ELEMENT') {
  //     entryObservation.elementId = firstEntryField.entryPropFieldValue;
  //   } else if (firstEntryField.entryFieldProperty === 'DAY') {
  //     datetimeVars[2] = firstEntryField.entryPropFieldValue;
  //   } else if (firstEntryField.entryFieldProperty === 'HOUR') {
  //     datetimeVars[3] = firstEntryField.entryPropFieldValue;
  //   } else {
  //     // Not supported yet
  //     // Todo throw an error
  //   }

  //   if (entryFields.length > 1 && entryFields[1]) {

  //     const secondEntryField = entryFields[1];
  //     if (secondEntryField.entryFieldProperty === 'ELEMENT') {
  //       entryObservation.elementId = secondEntryField.entryPropFieldValue;
  //     } else if (secondEntryField.entryFieldProperty === 'DAY') {
  //       datetimeVars[2] = secondEntryField.entryPropFieldValue;
  //     } else if (secondEntryField.entryFieldProperty === 'HOUR') {
  //       datetimeVars[3] = secondEntryField.entryPropFieldValue;
  //     } else {
  //       // Not supported yet
  //       // Todo throw an error
  //     }

  //   }

  //   //set datetime from date time variables. year-month-day hour. 
  //   if (convertDateTimeToUTC) {
  //     entryObservation.datetime = new Date(datetimeVars[0], datetimeVars[1] - 1, datetimeVars[2], datetimeVars[3], 0, 0).toISOString();
  //   } else {
  //     entryObservation.datetime = `${datetimeVars[0]}-${StringUtils.addLeadingZero(datetimeVars[1])}-${StringUtils.addLeadingZero(datetimeVars[2])}T${datetimeVars[3]}:00:000Z`;
  //     //console.log("entryObservation: ", entryObservation);
  //   }

  //   return entryObservation;
  // }



  // private static getExistingObservationIfItExists(dbObservations: CreateObservationModel[], entryObservation: CreateObservationModel): CreateObservationModel {
  //   for (const dbObservation of dbObservations) {
  //     // Look for the observation element id and date time.
  //     if (
  //       entryObservation.stationId === dbObservation.stationId &&
  //       entryObservation.elementId === dbObservation.elementId &&
  //       entryObservation.sourceId === dbObservation.sourceId &&
  //       entryObservation.elevation === dbObservation.elevation &&
  //       entryObservation.datetime === dbObservation.datetime &&
  //       entryObservation.period === dbObservation.period) {
  //       return dbObservation;
  //     }
  //   }

  //   return entryObservation;

  // }

  public static getScaledValue(element: ViewElementModel, unscaledValue: number): number {
    // To remove rounding errors use Math.floor()
    return element.entryScaleFactor ? Math.floor(unscaledValue * element.entryScaleFactor) : unscaledValue;
  }

  public static getTotal(entryObservations: ObservationDefinition[], elements: ViewElementModel[]): number | null {
    let total = 0;
    let allAreNull: boolean = true;

    if (entryObservations.length > 0) {
      // Create a map for quick element lookup
      const elementsMap = new Map(elements.map(element => [element.id, element]));
      for (const obs of entryObservations) {
        if (obs.observation.value !== null) {
          const element = elementsMap.get(obs.observation.elementId);
          total = element ? total + FormEntryUtil.getScaledValue(element, obs.observation.value) : total;
          allAreNull = false;
        }
      }
    }

    return allAreNull ? null : total;

  }


  public static checkTotal(expectedTotal: number | null, inputTotal: number | null): string {

    let errorMessage: string = '';

    if (inputTotal !== expectedTotal) {
      if (expectedTotal !== null) {
        errorMessage = `Expected total is ${expectedTotal}`;
      } else {
        errorMessage = `No total total expected`;
      }
    }

    return errorMessage;
  }

  // TODO. move later to shared code
  public static checkFlagValidity(inputFlag: string | null): FlagEnum | null {
    // Early return for null input
    if (inputFlag === null || inputFlag === '') {
      return null;
    }

    // TODO. Test and optimise this
    const flags: FlagEnum[] = Object.values<FlagEnum>(FlagEnum);
    for (const f of flags) {
      if (inputFlag[0].toLowerCase() === f[0].toLowerCase()) {
        return f;
      }
    }

    // Check if inputFlagId is a valid FlagEnum key
    return null;
  }



}
