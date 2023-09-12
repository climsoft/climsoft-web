import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Observation } from 'src/app/core/models/observation.model';
import { DataSelectorsValues } from '../../form-entry/form-entry.component';
import { RepoService } from 'src/app/shared/services/repo.service';
import { DateUtils } from 'src/app/shared/utils/date-utils';
import { ArrayUtils } from 'src/app/shared/utils/array-utils';
import { EntryForm } from 'src/app/core/models/entryform.model';


export interface ControlDefinition {
  id: number;
  label: string;
  entryData?: Observation;
  errorMessage: string;
}

// This component expects form metadata and an empty or filled array of entry data items
// If the array is filled with some entry data then it will use them to set
// the default values of the value flag controls.
// For entry data missing, new 'empty data' will be created and added to the array.
@Component({
  selector: 'app-value-flag-entry',
  templateUrl: './value-flag-entry.component.html',
  styleUrls: ['./value-flag-entry.component.scss']
})
export class ValueFlagEntryComponent implements OnInit, OnChanges {

  @Input() observations!: Observation[];
  @Input() dataSelectors!: DataSelectorsValues;
  @Input() formMetadata!: EntryForm;

  //entry controls definitions
  entryControlsDefs: ControlDefinition[] = [];

  constructor(private repo: RepoService) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //get control definitions
    if (this.formMetadata.entryFields[0] === "elementId") {
      //create controls definitions the selected elements only
      //note, its not expected that all elements in the database will be set as entry fields. 
      //That should be regarded as an error in form builder design.
      //So always assume that elements selected are provided
      this.entryControlsDefs = this.getNewControlDefs(this.repo.getElements(this.formMetadata.elements), "id", "name")
    } else if (this.formMetadata.entryFields[0] === "day") {
      //create controls definitions days of the month only
      //note, there is no days selection in the form builder
      this.entryControlsDefs = this.getNewControlDefs(DateUtils.getDaysInMonthList(this.dataSelectors.year, this.dataSelectors.month), "id", "name")
    } else if (this.formMetadata.entryFields[0] === "hour") {
      //create control definitions hours
      //note there is always hours selection in the form builder
      this.entryControlsDefs = this.getNewControlDefs(this.formMetadata.hours.length > 0 ? DateUtils.getHours(this.formMetadata.hours) : DateUtils.getHours(), "id", "name")
    } else {
      //Not supported yet
      this.entryControlsDefs = [];
    }

    //set control definitions entry data from the loaded data
    this.setControlDefinitionsEntryData(this.entryControlsDefs, this.observations, this.formMetadata.entryFields[0]);

  }


  //gets an array of control definitions from the passed array
  private getNewControlDefs(entryFieldItems: any[], valueProperty: string, displayProperty: string): ControlDefinition[] {
    let controlDefs: ControlDefinition[] = [];
    for (const item of entryFieldItems) {
      controlDefs.push({ id: item[valueProperty], label: item[displayProperty], entryData: undefined, errorMessage: '' })
    }
    return controlDefs;
  }

  private setControlDefinitionsEntryData(entryControlsDefs: ControlDefinition[], entryDataItems: Observation[], entryDataField: string): void {
    //set control definitions entry data from the loaded data
    for (const controlDef of entryControlsDefs) {
      //get the entry data to be used by the control definition if it exists
      const entryData = ArrayUtils.findDataItem(entryDataItems, controlDef.id, entryDataField);
      //if entry data exists then set it as the value flag of the control definition elese set value flag as empty
      if (entryData) {
        controlDef.entryData = entryData;
      }
    }
  }


  onInputEntry(controlDef: ControlDefinition, controlNewValueFlag: string): void {

    //clear any existing error message
    controlDef.errorMessage = '';

    //check for white spaces. By default they are always not allowed
    if (controlNewValueFlag.length > 0 && controlNewValueFlag.trim().length === 0) {
      controlDef.errorMessage = 'Empty spaces not allowed';
      return;
    }

    //extract the value from the flag and nullify any empty flag entry
    const numberPatternRegExp: RegExp = /[+-]?\d+(\.\d+)?/; // Regular expression to match numbers with optional decimal points
    const matches: RegExpMatchArray | null = controlNewValueFlag.match(numberPatternRegExp);
    let extractedNumber: number | null = matches ? Number(matches[0]) : null;
    let extractedString: string | null = controlNewValueFlag.replace(numberPatternRegExp, "").trim();
    extractedString = extractedString !== null && extractedString.length === 0 ? null : extractedString

    //if number input then validate
    if (extractedNumber !== null) {
      //todo. validate the number
    }

    //if flag input then validate
    if (extractedString !== null) {
      //todo. validate the flag
    }


    //if there was no existing data then create new entry data and push it to the entry data arrays 
    if (!controlDef.entryData) {
      //push the new data to the array
      controlDef.entryData = this.getNewEntryData(controlDef);
      this.observations.push(controlDef.entryData);
    }

    //set the value and flag
    controlDef.entryData.value = extractedNumber;
    controlDef.entryData.flag = extractedString;

    //console.log('new data', controlDef);

  }

  private getNewEntryData(controlDef: ControlDefinition): Observation {
    //create new entr data
    const entryData: Observation = { stationId: '0', sourceId: 0, elementId: 0, level: 'surface', datetime: new Date(), value: null, flag: '', qcStatus: 0, period: 0 };

    //set data source
    entryData.sourceId = this.dataSelectors.sourceId;
    entryData.stationId = this.dataSelectors.stationId;

    //set entry selector value
    if (this.dataSelectors.elementId > 0) {
      entryData.elementId = this.dataSelectors.elementId;
    }

    let datetimeVars: [number, number, number, number] = [-1, -1, -1, -1];

    datetimeVars[0] = this.dataSelectors.year;
    datetimeVars[1] = this.dataSelectors.month;

    if (this.dataSelectors.day > 0) {
      datetimeVars[2] = this.dataSelectors.day;
    }

    if (this.dataSelectors.hour > -1) {
      datetimeVars[3] = this.dataSelectors.hour;
    }


    //set entry field
    if (this.formMetadata.entryFields[0] === "elementId") {
      entryData.elementId = controlDef.id;
    } else if (this.formMetadata.entryFields[0] === "day") {
      datetimeVars[2] = controlDef.id;
    } else if (this.formMetadata.entryFields[0] === "hour") {
      datetimeVars[3] = controlDef.id;
    } else {
      //Not supported yet
    }

    //set date from date time variables. year-month-day hour. JS months are 0 based
    entryData.datetime = new Date(datetimeVars[0], datetimeVars[1] - 1, datetimeVars[2], datetimeVars[3], 0, 0, 0);

    console.log('entry data', entryData);
    return entryData;
  }



}
