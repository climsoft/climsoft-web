import { Component, Input, EventEmitter, Output, SimpleChanges, OnChanges } from '@angular/core';
import { StringUtils } from '../../utils/string.utils';

@Component({
  selector: 'app-year-month-input',
  templateUrl: './year-month-input.component.html',
  styleUrls: ['./year-month-input.component.scss']
})
export class YearMonthInputComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public disabled: boolean = false;
  @Input() public hintMessage!: string;
  @Input() public showNavigationButtons!: boolean;
  @Input() public errorMessage!: string | null;
  @Input() public value!: string;
  @Output() public valueChange = new EventEmitter<string | null>();
  @Output() public inputClick = new EventEmitter<string | null>();
  @Output() public inputEnterKeyPress = new EventEmitter<string | null>();
  @Output() public inputBlur = new EventEmitter<string | null>();

  protected maxDate: string;
  protected disableNextButton: boolean = false;

  constructor() {
    this.maxDate = new Date().toISOString().slice(0, 7);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.value) {
      this.setNextButtonDisabledState();
    }
  }

  protected onValueChange(value: string): void {
    // Prevent emission of invalid dates
    this.valueChange.emit(value ? value : null);
  }

  protected onInputClick(): void {
    this.inputClick.emit(this.value ? this.value : null);
  }
  protected onEnterKeyPressed() {
    this.inputEnterKeyPress.emit(this.value ? this.value : null);
  }

  protected onInputBlur(): void {
    this.inputBlur.emit(this.value ? this.value : null);
  }

  protected onPrevious(): void {
    const splitValue = this.getYearMonth();
    let newYear: number = splitValue.year;
    let newMonth: number = splitValue.month;

    newMonth = newMonth - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear = newYear - 1;
    }

    this.value = `${newYear}-${StringUtils.addLeadingZero(newMonth)}`;
    this.valueChange.emit(this.value);
    this.setNextButtonDisabledState();
  }

  protected onNext(): void {
    const splitValue = this.getYearMonth();
    let newYear: number = splitValue.year;
    let newMonth: number = splitValue.month;

    newMonth = newMonth + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear = newYear + 1;
    }

    const todayDate = new Date();

    if (newYear > todayDate.getFullYear()) {
      return;
    }

    if (newYear === todayDate.getFullYear() && newMonth > todayDate.getMonth() + 1) {
      return;
    }

    this.value = `${newYear}-${StringUtils.addLeadingZero(newMonth)}`;
    this.valueChange.emit(this.value);
    this.setNextButtonDisabledState();
  }


  /**
   * Returned month is 1 based
   * @returns 
   */
  private getYearMonth(): { year: number, month: number } {
    let year: number;
    let month: number;

    if (this.value) {
      // Split the string to year and month using hyphen
      const splitValue: string[] = this.value.split('-');
      year = +splitValue[0];
      month = +splitValue[1];
    } else {
      const date = new Date();
      year = date.getFullYear();
      month = date.getMonth() + 1;
    }
    return { year: year, month: month };
  };

  private setNextButtonDisabledState(): void {
    const splitValue = this.getYearMonth();
    const todayDate = new Date();
    this.disableNextButton = (splitValue.year === todayDate.getFullYear() && splitValue.month === todayDate.getMonth() + 1);
  }


}
