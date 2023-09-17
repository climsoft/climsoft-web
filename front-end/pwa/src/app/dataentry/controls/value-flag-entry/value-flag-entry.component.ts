import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Observation } from 'src/app/core/models/observation.model';
import { DataSelectorsValues } from '../../form-entry/form-entry.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { EntryForm } from 'src/app/core/models/entryform.model';
import { ElementsService } from 'src/app/core/services/elements.service';
import { Element } from 'src/app/core/models/element.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';


export interface ControlDefinition {
  id: number;
  label: string;
  entryData?: Observation;
  displayedValueFlag: string,
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

  private elements!: Element[];

  constructor(private elementsService: ElementsService) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //only proceed with seting up the control if all inputs have been set.
    if (!this.dataSelectors || !this.formMetadata || !this.observations) {
      return;
    }

    this.loadElementsAndSetupControl();

  }

  private loadElementsAndSetupControl() {

    //determine which fields to sue for loading the elements used in this control
    const elementsToSearch: number[] = [];
    if (this.dataSelectors.elementId > 0) {
      elementsToSearch.push(this.dataSelectors.elementId);
    } else if (this.formMetadata.entryFields[0] === "elementId") {
      elementsToSearch.push(...this.formMetadata.elements);
    } else {
      //todo. display error in set value flag set up
      return;
    }

    //note, its not expected that all elements in the database will be set as entry fields. 
    //that should be regarded as an error in form builder design.
    //so always assume that elements selected are provided
    //fetch the elements
    this.elementsService.getElements(elementsToSearch).subscribe(data => {
      //set the elements
      this.elements = data;
      //set up the controls
      this.setupControl();
    });

  }

  private setupControl() {
    //get control definitions
    if (this.formMetadata.entryFields[0] === "elementId") {
      //create controls definitions the selected elements only
      this.entryControlsDefs = this.getNewControlDefs(this.elements, "id", "name"); 
    } else if (this.formMetadata.entryFields[0] === "day") {
      //create controls definitions days of the month only
      //note, there is no days selection in the form builder
      this.entryControlsDefs = this.getNewControlDefs(DateUtils.getDaysInMonthList(this.dataSelectors.year, this.dataSelectors.month), "id", "name");
    } else if (this.formMetadata.entryFields[0] === "hour") {
      //create control definitions hours
      //note there is always hours selection in the form builder
      this.entryControlsDefs = this.getNewControlDefs(this.formMetadata.hours.length > 0 ? DateUtils.getHours(this.formMetadata.hours) : DateUtils.getHours(), "id", "name");
    } else {
      //Not supported
      //todo. display error in set up
      this.entryControlsDefs = [];
    }

    //set control definitions entry data from the loaded data
    this.setControlDefinitionsEntryData(this.entryControlsDefs, this.observations, this.formMetadata.entryFields[0]);
  }


  //gets an array of control definitions from the passed array
  private getNewControlDefs(entryFieldItems: any[], valueProperty: string, displayProperty: string): ControlDefinition[] {
    let controlDefs: ControlDefinition[] = [];
    for (const item of entryFieldItems) {
      controlDefs.push({ id: item[valueProperty], label: item[displayProperty], entryData: undefined, displayedValueFlag: '', errorMessage: '' })
    }
    return controlDefs; 
  }

  private setControlDefinitionsEntryData(entryControlsDefs: ControlDefinition[], observations: Observation[], observationProperty: string): void {
    //set control definitions entry data from the loaded data
    for (const controlDef of entryControlsDefs) {
      //get the entry data to be used by the control definition if it exists
      const entryData = ArrayUtils.findDataItem(observations, controlDef.id, observationProperty);
      controlDef.entryData = entryData;
      console.log('entry data found',      controlDef.entryData  )
      //if observation data exists then set displayed value flag
      if (controlDef.entryData) {
        controlDef.displayedValueFlag = this.getDisplayableValueFlag(controlDef.entryData.value, controlDef.entryData.flag);
      }
    }
  }


  onInputEntry(controlDef: ControlDefinition, valueFlagInput: string): void {

    let validationResults: [boolean, string];
    let observationData: Observation;
    let bNewObservationEntry: boolean = false;
    const extractedValueFlag: [number | null, string | null] = [null, null];

    //clear any existing error message
    controlDef.errorMessage = ''

    //validate and extract the value and flag
    validationResults = this.validateValueFlagInput(valueFlagInput)

    //check validation results
    if (!validationResults[0]) {
      controlDef.errorMessage = validationResults[1]; //set returned error message 
      return;
    }


    //extract and set the value and flag
    const extractedNumberString = StringUtils.splitNumbersAndTrailingNonNumericCharactersOnly(valueFlagInput);
    extractedValueFlag[0] = extractedNumberString[0];
    extractedValueFlag[1] = extractedNumberString[1];


    //if there was no existing data then create new entry data and push it to the entry data arrays 
    console.log('checking entry data is new ', controlDef.entryData);
    if (controlDef.entryData) {
      observationData=  controlDef.entryData ;     
    }else{
      observationData = this.getNewEntryData(controlDef);
      bNewObservationEntry = true;
    }

    //if value input then do QC
    if (extractedValueFlag[0] !== null) {
      validationResults = this.validateAndNotifyQC(observationData.elementId, extractedValueFlag[0]);
      if (!validationResults[0]) {
        controlDef.errorMessage = validationResults[1]; //set returned error message 
        return;
      }
    }

    //if flag input then validate
    if (extractedValueFlag[1] !== null) {
      extractedValueFlag[1] = extractedValueFlag[1].toUpperCase();

      //todo. validate the flag
    }

    //set the value and flag then add it to array of observations if its a new entry
    observationData.value = extractedValueFlag[0];
    observationData.flag = extractedValueFlag[1];
    controlDef.entryData = observationData;
    controlDef.displayedValueFlag = this.getDisplayableValueFlag(observationData.value, observationData.flag);
    console.log('data is new ', bNewObservationEntry);
    if (bNewObservationEntry) {
      this.observations.push(observationData);
      console.log('new data', controlDef.entryData);
    }

    

  }

  private getNewEntryData(controlDef: ControlDefinition): Observation {
    //create new entr data
    const entryData: Observation = { stationId: '0', sourceId: 0, elementId: 0, level: 'surface', datetime: '', value: null, flag: null, qcStatus: 0, period: 0 };

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
    entryData.datetime = DateUtils.getDateInSQLFormat(datetimeVars[0], datetimeVars[1],datetimeVars[2],datetimeVars[3],0,0) ;

    //console.log('entry data', entryData);
    return entryData;
  }

  //returns validation status and error message
  private validateValueFlagInput(valueFlagInput: string,): [boolean, string] {

    if (StringUtils.isNullOrEmpty(valueFlagInput, false)) {
      return [true, ''];
    }

    //check for white spaces.
    if (StringUtils.isNullOrEmpty(valueFlagInput, true)) {
      return [false, 'Empty spaces not allowed'];
    }

    //check for correct input format
    if (!StringUtils.containsNumbersAndTrailingNonNumericCharactersOnly(valueFlagInput)) {
      return [false, 'Incorrect input format not allowed'];
    }

    return [true, ''];

  }

  private validateAndNotifyQC(elementId: number, value: number): [boolean, string] {
    const element = this.elements.find(data => data.id === elementId);

    if (!element) {
      return [false, 'Element NOT found'];
    }

    //transform the value to actual scale to validate the limits
    value = value * element.entryScaleFactor;

    //console.log('transformed value: ', value, ' scale', element.entryScaleFactor);

    if (value < element.lowerLimit) {
      return [false, `Value less than lower limit ${element.lowerLimit === 0 ? 0 : element.lowerLimit / element.entryScaleFactor}`]
    }

    if (value > element.upperLimit) {
      return [false, `Value higher than upper limit ${element.upperLimit === 0 ? 0 : element.upperLimit / element.entryScaleFactor}`];
    }

    return [true, ''];

  }

  private getDisplayableValueFlag(value: number | null, flag: string | null): string {
    let str = '';
    if (value !== null) {
      str = value + '';
    }

    if (flag !== null) {
      str = str + flag;
    }

    return str;

  }



}
