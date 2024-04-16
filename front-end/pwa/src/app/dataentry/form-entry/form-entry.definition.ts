import { ExtraSelectorControlType, FieldType } from "src/app/core/models/sources/create-entry-form.model";
import { ViewEntryFormModel } from "src/app/core/models/sources/view-entry-form.model";
import { DateUtils } from "src/app/shared/utils/date.utils";
import { FieldEntryDefinition } from "./field.definition";
import { CreateObservationModel } from "src/app/core/models/create-observation.model";
import { ViewStationModel } from "src/app/core/models/view-station.model";
import { StringUtils } from "src/app/shared/utils/string.utils";

export class FormEntryDefinition {

   public station: ViewStationModel;
   public sourceId: number;
   public formMetadata: ViewEntryFormModel;

   /** value of the element selector */
   public elementSelectorValue: number | null;

    /** value of the year selector */
   public yearSelectorValue: number;

   /** value of the month selector */
   public monthSelectorValue: number;

   /** value of the day selector */
   public daySelectorValue: number | null;

   /** value of the hour selector */
   public hourSelectorValue: number | null;

     /** Observations in the database */
  public dbObservations: CreateObservationModel[];

    constructor(station: ViewStationModel, sourceId: number, formMetadata: ViewEntryFormModel) {
        this.station = station;
        this.sourceId = sourceId;
        this.formMetadata = formMetadata;

        // Set the selectors values based on defined selectors in the form metadata

        this.elementSelectorValue = formMetadata.selectors.includes('ELEMENT') ? formMetadata.elementIds[0] : null;
        const todayDate: Date = new Date();
        this.yearSelectorValue = todayDate.getFullYear();
        this.monthSelectorValue = todayDate.getMonth() + 1;
        this.daySelectorValue = formMetadata.selectors.includes('DAY') ? todayDate.getDate() : null;
        this.hourSelectorValue = formMetadata.selectors.includes('HOUR') ? formMetadata.hours[0] : null;

        this.dbObservations = [];
    }

    public get elementValuesForDBQuerying(): number[] {
        // If element selector value is not null then use it as the value for querying the database.
        // If null, then use the list of elements allowed in the form
        return this.elementSelectorValue ? [this.elementSelectorValue] : this.formMetadata.elementIds;
    }

    public get hourValuesForDBQuerying(): number[] {
        // If hour selector value is not null then use it as the value for querying the database.
        // If null, then use the list of hour allowed in the form
        return this.hourSelectorValue !== null ? [this.hourSelectorValue] : this.formMetadata.hours;
    }

    /** gets the entry field definations used to create and label the value flag controls */
    public getEntryFieldDefs(entryField: FieldType): FieldEntryDefinition[] {

        let entryFieldDefs: FieldEntryDefinition[] = [];

        switch (entryField) {
            case 'ELEMENT':
                //create field definitions for the selected elements only
                entryFieldDefs = this.formMetadata.elementsMetadata.map(item => ({ id: item.id, name: item.abbreviation }));
                break;
            case 'DAY':
                //create field definitions for days of the selected month only
                //note, there is no days selection in the form builder
                entryFieldDefs = DateUtils.getDaysInMonthList(this.yearSelectorValue, this.monthSelectorValue);
                break;
            case 'HOUR':
                //create field definitions for the selected hours only
                //note there is always hours selection in the form builder
                entryFieldDefs = DateUtils.getHours(this.formMetadata.hours);
                break;
            default:
            //Not supported
            //todo. display error in set up 
        }

        return entryFieldDefs;
    }

    /** Gets the observations that will be used by the value flag controls in a linear layout */
    public getEntryObsForLinearLayout(): CreateObservationModel[] {

        const newObservations: CreateObservationModel[] = [];
        const entryField: FieldType = this.formMetadata.fields[0];
        const entryfieldDefs: FieldEntryDefinition[] = this.getEntryFieldDefs(entryField)

        for (const fieldDef of entryfieldDefs) {

            const newObs: CreateObservationModel = this.createEmptyObservation();
            newObs.stationId = this.station.id;
            newObs.sourceId = this.sourceId;
            newObs.elevation = this.station.elevation;

            if (this.elementSelectorValue) {
                newObs.elementId = this.elementSelectorValue;
            } else if (entryField === 'ELEMENT') {
                newObs.elementId = fieldDef.id;
            }

            // Set date time of observation
            // Year, month, day, hour
            let datetimeVars: [number, number, number, number] = [this.yearSelectorValue, this.monthSelectorValue, -1, -1];

            if (this.daySelectorValue) {
                datetimeVars[2] = this.daySelectorValue;
            } else if (entryField === 'DAY') {
                datetimeVars[2] = fieldDef.id;
            }

            if (this.hourSelectorValue !== null) {
                datetimeVars[3] = this.hourSelectorValue;
            } else if (entryField === 'HOUR') {
                datetimeVars[3] = fieldDef.id;
            }

            newObs.datetime = this.getObsDatetime(datetimeVars);

            newObservations.push(this.getDBObsIfItExists(newObs));

        }

        return newObservations;
    }


