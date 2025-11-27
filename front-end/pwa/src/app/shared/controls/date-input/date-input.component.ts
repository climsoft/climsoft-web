import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { StringUtils } from '../../utils/string.utils';

@Component({
  selector: 'app-date-input',
  templateUrl: './date-input.component.html',
  styleUrls: ['./date-input.component.scss']
})
export class DateInputComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public disabled!: boolean;
  @Input() public hintMessage!: string;
  @Input() public showNavigationButtons!: boolean;
  @Input() public errorMessage!: string;
  @Input() public maxDate!: string;
  @Input() public minDate!: string;
  @Input() public value!: string | null;
  @Output() public valueChange = new EventEmitter<string>();
  @Output() public inputClick = new EventEmitter<string>();
  @Output() public inputEnterKeyPress = new EventEmitter<string>();
  @Output() public inputBlur = new EventEmitter<string>();

  protected disableNextButton: boolean = false;

  constructor() {
     // Always set maximum date to prevent future dates selections by default   
    this.maxDate = this.getDateString(new Date());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.value) {
      this.setNextButtonDisabledState();
    }

    //if (changes['maxDate'] && !this.maxDate) {
      // Always set maximum date to prevent future dates selections by default   
      //this.maxDate = this.getDateString(new Date());
    //}
  }

  protected onValueChange(value: string) {
    this.value = value;
    this.valueChange.emit(value);
  }

  protected onInputClick(): void {
    this.inputClick.emit(this.value ? this.value : '');
  }

  protected onEnterKeyPressed() {
    this.inputEnterKeyPress.emit(this.value ? this.value : '');
  }

  protected onInputBlur() {
    this.inputBlur.emit(this.value ? this.value : '');
  }

  protected onPrevious(): void {
    const newCalculatedDate: Date = this.value ? new Date(this.value) : new Date();
    newCalculatedDate.setDate(newCalculatedDate.getDate() - 1);

    this.value = this.getDateString(newCalculatedDate);
    this.valueChange.emit(this.value);
    this.setNextButtonDisabledState();
  }

  protected onNext(): void {
    //const todayDate = new Date();
    const newCalculatedDate: Date = this.value ? new Date(this.value) : new Date();
    newCalculatedDate.setDate(newCalculatedDate.getDate() + 1);

    // TODO. 
    // Disabled on 13/05/2025 due to how forms try to maipulate dates on the forms. 
    // Especially with utc 0 or not 0
    // if (newCalculatedDate > todayDate) { 
    //   return;
    // }

    this.value = this.getDateString(newCalculatedDate);
    this.valueChange.emit(this.value);
    this.setNextButtonDisabledState();
  }

  private setNextButtonDisabledState(): void {
    const strTodayDate = this.getDateString(new Date())
    this.disableNextButton = (!this.value || strTodayDate === this.value);
  }

  private getDateString(date: Date): string {
    // Note, don't use toISO here because the user sees the date in the local timezone
    return `${date.getFullYear()}-${StringUtils.addLeadingZero(date.getMonth() + 1)}-${StringUtils.addLeadingZero(date.getDate())}`;
  }

}
