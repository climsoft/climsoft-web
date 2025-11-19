import { CreateEntryFormModel, FieldType } from "src/app/metadata/source-templates/models/create-entry-form.model";
import { DateUtils } from "src/app/shared/utils/date.utils";
import { FieldEntryDefinition } from "./field.definition";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { ObservationDefinition } from "./observation.definition";
import { ViewSourceModel } from "src/app/metadata/source-templates/models/view-source.model";
import { StationCacheModel } from "src/app/metadata/stations/services/stations-cache.service";
import { EntryFormObservationQueryModel } from "../../models/entry-form-observation-query.model";
import { CachedMetadataService } from "src/app/metadata/metadata-updates/cached-metadata.service";
import { ViewObservationModel } from "../../models/view-observation.model";
import { QCStatusEnum } from "../../models/qc-status.enum";

/**
 * Holds the definitions that define how the form will be rendered and functions used by the components used for data entry operations
 */
export class FormEntryDefinition {
    public station: StationCacheModel;
    public source: ViewSourceModel;
    public formMetadata: CreateEntryFormModel;

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

    private _allObsDefs: ObservationDefinition[] = [];
    private _obsDefsForLinearLayout: ObservationDefinition[] = [];
    private _obsDefsForGridLayout: ObservationDefinition[][] = [];



    private cachedMetadataSearchService: CachedMetadataService;

    constructor(
        station: StationCacheModel,
        source: ViewSourceModel,
        newCachedMetadataSearchService: CachedMetadataService) {

        this.station = station;
        this.source = source;
        this.formMetadata = source.parameters as CreateEntryFormModel;
        this.cachedMetadataSearchService = newCachedMetadataSearchService;

        // Set the selectors values based on defined selectors in the form metadata
        this.elementSelectorValue = this.formMetadata.selectors.includes('ELEMENT') ? this.formMetadata.elementIds[0] : null;
        const todayDate: Date = new Date();
        this.yearSelectorValue = todayDate.getFullYear();
        this.monthSelectorValue = todayDate.getMonth() + 1;
        this.daySelectorValue = this.formMetadata.selectors.includes('DAY') ? todayDate.getDate() : null;

        // Set hour selector value
        // If one of selectors is hour, then set the current default hour to what what is equal or immediate greater hour
        this.hourSelectorValue = null;
        if (this.formMetadata.selectors.includes('HOUR')) {
            let currentHour: number = new Date().getHours();
            for (const allowedDataEntryHour of this.formMetadata.hours) {
                this.hourSelectorValue = allowedDataEntryHour;
                if (allowedDataEntryHour >= currentHour) {
                    break;
                }
            }
        }

    }

    public get allObsDefs(): ObservationDefinition[] {
        return this._allObsDefs;
    }

    public get obsDefsForLinearLayout(): ObservationDefinition[] {
        return this._obsDefsForLinearLayout;
    }

    public get obsDefsForGridLayout(): ObservationDefinition[][] {
        return this._obsDefsForGridLayout;
    }

