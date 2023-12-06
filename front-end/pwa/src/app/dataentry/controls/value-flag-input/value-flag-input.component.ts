import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { FlagModel } from 'src/app/core/models/Flag.model';
import { ElementModel } from 'src/app/core/models/element.model';
import { ObservationLog } from 'src/app/core/models/observation-log.model';
import { ObservationModel } from 'src/app/core/models/observation.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';


@Component({
  selector: 'app-value-flag-input',
  templateUrl: './value-flag-input.component.html',
  styleUrls: ['./value-flag-input.component.scss']
})
export class ValueFlagInputComponent implements OnInit, OnChanges {

  @ViewChild('inputRef') protected inputElement!: ElementRef<HTMLInputElement>;
  @Input() public id: string | number = '';
  @Input() public label: string = '';
  @Input() public smallSize: boolean = false;
  @Input() public elements!: ElementModel[];
  @Input() public flags!: FlagModel[];
  @Input() public observation!: ObservationModel;
  @Output() public valueChange = new EventEmitter<ObservationModel>();
  @Output() public validationChange = new EventEmitter<'VALID' | 'INVALID'>();
  @Output() public enterPressed = new EventEmitter<void>();

  protected displayedValueFlag!: string;
  protected userChange: boolean = false;
  protected errorMessage!: string;

  constructor() {

  }
  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {

    //only proceed with seting up the control if all inputs have been set.
    if (!this.elements || !this.flags || !this.observation) {
      return;
    }

    //scale the value for display
    let value: number | null = this.observation.value

    if (value !== null) {
      value = this.getScaledValue(this.observation.elementId, value);
    }

    this.displayedValueFlag = this.getValueFlagForDisplay(value, this.getFlagName(this.observation.flag));

  }

  public setFocus(): void {
    this.inputElement.nativeElement.focus();
  }

  protected onEnterPressed(): void {
    this.enterPressed.emit();

  }

  protected onInputEntry(valueFlagInput: string): void {

    let validationResults: [boolean, string];
    let observation: ObservationModel;

    //clear any existing error message
    this.errorMessage = ''

    //validate and extract the value and flag
    validationResults = this.validateValueFlagInput(valueFlagInput)

    //check validation results
    if (!validationResults[0]) {
      this.errorMessage = validationResults[1]; //set returned error message 
      this.validationChange.emit('INVALID');
      return;
    }

    //extract and set the value and flag
    const extractedNumberString = StringUtils.splitNumbersAndTrailingNonNumericCharactersOnly(valueFlagInput);
    const value: number | null = extractedNumberString[0];
    const flagName: string | null = extractedNumberString[1] === null ? null : extractedNumberString[1].toUpperCase();

    observation = this.observation;

    //if value input then do QC
    if (value !== null) {
      validationResults = this.validateAndQCValue(observation.elementId, value);
      if (!validationResults[0]) {
        this.errorMessage = validationResults[1]; //set returned error message
        this.validationChange.emit('INVALID');
        return;
      }
    }

    //if flag input then validate
    if (flagName !== null) {
      validationResults = this.validateAndQCFlag(value, flagName);
      if (!validationResults[0]) {
        this.errorMessage = validationResults[1]; //set returned error message 
        this.validationChange.emit('INVALID');
        return;
      }
    }

    //set the value and flag
    observation.value = value === null ? null : this.getUnScaledValue(observation.elementId, value);
    observation.flag = this.getFlagId(flagName);

    //attach the updated observation to the control definition
    this.observation = observation;

    //scale the value for display 
    this.displayedValueFlag = this.getValueFlagForDisplay(value, flagName);
    this.userChange = true;

    // Emit data change event
    this.valueChange.emit(this.observation);
    this.validationChange.emit('VALID');

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

    let scaleFactor: number = 1;

    if (element.entryScaleFactor) {
      scaleFactor = element.entryScaleFactor;
    }

    if (element.lowerLimit && value < element.lowerLimit) {
      return [false, `Value less than lower limit ${element.lowerLimit * scaleFactor}`]
    }

    if (element.upperLimit && value > element.upperLimit) {
      return [false, `Value higher than upper limit ${element.upperLimit * scaleFactor}`];
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
    return element && element.entryScaleFactor ? unscaledValue * element.entryScaleFactor : unscaledValue;
  }

  private getUnScaledValue(elementId: number, scaledValue: number): number {
    const element = this.elements.find(data => data.id === elementId);
    return element && element.entryScaleFactor && element.entryScaleFactor !== 0 ? scaledValue / element.entryScaleFactor : scaledValue;
  }

  private getFlagId(name: string | null): number | null {
    const flag = name !== null ? this.flags.find((flag) => flag.name === name) : null;
    return flag ? flag.id : null;
  }

  private getFlagName(id: number | null): string | null {
    const flag = id !== null ? this.flags.find((flag) => flag.id === id) : null;
    return flag ? flag.name : null;
  }

  protected onCommentEntry(comment: string) {
    this.observation.comment = comment;

    // todo. before emitting valid. check on the value validity
    this.validationChange.emit('VALID');
  }

  protected getLogs(observation: ObservationModel): ObservationLog[] {
    return observation.log === null ? [] : JSON.parse(observation.log);
  }

}
