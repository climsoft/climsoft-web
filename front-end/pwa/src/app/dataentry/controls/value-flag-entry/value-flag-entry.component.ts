import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { Observation } from 'src/app/core/models/observation.model';
import { DataSelectorsValues } from '../../form-entry/form-entry.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { EntryForm } from 'src/app/core/models/entryform.model';
import { ElementsService } from 'src/app/core/services/elements.service';
import { Element } from 'src/app/core/models/element.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { Flag } from 'src/app/core/models/Flag.model';
import { FlagsService } from 'src/app/core/services/flags.service';
import { ObservationLog } from 'src/app/core/models/observation-log.model';


export interface ControlDefinition {
  id: number;
  label: string;
  entryData?: Observation;
  entryStatus: 'new' | 'update';
  displayedValueFlag: string;
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
  @Output() valueChange = new EventEmitter<'valid_value' | 'invalid_value'>();

  //entry controls definitions
  entryControlsDefs: ControlDefinition[] = [];

  private elements!: Element[];
  private flags!: Flag[];

  constructor(private elementsService: ElementsService, private flagsService: FlagsService) {
    this.flagsService.getFlags().subscribe(data => {
      this.flags = data;
    });

  }

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
    const entryField = this.formMetadata.entryFields[0];

    switch (entryField) {
      case "elementId":
        //create controls definitions the selected elements only
        this.entryControlsDefs = this.getNewControlDefs(this.elements, "id", "abbreviation");
        break;
      case "day":
        //create controls definitions days of the month only
        //note, there is no days selection in the form builder
        this.entryControlsDefs = this.getNewControlDefs(DateUtils.getDaysInMonthList(this.dataSelectors.year, this.dataSelectors.month), "id", "name");
        break;
      case "hour":
        //create control definitions hours
        //note there is always hours selection in the form builder
        this.entryControlsDefs = this.getNewControlDefs(this.formMetadata.hours.length > 0 ? DateUtils.getHours(this.formMetadata.hours) : DateUtils.getHours(), "id", "name");
        break;
      default:
        //Not supported
        //todo. display error in set up
        this.entryControlsDefs = [];
        break;
    }

