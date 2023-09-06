import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

@Component({
  selector: 'app-year-input',
  templateUrl: './year-input.component.html',
  styleUrls: ['./year-input.component.scss']
})
export class YearInputComponent implements OnInit, OnChanges {
  @Input() value!: any;
  @Output() valueChange = new EventEmitter<any>();
  years: any[];


  constructor() {
    this.years = this.getAllYears();
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  private getAllYears(): any[] {
    const all: any[] = [];
    const currentYear: number = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 30; i--) {
      all.push({ id: i, name: `Year ${i}` });
    }
    return all;
  }
  
  onChange(change: any) {
    this.valueChange.emit(change);
  }

}
