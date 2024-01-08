import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

@Component({
  selector: 'app-date-input',
  templateUrl: './date-input.component.html',
  styleUrls: ['./date-input.component.scss']
})
export class DateInputComponent implements OnInit, OnChanges {

  @Input() public label: string = '';
  @Input() public disabled: boolean = false;
  @Input() public hintMessage!: string;
  @Input() public errorMessage!: string | null;
  @Input() public value!: string;
  @Output() public valueChange = new EventEmitter<string >();
  @Output() public inputClick = new EventEmitter<string >();
  @Output() public inputEnterKeyPress = new EventEmitter<string>();
  @Output() public inputBlur = new EventEmitter<string >();
  maxDate: string = "";

  constructor() {
    this.maxDate = new Date().toISOString().slice(0, 10);
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
   
  }
  protected onValueChange(value: string) {
    this.valueChange.emit(value);
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
