import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-selector-multiple-input',
  templateUrl: './selector-multiple-input.component.html',
  styleUrls: ['./selector-multiple-input.component.scss']
})
export class SelectorMultipleInputComponent<T> implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public placeholder!: string;
  @Input() public errorMessage!: string;
  @Input() public options: T[] = [];
  @Input() public selectedOptions: T[] = [];
  @Input() public optionDisplayFn: (option: T) => string = (option => String(option));
  @Output() public selectedOptionsChange = new EventEmitter<T[]>();
  @Input() public displayAdvancedSearchOption: boolean = false;
  @Output() public displayAdvancedSearchOptionClick = new EventEmitter<void>();

  protected filteredOptions: T[] = [...this.options];
  protected displaySelectedOptions: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    // Important check because when an option is selected ngOnChanges gets raised. 
    // So to prevent resetting filtered options this check is necessary
    if (changes['options']) {
      if (!this.options) this.options = []; // should never be undefined       
      this.filteredOptions = [...this.options];
    }

    if (changes['selectedOptions']) {
      if (!this.selectedOptions) {
        this.selectedOptions = []; // should never be undefined
      }
      this.setDisplaySelectedOptions();
    }
  }

  /**
   * Formats the selected options for display
   */
  private setDisplaySelectedOptions(): void {
    if (this.selectedOptions.length === 0) {
      this.displaySelectedOptions = '';
    } else {
      const display = this.selectedOptions
        .map(option => this.optionDisplayFn(option))
        .join(', ');
      this.displaySelectedOptions = `[${this.selectedOptions.length}] ${display}`;
    }
  }

  protected isSelectedOption(option: T): boolean {
    return this.selectedOptions.includes(option)
  }

  /**
   * Sets the filtered options based on the searched value
   * @param searchValue 
   */
  protected onSearchInput(searchValue: string): void {
    // If empty value then just reset the filtered options with all the possible options.
    if (!searchValue) {
      this.filteredOptions = [...this.options];
    } else {
      this.filteredOptions = this.options.filter(option =>
        this.optionDisplayFn(option).toLowerCase().includes(searchValue.toLowerCase())
      );
    }
  }

  protected onSelectedOption(selectedOption: T): void {
    const index: number = this.selectedOptions.indexOf(selectedOption);
    if (index === -1) {
      this.selectedOptions.push(selectedOption);
    } else {
      this.selectedOptions.splice(index, 1);
    }
    this.selectedOptionsChange.emit(this.selectedOptions);
    this.setDisplaySelectedOptions();
  }

  protected onCancelOptionClick(): void {
    this.selectedOptions.length = 0;
    this.selectedOptionsChange.emit(this.selectedOptions);
    this.setDisplaySelectedOptions();
  }

  protected onAdvancedSearchClick(): void {
    this.displayAdvancedSearchOptionClick.emit();
  }

  /**
   * Move selected options to the top
   */
  protected onDisplayDropDownClick(): void {
    // Move the selected options to the top

    // Remove each value from the array if it exists
    for (let i = this.selectedOptions.length - 1; i >= 0; i--) {
      const index = this.filteredOptions.indexOf(this.selectedOptions[i]);
      if (index > -1) {
        this.filteredOptions.splice(index, 1);             // Remove from current position
        this.filteredOptions.unshift(this.selectedOptions[i]);           // Insert at the top
      }
    }
  }

}
