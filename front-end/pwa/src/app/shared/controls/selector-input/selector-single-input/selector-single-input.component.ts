import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { TextInputComponent } from '../../text-input/text-input.component';

@Component({
  selector: 'app-selector-single-input',
  templateUrl: './selector-single-input.component.html',
  styleUrls: ['./selector-single-input.component.scss']
})
export class SelectorSingleInputComponent<T> implements OnChanges {
  @ViewChild('appSingleSelectorSearchInput') searchInput!: TextInputComponent;

  @Input() public id!: string | number;

  @Input() public label!: string;

   @Input() public labelSuperScript!: string;

  @Input() public placeholder!: string;

  @Input() public displayCancelOption!: boolean;

  @Input() public errorMessage: string = '';

  @Input() public options: T[] = [];

  @Input() public optionDisplayFn: (option: T) => string = (option => String(option));

  @Input() public selectedOption!: T | null | undefined;

  @Output() public selectedOptionChange = new EventEmitter<T | null>();

  /**
   * Whether the option list is currently built. It gates the whole list in the
   * template, and it exists for a performance reason rather than a cosmetic
   * one.
   *
   * The list is projected into `app-text-input` through `<ng-content>`, and
   * `app-drop-down-container` wraps that slot in an `*ngIf`. That `*ngIf` does
   * NOT keep the options from being built: Angular creates projected content in
   * the view that DECLARES it — this template — and projection only moves the
   * already-created nodes into the slot. So an unopened drop down was still
   * building one element per option, and a screen holding many selectors paid
   * for all of them at once. With 3,350 stations cached, a connector form with
   * fifty station bindings built ~168,000 buttons before the user touched
   * anything, which is what froze `ConnectorSpecificationInputDialogComponent`.
   *
   * Gating on a flag owned by THIS component is what actually defers the work,
   * because the `*ngIf` is then in the declaring view where the nodes are made.
   */
  protected dropDownOpen: boolean = false;
  protected filteredOptions: T[] = [];
  protected selectedOptionDisplay: string = '';

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Important check because when an option is selected  'ngOnChanges' gets raised. 
    // So to prevent resetting filtered options this check is necessary
    if (changes['options']) {
      if (!this.options) this.options = []; // should never be undefined
      // Copied only while the user is looking at the list. `options` is often a
      // cache-wide array shared by every selector on the page, so copying it
      // per instance on every change is itself proportional to selectors x
      // options.
      if (this.dropDownOpen) {
        this.filteredOptions = [...this.options];
      }
    }

    if (changes['selectedOption']) {
      // TODO. Investigate how this can be avoided when `selectedOption` is changed within this control
      this.setSelectedOptionDisplay();
    }
  }

  private setSelectedOptionDisplay(): void {
    this.selectedOptionDisplay = this.selectedOption !== undefined && this.selectedOption !== null ? this.optionDisplayFn(this.selectedOption) : '';
  }

  protected onSearchInput(inputValue: string): void {
    if (!inputValue) {
      this.filteredOptions = [...this.options];
    } else {
      this.filteredOptions = this.options.filter(option =>
        this.optionDisplayFn(option).toLowerCase().includes(inputValue.toLowerCase())
      );
    }
  }

  protected onSelectedOption(option: T): void {
    this.selectedOption = option;
    this.selectedOptionChange.emit(option);
    this.setSelectedOptionDisplay();
  }

  protected onSearchEnterKeyPress(): void {
    // Just select the first
    this.onSelectedOption(this.filteredOptions[0]);
  }

  protected onCancelOptionClick(): void {
    this.selectedOption = null;
    this.selectedOptionChange.emit(null);
    this.setSelectedOptionDisplay();
  }

  /**
   * Build the list, then move the selected option to the top.
   */
  protected onDropDownDisplayed(): void {
    this.dropDownOpen = true;
    this.filteredOptions = [...this.options];

    if (this.selectedOption) {
      this.filteredOptions.sort((a, b) => {
        if (a === this.selectedOption) return -1; // a comes first
        if (b === this.selectedOption) return 1;  // b comes first
        return 0; // Keep original order for other items
      });
    }

    // Set the focus to the search input
    // Set timeout used to give Angular change detection time to render the above the reorder elements
    setTimeout(() => {
      // Optional chained because the search input only exists while the list is
      // built, and a close can race in ahead of this timeout.
      this.searchInput?.focus();
    }, 0);
  }

  /** Release the built list when the drop down closes. */
  protected onDropDownClosed(): void {
    this.dropDownOpen = false;
    this.filteredOptions = [];
  }

}
