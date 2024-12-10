import { FieldType } from "src/app/metadata/sources/models/create-entry-form.model";
import { ViewEntryFormModel } from "src/app/metadata/sources/models/view-entry-form.model";
import { DateUtils } from "src/app/shared/utils/date.utils";
import { FieldEntryDefinition } from "./field.definition";
import { CreateObservationModel } from "src/app/core/models/observations/create-observation.model";
import { ViewStationModel } from "src/app/core/models/stations/view-station.model";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { ObservationDefinition } from "./observation.definition";
import { CreateObservationQueryModel } from "src/app/core/models/observations/create-observation-query.model";
import { ViewSourceModel } from "src/app/metadata/sources/models/view-source.model";
import { UpdateQCTestModel } from "src/app/core/models/elements/qc-tests/update-qc-test.model";
import { RangeThresholdQCTestParamsModel } from "src/app/core/models/elements/qc-tests/qc-test-parameters/range-qc-test-params.model";
import { StationCacheModel } from "src/app/metadata/stations/services/stations-cache.service";

/**
 * Holds the definitions that define how the form will be rendered and functions used by the components used for data entry operations
 */
export class FormEntryDefinition {
    public station: StationCacheModel;
    public source: ViewSourceModel;
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

    private _allObsDefs: ObservationDefinition[] = [];
    private _obsDefsForLinearLayout: ObservationDefinition[] = [];
    private _obsDefsForGridLayout: ObservationDefinition[][] = [];


    private rangeThresholdQCTests: UpdateQCTestModel[];