    /** Gets the observations that will be used by the value flag controls in a grid layout */
    public getEntryObsForGridLayout(): CreateObservationModel[][] {

        if (this.formMetadata.fields.length < 2 || !this.formMetadata.fields[1]) {
            return []; // TODO, throw a dev error.
        }

        const newObservations: CreateObservationModel[][] = [];
        const rowEntryField: FieldType = this.formMetadata.fields[0];
        const colEntryField: FieldType = this.formMetadata.fields[1];

        const rowEntryfieldDefs: FieldEntryDefinition[] = this.getEntryFieldDefs(rowEntryField);
        const colEntryfieldDefs: FieldEntryDefinition[] = this.getEntryFieldDefs(colEntryField);

        for (const rowFieldDef of rowEntryfieldDefs) {

            // Array to hold the observations in a row
            const subArrEntryObservations: CreateObservationModel[] = [];

            for (const colFieldDef of colEntryfieldDefs) {

                const newObs: CreateObservationModel = this.createEmptyObservation();
                newObs.stationId = this.station.id;
                newObs.sourceId = this.sourceId;
                newObs.elevation = this.station.elevation;

                // Set element
                if (this.elementSelectorValue) {
                    newObs.elementId = this.elementSelectorValue;
                } else if (rowEntryField === 'ELEMENT') {
                    newObs.elementId = rowFieldDef.id;
                } else if (colEntryField === 'ELEMENT') {
                    newObs.elementId = colFieldDef.id;
                }

                // Set date time of observation
                // Year, month, day, hour
                let datetimeVars: [number, number, number, number] = [this.yearSelectorValue, this.monthSelectorValue, -1, -1];

                if (this.daySelectorValue) {
                    datetimeVars[2] = this.daySelectorValue;
                } else if (rowEntryField === 'DAY') {
                    datetimeVars[2] = rowFieldDef.id;
                } else if (colEntryField === 'DAY') {
                    datetimeVars[2] = colFieldDef.id;
                }

                if (this.hourSelectorValue !== null) {
                    datetimeVars[3] = this.hourSelectorValue;
                } else if (rowEntryField === 'HOUR') {
                    datetimeVars[3] = rowFieldDef.id;
                } else if (colEntryField === 'HOUR') {
                    datetimeVars[3] = colFieldDef.id;
                }

                newObs.datetime = this.getObsDatetime(datetimeVars);

                subArrEntryObservations.push(this.getDBObsIfItExists(newObs));
            }

            newObservations.push(subArrEntryObservations);

        }

        return newObservations;
    }



    private createEmptyObservation(): CreateObservationModel {
        return {
            stationId: '',
            sourceId: 0,
            elementId: 0,
            elevation: 0, 
            datetime: '',
            value: null,
            flag: null,
            period: this.formMetadata.period,
            comment: null,
        };
    }


    /** Returns a date time string in an iso format.
     * Date time UTC conversion is determing by the form metadata
     */
    private getObsDatetime(datetimeVars: [number, number, number, number]): string {
        if (this.formMetadata.convertDateTimeToUTC) {
            return new Date(datetimeVars[0], datetimeVars[1] - 1, datetimeVars[2], datetimeVars[3], 0, 0).toISOString();
        } else {
            return `${datetimeVars[0]}-${StringUtils.addLeadingZero(datetimeVars[1])}-${StringUtils.addLeadingZero(datetimeVars[2])}T${datetimeVars[3]}:00:000Z`;

        }
    }

    /** Returns observation that is in the database if it exists, else the passed new observation */
    private  getDBObsIfItExists(newObs: CreateObservationModel): CreateObservationModel {
        for (const dbObservation of this.dbObservations) {
          // Look for the observation element id and date time.
          if (
            newObs.stationId === dbObservation.stationId &&
            newObs.elementId === dbObservation.elementId &&
            newObs.sourceId === dbObservation.sourceId &&
            newObs.elevation === dbObservation.elevation &&
            newObs.datetime === dbObservation.datetime &&
            newObs.period === dbObservation.period) {
            return dbObservation;
          }
        }
    
        return newObs;
    
      }




}