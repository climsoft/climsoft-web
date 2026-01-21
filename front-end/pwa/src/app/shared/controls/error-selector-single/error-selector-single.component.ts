import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

interface ErrorOption {
  id: boolean;
  name: string;
}

@Component({
  selector: 'app-error-selector-single',
  templateUrl: './error-selector-single.component.html',
  styleUrls: ['./error-selector-single.component.scss']
})
export class ErrorSelectorSingleComponent implements OnChanges {
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public selectedId!: boolean | null;
  @Output() public selectedIdChange = new EventEmitter<boolean | null>();

  protected options!: ErrorOption[];
  protected selectedOption!: ErrorOption | null;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {

    this.options = [
      { id: true, name: 'With Errors' },
      { id: false, name: 'No Errors' },
    ];

    // Only react to changes if selectedId actually changes and is not the first change
    if (this.selectedId !== undefined || this.selectedId !== null) {
      const found = this.options.find(item => item.id === this.selectedId);
      if (found && found !== this.selectedOption) {
        this.selectedOption = found;
      }
    }

  }

  protected optionDisplayFunction(option: ErrorOption): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedOption: ErrorOption | null) {
    this.selectedId = selectedOption ? selectedOption.id : null;
    this.selectedIdChange.emit(this.selectedId);
  }

}
