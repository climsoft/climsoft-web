import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-selector',
  templateUrl: './selector.component.html',
  styleUrls: ['./selector.component.scss']
})
export class SelectorComponent<T> implements OnChanges {
  @Input() label: string = '';
  @Input() options: T[] = [];
  @Input() optionDisplayFn: (option: T) => string = (option => String(option));
  @Input() selectedOption!: T;
  @Output() selectedOptionChange = new EventEmitter<T>();

  protected filteredValues!: T[];

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {

    if ('values' in changes) {
      this.filteredValues = this.options;
    }

  }

  protected get selectedOptionDisplay(): string {
    return this.selectedOption ? this.optionDisplayFn(this.selectedOption) : '';
  }

  protected onInputChange(inputValue: string): void {
    if (!inputValue) {
      this.filteredValues = this.options;
    } else {
      this.filteredValues = this.options.filter(option =>
        this.optionDisplayFn(option).toLowerCase().includes(inputValue.toLowerCase())
      );
    }
  }

  protected onSelectedValue(selectedValue: T): void {
    this.selectedOption = selectedValue;
    this.selectedOptionChange.emit(selectedValue);
    this.filteredValues = this.options;
  }
}