    //set control definitions entry data from the loaded data
    this.setControlDefinitionsEntryData(this.entryControlsDefs, this.observations, entryField);
  }


  //gets an array of control definitions from the passed array
  private getNewControlDefs(entryFieldItems: any[], valueProperty: string, displayProperty: string): ControlDefinition[] {
    let controlDefs: ControlDefinition[] = [];
    for (const item of entryFieldItems) {
      controlDefs.push({
        id: item[valueProperty],
        label: item[displayProperty],
        entryStatus: 'new',
        displayedValueFlag: '',
        errorMessage: ''
      })
    }
    return controlDefs;
  }

  private setControlDefinitionsEntryData(entryControlsDefs: ControlDefinition[], observations: Observation[], entryField: string): void {
    // Create a dictionary to store observations using the entry field value as the key for faster lookups
    const observationDict: { [key: number]: Observation } = {};

    for (const observation of observations) {
      let key: number | undefined;

      switch (entryField) {
        case "elementId":
          key = observation.elementId;
          break;
        case "day":
          key = DateUtils.getDayFromSQLDate(observation.datetime);
          break;
        case "hour":
          key = DateUtils.getHourFromSQLDate(observation.datetime);
          break;
        default:
          // Handle unsupported entryField or other cases
          break;
      }

      if (key !== undefined) {
        observationDict[key] = observation;
      }
    }

    //console.log('transformed observations', observationDict);

    // Set control definitions entry data and displayed value flag
    let flagName: string;
    for (const controlDef of entryControlsDefs) {
      //look for the observation using the control id (entry field value).
      const observation = observationDict[controlDef.id];
      if (observation) {
        controlDef.entryData = observation;

        //scale the value for display
        const value = observation.value === null ? null : this.getScaledValue(observation.elementId, observation.value);
        controlDef.displayedValueFlag = this.getValueFlagForDisplay(value, this.getFlagName(observation.flag));
      }
    }
  }




  onInputEntry(controlDef: ControlDefinition, valueFlagInput: string): void {

    let validationResults: [boolean, string];
    let observation: Observation;
    let observationNew: boolean=false;

    //clear any existing error message
    controlDef.errorMessage = ''

    //validate and extract the value and flag
    validationResults = this.validateValueFlagInput(valueFlagInput)

    //check validation results
    if (!validationResults[0]) {
      controlDef.errorMessage = validationResults[1]; //set returned error message 
      this.valueChange.emit('invalid_value');
      return;
    }


    //extract and set the value and flag
    const extractedNumberString = StringUtils.splitNumbersAndTrailingNonNumericCharactersOnly(valueFlagInput);
    const value: number | null = extractedNumberString[0];
    const flagName: string | null = extractedNumberString[1] === null ? null : extractedNumberString[1].toUpperCase();


    //if there was no existing data then create new entry data and push it to the entry data arrays 
    if (controlDef.entryData) {
      observation = controlDef.entryData;
    } else {
      observation = this.getNewEntryData(controlDef);
      observationNew = true;
    }

    //if value input then do QC
    if (value !== null) {
      validationResults = this.validateAndQCValue(observation.elementId, value);
      if (!validationResults[0]) {
        controlDef.errorMessage = validationResults[1]; //set returned error message
        this.valueChange.emit('invalid_value');
        return;
      }
    }

    //if flag input then validate
    if (flagName !== null) {
      validationResults = this.validateAndQCFlag(value, flagName);
      if (!validationResults[0]) {
        controlDef.errorMessage = validationResults[1]; //set returned error message 
        this.valueChange.emit('invalid_value');
        return;
      }
    }

    //set the value and flag
    observation.value = value === null ? null : this.getUnScaledValue(observation.elementId, value);
    observation.flag = this.getFlagId(flagName);
    
  

    //attach the updated observation to the control definition
    controlDef.entryData = observation;

    //scale the value for display
    controlDef.displayedValueFlag = this.getValueFlagForDisplay(value, flagName);

      //if observation is new then add it to observations array
      if (observationNew) {
        this.observations.push(observation);
      }

    console.log('data changes', controlDef.entryData);

    this.valueChange.emit('valid_value');

  }

  private getNewEntryData(controlDef: ControlDefinition): Observation {
    //create new entr data
    const entryData: Observation = { stationId: '0', sourceId: 0, elementId: 0, level: 'surface', datetime: '', value: null, flag: null, qcStatus: 0, period: 0, comment: null };

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

    //set datetime from date time variables. year-month-day hour. JS months are 0 based 
    entryData.datetime = DateUtils.getDateInSQLFormat(datetimeVars[0], datetimeVars[1], datetimeVars[2], datetimeVars[3], 0, 0);

    //console.log('entry data', entryData);
    return entryData;
  }

  //returns validation status and error message
  private validateValueFlagInput(valueFlagInput: string): [boolean, string] {

    if (StringUtils.isNullOrEmpty(valueFlagInput, false)) {
      return [true, ''];
    }

    //check for white spaces.
    if (StringUtils.isNullOrEmpty(valueFlagInput, true)) {
      return [false, 'Empty spaces not allowed'];
    }

    //check if its all string. Applies when its flag M entered
    if (StringUtils.doesNotContainNumericCharacters(valueFlagInput)) {
      return [true, ''];
    }

    //check for correct input format
    if (!StringUtils.containsNumbersAndTrailingNonNumericCharactersOnly(valueFlagInput)) {
      return [false, 'Incorrect input format not allowed'];
    }

    return [true, ''];

  }

  private validateAndQCValue(elementId: number, value: number): [boolean, string] {
    const element = this.elements.find(data => data.id === elementId);

    if (!element) {
      return [false, 'Element NOT found'];
    }

    //transform the value to actual scale to validate the limits
    value = this.getUnScaledValue(elementId, value);

    //console.log('transformed value: ', value, ' scale', element.entryScaleFactor);

    if (value < element.lowerLimit) {
      return [false, `Value less than lower limit ${element.lowerLimit * element.entryScaleFactor}`]
    }

    if (value > element.upperLimit) {
      return [false, `Value higher than upper limit ${element.upperLimit * element.entryScaleFactor}`];
    }

    return [true, ''];

  }

  private validateAndQCFlag(value: number | null, flagName: string): [boolean, string] {
    const flagFound = this.flags.find(flag => flag.name == flagName);

    if (!flagFound) {
      return [false, 'Invalid Flag'];
    }

    if (value !== null && flagFound.name === 'M') {
      return [false, 'Invalid Flag, M is used for missing value ONLY'];
    }

    return [true, ''];
  }

  private getValueFlagForDisplay(value: number | null, flag: string | null): string {
    if (value === null && flag === null) {
      return '';
    }

    const valueStr = value !== null ? value.toString() : '';
    const flagStr = flag !== null ? flag : '';

    return valueStr + flagStr;
  }

  private getScaledValue(elementId: number, unscaledValue: number): number {

    const element = this.elements.find(data => data.id === elementId);

    //return element ? parseFloat((unscaledValue * element.entryScaleFactor).toFixed(2)) : 0;
    return element ? unscaledValue * element.entryScaleFactor : 0;
  }

  private getUnScaledValue(elementId: number, scaledValue: number): number {
    const element = this.elements.find(data => data.id === elementId);
    return element && element.entryScaleFactor !== 0 ? scaledValue / element.entryScaleFactor : 0;
  }

  private getFlagId(name: string | null): number | null {
    const flag = name !== null ? this.flags.find((flag) => flag.name === name) : null;
    return flag ? flag.id : null;
  }

  private getFlagName(id: number | null): string | null {
    const flag = id !== null ? this.flags.find((flag) => flag.id === id) : null;
    return flag ? flag.name : null;
  }

  // private getNewLog(observation: Observation): string {

  //   let logs: ObservationLog[] = [];
  //   if (observation.log !== null) {
  //     logs = JSON.parse(observation.log);
  //   }

  //   logs.push({ ...observation, comment: 'first entry' });
  //   return JSON.stringify(logs);

  // }


}
