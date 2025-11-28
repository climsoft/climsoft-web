import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { TextInputComponent } from '../../text-input/text-input.component';

@Component({
  selector: 'app-selector-multiple-input',
  templateUrl: './selector-multiple-input.component.html',
  styleUrls: ['./selector-multiple-input.component.scss']
})
export class SelectorMultipleInputComponent<T> implements OnChanges {
  @ViewChild('appMultipleSelectorSearchInput') searchInput!: TextInputComponent;
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
      this.setDisplayOfSelectedOptions();
    }
  }

  /**
   * Formats the selected options for display
   */
  private setDisplayOfSelectedOptions(): void {
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
      const trimmedSearchValue = searchValue.trim().toLowerCase();
      this.filteredOptions = this.options.filter(option =>
        this.optionDisplayFn(option).toLowerCase().includes(trimmedSearchValue)
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
    this.setDisplayOfSelectedOptions();
  }

  protected onSearchEnterKeyPress(): void {
    // Just select the first
    this.onSelectedOption(this.filteredOptions[0]);
  }

  protected onCancelOptionClick(): void {
    this.selectedOptions.length = 0;
    this.selectedOptionsChange.emit(this.selectedOptions);
    this.setDisplayOfSelectedOptions();
  }

  protected onAdvancedSearchClick(): void {
    this.displayAdvancedSearchOptionClick.emit();
  }

  /**
   * Move selected options to the top
   */
  protected onDropDownDisplayed(): void {
    //----------------------------------------------------------------
    // Sort filtered options to have the selected options as first items in the filtered options array
    //----------------------------------------------------------------
    // Create a map for quick lookups of the desired order.
    if (this.selectedOptions.length > 0) {
      const orderMap = new Map(this.selectedOptions.map((value, index) => [value, index]));
      this.filteredOptions = [...this.options].sort((a, b) => {
        const aInSelected = orderMap.has(a);
        const bInSelected = orderMap.has(b);

        // If both are in selectedIds, sort by their order in selectedIds
        if (aInSelected && bInSelected) {
          return orderMap.get(a)! - orderMap.get(b)!;
        }
        if (aInSelected) return -1; // a comes first
        if (bInSelected) return 1;  // b comes first 
        return 0; // Keep original order for unselected items
      });
    }
    //----------------------------------------------------------------

    // Set the focus to the search input
    // Set timeout used to give Angular change detection time to render the above the reorder elements
    setTimeout(() => {
      this.searchInput.focus();
    }, 0);
  }

}
