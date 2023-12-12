import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';


interface Period {
  id: number;
  name: string;
}

@Component({
  selector: 'app-period-selector',
  templateUrl: './period-selector.component.html',
  styleUrls: ['./period-selector.component.scss']
})
export class PeriodSelectorComponent implements OnInit, OnChanges {
  @Input() public controlLabel: string = 'Period';
  @Input() public selectedId!: number;
  @Output() public selectedIdChange = new EventEmitter<number>();

  protected periods: Period[] = [];
  protected selectedValue!: Period;

  constructor() {
    // todo, these should come from a shared source.
    this.periods.push({ id: 15, name: "15 minute" });
    this.periods.push({ id: 30, name: "30 minute" });
    this.periods.push({ id: 60, name: "1 hour" });
    this.periods.push({ id: 180, name: "3 hours" });
    this.periods.push({ id: 360, name: "6 hours" });
    this.periods.push({ id: 720, name: "12 hours" });
    this.periods.push({ id: 1440, name: "24 hours" });
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Only react to changes if selectedId actually changes and is not the first change
    if ('selectedId' in changes) {
      const foundPeriod = this.periods.find(period => period.id === this.selectedId);
      console.log('found', foundPeriod)
      if(foundPeriod){
        this.selectedValue = foundPeriod;
      }   
      
    }
  }

  displayFunction(option: Period): string {
    return option.name;
  }

  onSelectedValueChange(selectedValue: Period) {
    this.selectedId = selectedValue.id;
    this.selectedValue = selectedValue;
    this.selectedIdChange.emit(selectedValue.id);
  }


}