    /**
    * Creates the observation query object for getting existing observations from the database.
    * @param formDefinitions form defintions to use in creating the observation query dto.
    * @returns 
    */
    public createObservationQuery(): EntryFormObservationQueryModel {
        //get the data based on the selection filter
        const observationQuery: EntryFormObservationQueryModel = {
            stationId: this.station.id,
            elementIds: this.elementSelectorValue === null ? this.formMetadata.elementIds : [this.elementSelectorValue],
            level: 0,
            interval: (this.source.parameters as CreateEntryFormModel).interval,
            sourceId: this.source.id,
            fromDate: '',
            toDate: '',
        };

        const year: number = this.yearSelectorValue;
        const month: number = this.monthSelectorValue;

        // If day value is defined then just define a single day range (24 hours) else define all date times for the entire month
        if (this.daySelectorValue) {
            observationQuery.fromDate = `${year}-${StringUtils.addLeadingZero(month)}-${StringUtils.addLeadingZero(this.daySelectorValue)}T00:00:00.00Z`;
            observationQuery.toDate = `${year}-${StringUtils.addLeadingZero(month)}-${StringUtils.addLeadingZero(this.daySelectorValue)}T23:00:00.00Z`;
        } else {
            const lastDay: number = DateUtils.getLastDayOfMonth(year, month - 1);
            observationQuery.fromDate = `${year}-${StringUtils.addLeadingZero(month)}-01T00:00:00.00Z`;
            observationQuery.toDate = `${year}-${StringUtils.addLeadingZero(month)}-${lastDay}T23:00:00.00Z`;
        }

        // Subtracts the offset to get UTC time if offset is plus and add the offset to get UTC time if offset is minus
        // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it
        observationQuery.fromDate = DateUtils.getDatetimesBasedOnUTCOffset(observationQuery.fromDate, this.source.utcOffset, 'subtract');
        observationQuery.toDate = DateUtils.getDatetimesBasedOnUTCOffset(observationQuery.toDate, this.source.utcOffset, 'subtract');

        //console.log('query: ', observationQuery)
        return observationQuery;
    }



    public createEntryObsDefs(dbObservations: ViewObservationModel[]): void {
        for (const dbObservation of dbObservations) {
            // Add because it needs to be displayed based on display utc offset
            dbObservation.datetime = DateUtils.getDatetimesBasedOnUTCOffset(dbObservation.datetime, this.source.utcOffset, 'add');
        }

        switch (this.formMetadata.layout) {
            case "LINEAR":
                this._obsDefsForLinearLayout = this.getEntryObsForLinearLayout(dbObservations);
                this._allObsDefs = this._obsDefsForLinearLayout;
                break;
            case "GRID":
                this._obsDefsForGridLayout = this.getEntryObsForGridLayout(dbObservations);
                this._allObsDefs = this._obsDefsForGridLayout.flat();
                break;
            default:
                throw new Error("Developer error. Layout not supported");
        }
    }



    /**
     * Used by linear layout.
     * @param dbObservations 
     * @returns the observations that will be used by the value flag controls in a linear layout
     */
    private getEntryObsForLinearLayout(dbObservations: ViewObservationModel[]): ObservationDefinition[] {
        const obsDefinitions: ObservationDefinition[] = [];
        const entryField: FieldType = this.formMetadata.fields[0];
        const entryfieldDefs: FieldEntryDefinition[] = this.getEntryFieldDefs(entryField)

        for (const fieldDef of entryfieldDefs) {
            let newObs: ViewObservationModel = this.createEmptyObservation();
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

            //Find the equivalent observation from the database. 
            //If it exists use it to create the observation definition
            const dbObs: ViewObservationModel | null = this.findEquivalentDBObservation(newObs, dbObservations);
            obsDefinitions.push(this.createNewObsDefinition(dbObs ? dbObs : newObs));
        }

        return obsDefinitions;
    }

    /**
     * Used by grid layout.
     * @returns observations that will be used by the value flag controls in a grid layout.
     */
    private getEntryObsForGridLayout(dbObservations: ViewObservationModel[]): ObservationDefinition[][] {

        if (this.formMetadata.fields.length < 2 || !this.formMetadata.fields[1]) {
            throw new Error("Developer error: number of entry fields not supported.");
        }

        const obsDefinitions: ObservationDefinition[][] = [];
        const rowEntryField: FieldType = this.formMetadata.fields[0];
        const colEntryField: FieldType = this.formMetadata.fields[1];

        const rowEntryfieldDefs: FieldEntryDefinition[] = this.getEntryFieldDefs(rowEntryField);
        const colEntryfieldDefs: FieldEntryDefinition[] = this.getEntryFieldDefs(colEntryField);

        for (const rowFieldDef of rowEntryfieldDefs) {

            // Array to hold the observations in a row
            const subArrEntryObservations: ObservationDefinition[] = [];

            for (const colFieldDef of colEntryfieldDefs) {
                const newObs: ViewObservationModel = this.createEmptyObservation();
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

                //Find the equivalent observation from the database. 
                //If it exists use it to create the observation definition
                const dbObs: ViewObservationModel | null = this.findEquivalentDBObservation(newObs, dbObservations);
                subArrEntryObservations.push(this.createNewObsDefinition(dbObs ? dbObs : newObs));
            }

            obsDefinitions.push(subArrEntryObservations);
        }

        return obsDefinitions;
    }

