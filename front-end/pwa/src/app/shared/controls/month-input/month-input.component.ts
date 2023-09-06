import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

@Component({
  selector: 'app-month-input',
  templateUrl: './month-input.component.html',
  styleUrls: ['./month-input.component.scss']
})
export class MonthInputComponent  implements OnInit, OnChanges {
  @Input() value!: any;
  @Input() filter!: number[];
  @Output() valueChange = new EventEmitter<any>();
  months: any[];

  constructor() {
    this.months = this.getAllMonths();
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
   
  }

  private getAllMonths(): any[] {
    const all: any[] = [];
    for (let i = 1; i <= 12; i++) {
      all.push({ id: i, name: `Month ${i.toString().padStart(2, '0')}` });
    }
    return all;
  }


  onChange(change: any) {
    this.valueChange.emit(change);
  }

}
