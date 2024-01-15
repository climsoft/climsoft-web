import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-selector-single-input',
  templateUrl: './selector-single-input.component.html',
  styleUrls: ['./selector-single-input.component.scss']
})
export class SelectorSingleInputComponent<T> implements OnChanges {
  @Input() label: string = '';
  @Input() errorMessage: string = '';
  @Input() options: T[] = [];
  @Input() optionDisplayFn: (option: T) => string = (option => String(option));
  @Input() selectedOption!: T | null;
  @Output() selectedOptionChange = new EventEmitter<T | null>();

  protected filteredValues!: T[];

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.filteredValues = this.options;
  
    //console.log('single input ngOnChanges', changes)
  }

  protected get selectedOptionDisplay(): string {
    return this.selectedOption? this.optionDisplayFn(this.selectedOption) : '' ;
  }

  protected onInputChange(inputValue: string): void {
    if (!inputValue) {
      this.filteredValues = this.options;
      this.selectedOption = null;
    } else {
      this.filteredValues = this.options.filter(option =>
        this.optionDisplayFn(option).toLowerCase().includes(inputValue.toLowerCase())
      );
    }
  }

  protected onSelectedOption(option: T): void {
 
    this.selectedOption = option;

    //console.log('single input onSelectedOption',  this.selectedOption)
    this.selectedOptionChange.emit(option);
    this.filteredValues = this.options;
  }

}
