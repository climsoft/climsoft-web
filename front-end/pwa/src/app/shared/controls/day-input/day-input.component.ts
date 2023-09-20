import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { DateUtils } from '../../utils/date.utils';

@Component({
  selector: 'app-day-input',
  templateUrl: './day-input.component.html',
  styleUrls: ['./day-input.component.scss']
})
export class DayInputComponent implements OnInit, OnChanges {
  @Input() year!: number;
  //a 1 based month id
  @Input() month!: number;
  @Input() value!: any;
  @Input() filter!: number[];
  @Output() valueChange = new EventEmitter<any>();
  days!: any[];

  constructor() {
    
  }

  ngOnInit(): void {
  }


  ngOnChanges(changes: SimpleChanges): void {
    if(this.year && this.month){
      this.days = DateUtils.getDaysInMonthList( this.year,this.month-1);
    }   
  }

  onChange(change: any) {
    this.valueChange.emit(change);
  }

}