    /**
  * Used to determine the value flag controls needed for user input.
  * @param entryField 
  * @returns entry field definations used to create and label the value flag controls
  */
    public getEntryFieldDefs(entryField: FieldType): FieldEntryDefinition[] {
        let entryFieldDefs: FieldEntryDefinition[];
        switch (entryField) {
            case 'ELEMENT':
                entryFieldDefs = [];
                //create field definitions for the selected elements only
                for (const elementId of this.formMetadata.elementIds) {
                    const element = this.cachedMetadataSearchService.getElement(elementId);
                    if (element) {
                        entryFieldDefs.push({ id: element.id, name: element.abbreviation });
                    }
                }
                break;
            case 'DAY':
                //create field definitions for days of the selected month only
                //note, there is no days selection in the form builder
                entryFieldDefs = DateUtils.getDaysInMonthList(this.yearSelectorValue, this.monthSelectorValue - 1);
                break;
            case 'HOUR':
                //create field definitions for the selected hours only
                //note there is always hours selection in the form builder
                entryFieldDefs = DateUtils.getHours(this.formMetadata.hours);
                break;
            default:
                //Not supported
                //todo. display error in set up 
                throw new Error("Developer Error: Entry Field Not Recognised");
        }

        return entryFieldDefs;
    }

    private createEmptyObservation(): ViewObservationModel {
        return {
            stationId: this.station.id,
            sourceId: this.source.id,
            elementId: 0,
            level: 0,
            datetime: '',
            value: null,
            flag: null,
            interval: this.formMetadata.interval,
            comment: null,
            qcStatus: QCStatusEnum.NONE,
            qcTestLog: null,
            log: null,
            entryDatetime: '',
        };
    }

    /**
* Date time UTC conversion is determined by the form metadata utc setting
* @param datetimeVars year, month (1 based index), day, hour
* @returns a date time string in an iso format.
*/
    private getObsDatetime(datetimeVars: [number, number, number, number]): string {
        let [year, month, day, hour] = datetimeVars;
        return `${year}-${StringUtils.addLeadingZero(month)}-${StringUtils.addLeadingZero(day)}T${StringUtils.addLeadingZero(hour)}:00:00.000Z`;
    }

    /**
     * Creates a new observation definition from the observation model and the element metadata
     * @param observation 
     * @returns 
     */
    private createNewObsDefinition(observation: ViewObservationModel): ObservationDefinition {
        return new ObservationDefinition(this.cachedMetadataSearchService, observation, true);
    }

    private findEquivalentDBObservation(newObs: ViewObservationModel, dbObservations: ViewObservationModel[]): ViewObservationModel | null {
        for (const dbObservation of dbObservations) {
            // Look for the observation element id and date time.
            if (
                newObs.stationId === dbObservation.stationId &&
                newObs.elementId === dbObservation.elementId &&
                newObs.sourceId === dbObservation.sourceId &&
                newObs.level === dbObservation.level &&
                newObs.datetime === dbObservation.datetime
            ) {
                return dbObservation;
            }
        }
        return null;
    }

    public static getTotalValuesOfObs(obsDefs: ObservationDefinition[]): number | null {
        let total = 0;
        let allAreNull: boolean = true;

        for (const obsDef of obsDefs) {
            const unScaledValue = obsDef.getUnScaledValue(obsDef.observation.value)
            if (unScaledValue !== null) {
                total = total + unScaledValue;
                allAreNull = false;
            }
        }

        return allAreNull ? null : total;

    }

}