    constructor(station: StationCacheModel, source: ViewSourceModel, formMetadata: ViewEntryFormModel, rangeThresholdQCTests: UpdateQCTestModel[]) {
        this.station = station;
        this.source = source;
        this.formMetadata = formMetadata;
        this.rangeThresholdQCTests = rangeThresholdQCTests;

        // Set the selectors values based on defined selectors in the form metadata
        this.elementSelectorValue = formMetadata.selectors.includes('ELEMENT') ? formMetadata.elementIds[0] : null;
        const todayDate: Date = new Date();
        this.yearSelectorValue = todayDate.getFullYear();
        this.monthSelectorValue = todayDate.getMonth() + 1;
        this.daySelectorValue = formMetadata.selectors.includes('DAY') ? todayDate.getDate() : null;
        this.hourSelectorValue = formMetadata.selectors.includes('HOUR') ? formMetadata.hours[0] : null;
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

    public createEntryObsDefs(dbObservations: CreateObservationModel[]): void {
        switch (this.formMetadata.layout) {
            case "LINEAR":
                this._obsDefsForLinearLayout = this.getEntryObsForLinearLayout(dbObservations);
                this._allObsDefs = [...this._obsDefsForLinearLayout];
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
    private getEntryObsForLinearLayout(dbObservations: CreateObservationModel[]): ObservationDefinition[] {
        const obsDefinitions: ObservationDefinition[] = [];
        const entryField: FieldType = this.formMetadata.fields[0];
        const entryfieldDefs: FieldEntryDefinition[] = this.getEntryFieldDefs(entryField)

        for (const fieldDef of entryfieldDefs) {
            let newObs: CreateObservationModel = this.createEmptyObservation();
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

            newObs.datetime = this.getObsDatetimeInUTC(datetimeVars);

            //Find the equivalent observation from the database. 
            //If it exists use it to create the observation definition
            const dbObs: CreateObservationModel | null = this.findEquivalentDBObservation(newObs, dbObservations);
            obsDefinitions.push(this.createNewObsDefinition(dbObs ? dbObs : newObs));
        }

        return obsDefinitions;
    }

    /**
     * Used by grid layout.
     * @returns observations that will be used by the value flag controls in a grid layout.
     */
    private getEntryObsForGridLayout(dbObservations: CreateObservationModel[]): ObservationDefinition[][] {

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
                const newObs: CreateObservationModel = this.createEmptyObservation();
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

                newObs.datetime = this.getObsDatetimeInUTC(datetimeVars);

                //Find the equivalent observation from the database. 
                //If it exists use it to create the observation definition
                const dbObs: CreateObservationModel | null = this.findEquivalentDBObservation(newObs, dbObservations);
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
                //create field definitions for the selected elements only
                entryFieldDefs = this.formMetadata.elementsMetadata.map(item => ({ id: item.id, name: item.abbreviation }));
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

    private createEmptyObservation(): CreateObservationModel {
        return {
            stationId: this.station.id,
            sourceId: this.source.id,
            elementId: 0,
            elevation: 0,
            datetime: '',
            value: null,
            flag: null,
            period: this.formMetadata.period,
            comment: null,
        };
    }

    /**
     * Creates a new observation definition from the observation model and the element metadata
     * @param observation 
     * @returns 
     */
    private createNewObsDefinition(observation: CreateObservationModel): ObservationDefinition {
        const elementMetadata = this.formMetadata.elementsMetadata.find(item => (item.id === observation.elementId));
        if (!elementMetadata) {
            //TODO. Through developer error.
            throw new Error('Developer error: Element metadata NOT found');
        }

        let rangeThresholdParams: RangeThresholdQCTestParamsModel | undefined = undefined;
        rangeThresholdParams = this.rangeThresholdQCTests.find(item => (item.elementId === elementMetadata.id))?.parameters as RangeThresholdQCTestParamsModel

        return new ObservationDefinition(observation, elementMetadata, this.source.allowMissingValue, true, rangeThresholdParams);
    }

    private findEquivalentDBObservation(newObs: CreateObservationModel, dbObservations: CreateObservationModel[]): CreateObservationModel | null {
        for (const dbObservation of dbObservations) {
            // Look for the observation element id and date time.
            if (
                newObs.stationId === dbObservation.stationId &&
                newObs.elementId === dbObservation.elementId &&
                newObs.sourceId === dbObservation.sourceId &&
                newObs.elevation === dbObservation.elevation &&
                newObs.datetime === dbObservation.datetime //&& newObs.period === dbObservation.period
            ) {
                return dbObservation;
            }
        }
        return null;
    }


    /**
     * Creates the observation query object for getting existing observations from the database.
     * @param formDefinitions form defintions to use in creating the observation query dto.
     * @returns 
     */
    public createObservationQuery(): CreateObservationQueryModel {
        //get the data based on the selection filter
        const observationQuery: CreateObservationQueryModel = {
            stationId: this.station.id,
            sourceId: this.source.id,
            elevation: 0,
            elementIds: this.elementSelectorValue == null ? this.formMetadata.elementIds : [this.elementSelectorValue],
            datetimes: []
        };

        const year: number = this.yearSelectorValue;
        const month: number = this.monthSelectorValue;
        const hours: number[] = this.hourSelectorValue === null ? this.formMetadata.hours : [this.hourSelectorValue];

        // If day value is defined then just define a single data time else define all date times for the entire month
        if (this.daySelectorValue) {
            observationQuery.datetimes.push(...this.getObsDatetimesInUTC(year, month, this.daySelectorValue, hours));
        } else {
            const lastDay: number = DateUtils.getLastDayOfMonth(year, month - 1);
            for (let i = 1; i <= lastDay; i++) {
                observationQuery.datetimes.push(...this.getObsDatetimesInUTC(year, month, i, hours));
            }
        }

        return observationQuery;
    }

    private getObsDatetimesInUTC(year: number, month: number, day: number, hours: number[]): string[] {
        return hours.map(hour => { return this.getObsDatetimeInUTC([year, month, day, hour]) });
    }

    /**
   * Date time UTC conversion is determined by the form metadata utc setting
   * @param datetimeVars year, month (1 based index), day, hour
   * @returns a date time string in an iso format.
   */
    private getObsDatetimeInUTC(datetimeVars: [number, number, number, number]): string {
        let [year, month, day, hour] = datetimeVars;
        hour = hour + this.source.utcOffset;
        const pad = (num: number): string => StringUtils.addLeadingZero(num);
        return `${year}-${StringUtils.addLeadingZero(month)}-${StringUtils.addLeadingZero(day)}T${StringUtils.addLeadingZero(hour)}:00:00.000Z`;
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