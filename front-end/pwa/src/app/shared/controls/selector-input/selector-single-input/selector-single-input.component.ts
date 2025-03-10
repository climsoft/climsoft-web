import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-selector-single-input',
  templateUrl: './selector-single-input.component.html',
  styleUrls: ['./selector-single-input.component.scss']
})
export class SelectorSingleInputComponent<T> implements OnChanges {
  @Input()
  public id!: string | number;

  @Input()
  public label!: string;

  @Input()
  public placeholder!: string;

  @Input()
  public displayCancelOption!: boolean;

  @Input()
  public errorMessage: string = '';

  @Input()
  public options: T[] = [];

  @Input()
  public optionDisplayFn: (option: T) => string = (option => String(option));

  @Input()
  public selectedOption!: T | null;

  @Output()
  public selectedOptionChange = new EventEmitter<T | null>();

  protected filteredOptions: T[] = this.options;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Important check because when an option is selected  'ngOnChanges' gets raised. So to prevent restetting filtered options this check is necessary
    if (changes['options']) {
      this.filteredOptions = this.options;
    }
  }

  protected get selectedOptionDisplay(): string {
    return this.selectedOption ? this.optionDisplayFn(this.selectedOption) : '';
  }

  protected isSelectedOption(option: T): boolean {
    return this.selectedOption !== null && this.selectedOption === option;
  }

  protected onSearchInput(inputValue: string): void {
    if (!inputValue) {
      this.filteredOptions = this.options;
    } else {
      this.filteredOptions = this.options.filter(option =>
        this.optionDisplayFn(option).toLowerCase().includes(inputValue.toLowerCase())
      );
    }
  }

  protected onSelectedOption(option: T): void {
    this.selectedOption = option;
    this.selectedOptionChange.emit(option);
    this.filteredOptions = this.options;
  }

  protected onCancelOptionClick(): void {
    this.selectedOption = null;
    this.selectedOptionChange.emit(null);
  }

}
