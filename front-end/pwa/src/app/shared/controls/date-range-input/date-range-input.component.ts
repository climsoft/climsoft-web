import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

export interface DateRange {
  fromDate: string;
  toDate: string;
}

@Component({
  selector: 'app-date-range-input',
  templateUrl: './date-range-input.component.html',
  styleUrls: ['./date-range-input.component.scss']
})
export class DateRangeInputComponent {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public disabled!: boolean;
  @Input() public hintMessage!: string;
  @Input() public showNavigationButtons!: boolean;
  @Input() public errorMessage!: string;
  @Input() public maxDate!: string;
  @Input() public minDate!: string;
  @Input() public value!: DateRange;
  @Output() public valueChange = new EventEmitter<DateRange>();
  @Output() public inputClick = new EventEmitter<DateRange>();
  @Output() public inputEnterKeyPress = new EventEmitter<DateRange>();
  @Output() public inputBlur = new EventEmitter<DateRange>();

  constructor() {
  }

  protected onFromDateChange(value: string | null) {
    if (!value) {
      value = '';
    }

    this.value.fromDate = value;
    this.valueChange.emit(this.value);
  }

  protected onToDateChange(value: string | null) {
    if (!value) {
      value = '';
    }

    this.value.toDate = value;
    this.valueChange.emit(this.value);
  }

  protected onInputClick(): void {
    this.inputClick.emit(this.value);
  }

  protected onEnterKeyPressed() {
    this.inputEnterKeyPress.emit(this.value);
  }

  protected onInputBlur() {
    this.inputBlur.emit(this.value);
  }

}
