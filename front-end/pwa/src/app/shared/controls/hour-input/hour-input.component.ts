import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { DateUtils } from '../../utils/date.utils';

@Component({
  selector: 'app-hour-input',
  templateUrl: './hour-input.component.html',
  styleUrls: ['./hour-input.component.scss']
})
export class HourInputComponent implements OnInit, OnChanges {

  @Input() controlLabel: string = 'Hour';
  @Input() multiple: boolean = false;
  @Input() value!: any;
  @Output() valueChange = new EventEmitter<any>();
  @Input() onlyIncludeIds!: number[];

  hours!: { [key: string]: any }[];


  constructor() {
  }

  ngOnInit(): void {
    //if no hours to display passed, then just display all the hours
    if (!this.hours || this.hours.length === 0) {
      this.hours = DateUtils.getHours();
    }
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (this.onlyIncludeIds && this.onlyIncludeIds.length > 0) {
      this.hours = DateUtils.getHours(this.onlyIncludeIds);
    }
  }

  onChange(change: any) {
    this.valueChange.emit(change);
  }

}
