import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-selector-multiple-input',
  templateUrl: './selector-multiple-input.component.html',
  styleUrls: ['./selector-multiple-input.component.scss']
})
export class SelectorMultipleInputComponent<T> implements OnChanges {
  @Input() public label: string = '';
  @Input() public placeholder!: string;
  @Input() public errorMessage: string = '';
  @Input() public options: T[] = [];
  @Input() public selectedOptions: T[] = [];
  @Input() public optionDisplayFn: (option: T) => string = (option => String(option));
  @Output() public selectedOptionsChange = new EventEmitter<T[]>();

  protected filteredValues: T[] = this.options;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.selectedOptions) {
      return;
    }
    this.filteredValues = this.options;
  }

  //gets the value to display in the input text box
  protected get selectedOptionsDisplay(): string {
    if (!this.selectedOptions || this.selectedOptions.length === 0) {
      return '';
    }

    //console.log('multiple input selectedOptionsDisplay',this.selectedOptions)


    let display: string = '';
    for (let i = 0; i < this.selectedOptions.length; i++) {
      // console.log('option',this.selectedOptions[i])
      if (display) {
        display = display + ', ' + this.optionDisplayFn(this.selectedOptions[i]);
      } else {
        display = this.optionDisplayFn(this.selectedOptions[i]);
      }

      if (i === this.selectedOptions.length - 1) {
        display = `[${i + 1}] ` + display;
      }

    }

    return display
  }

  protected onInputChange(inputValue: string): void {
    // if (!inputValue) {
    //   this.filteredValues = this.options;
    //   this.selectedOptions = [];
    // } else {
    //   // this.filteredValues = this.options.filter(option =>
    //   //   this.optionDisplayFn(option).toLowerCase().includes(inputValue.toLowerCase())
    //   // );
    // }
  }

  protected onSelectedValue(selectedOption: T): void {
    const index: number = this.selectedOptions.indexOf(selectedOption);
    if (index === -1) {
      this.selectedOptions.push(selectedOption);
    } else {
      this.selectedOptions.splice(index, 1);
    }

    this.selectedOptionsChange.emit(this.selectedOptions);
  }

  protected isSelectedOption(option: T): boolean {
    return this.selectedOptions && this.selectedOptions.includes(option)
  }

}
