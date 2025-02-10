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
  @Input() public errorMessage!: string | null;
  @Input() public value!: string | null;
  @Output() public valueChange = new EventEmitter<string | null>();
  @Output() public inputClick = new EventEmitter<string | null>();
  @Output() public inputEnterKeyPress = new EventEmitter<string | null>();
  @Output() public inputBlur = new EventEmitter<string | null>();

  protected maxDate: string;
  protected disableNextButton: boolean = false;

  constructor() {
    this.maxDate = new Date().toISOString().slice(0, 10);
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (this.value) {
      this.setNextButtonDisabledState();
    }
  }

  protected onValueChange(value: string) {
    if (value) {
      this.valueChange.emit(value);
    }
  }

  protected onInputClick(): void {
    if (this.value) {
      this.inputClick.emit(this.value);
    }
  }

  protected onEnterKeyPressed() {
    if (this.value) {
      this.inputEnterKeyPress.emit(this.value);
    }
  }

  protected onInputBlur() {
    if (this.value) {
      this.inputBlur.emit(this.value);
    }
  }

  protected onPrevious(): void {
    const newCalculatedDate: Date = this.value ? new Date(this.value) : new Date();
    newCalculatedDate.setDate(newCalculatedDate.getDate() - 1);

    this.value = newCalculatedDate.toISOString().slice(0, 10);
    console.log('next: ', this.value);
    this.valueChange.emit(this.value);
    this.setNextButtonDisabledState();
  }

  protected onNext(): void {
    const todayDate = new Date();
    const newCalculatedDate: Date = this.value ? new Date(this.value) : new Date();
    newCalculatedDate.setDate(newCalculatedDate.getDate() + 1);

    if (newCalculatedDate > todayDate) {
      return;
    }

    this.value = newCalculatedDate.toISOString().slice(0, 10);
    console.log('previous: ', this.value);
    this.valueChange.emit(this.value);
    this.setNextButtonDisabledState();
  }

  private setNextButtonDisabledState(): void {
    let todayDate = new Date();
    const strTodayDate = `${todayDate.getFullYear()}-${StringUtils.addLeadingZero(todayDate.getMonth() + 1)}-${StringUtils.addLeadingZero(todayDate.getDate())}`
    this.disableNextButton = (!this.value || strTodayDate === this.value);
  }

}
