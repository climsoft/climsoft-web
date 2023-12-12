import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-selector',
  templateUrl: './selector.component.html',
  styleUrls: ['./selector.component.scss']
})
export class SelectorComponent<T extends Object> implements OnChanges {
  @Input() label: string = '';
  @Input() values: T[] = [];
  @Input() displayFn: (option: T) => string = (option => option.toString());
  @Input() selectedValue!: T;
  @Output() selectedValueChange = new EventEmitter<T>();

  protected filteredValues!: T[];

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {

    if ('values' in changes) {
      this.filteredValues = this.values;
    }

  }

  protected getDisplayValue(): string {
    return this.selectedValue ? this.displayFn(this.selectedValue) : '';
  }

  protected onInputChange(inputValue: string): void {
    if (!inputValue) {
      this.filteredValues = this.values;
    } else {
      this.filteredValues = this.values.filter(option =>
        this.displayFn(option).toLowerCase().includes(inputValue.toLowerCase())
      );
    }
  }

  protected onSelectedValue(selectedValue: T): void {
    this.selectedValue = selectedValue;
    this.selectedValueChange.emit(selectedValue);
    this.filteredValues = this.values;
  }
}
