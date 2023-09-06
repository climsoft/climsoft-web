import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

@Component({
  selector: 'app-date-input',
  templateUrl: './date-input.component.html',
  styleUrls: ['./date-input.component.scss']
})
export class DateInputComponent implements OnInit, OnChanges {

  @Input() controlLabel: string = "Date";
  //format expected is ISO 8601 date format (yyyy-MM-dd) 
  @Input() value!: string;
  @Output() valueChange = new EventEmitter<string>();
  maxDate: string = "";

  constructor() {
    this.maxDate = new Date().toISOString().slice(0, 10);
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  onInputEntry(selectedDate: string) {
    this.valueChange.emit(selectedDate);
  }

}
