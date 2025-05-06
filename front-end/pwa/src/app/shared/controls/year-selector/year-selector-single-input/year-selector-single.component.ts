import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnInit } from '@angular/core';
import { getLast200Years, YearModel } from '../year-utils';


// TODO. Make this control to be editable
@Component({
  selector: 'app-year-selector-single',
  templateUrl: './year-selector-single.component.html',
  styleUrls: ['./year-selector-single.component.scss']
})
export class YearSelectorSingleComponent implements OnChanges {
  @Input() public id: string = '';
  @Input() public label: string = '';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null| undefined;
  @Output() public selectedIdChange = new EventEmitter<number>();

  protected options!: YearModel[];
  protected selectedOption!: YearModel | null;

  constructor() { 
    this.options = getLast200Years();;
  }

  ngOnChanges(changes: SimpleChanges): void {

    //load options once
    if (changes['includeOnlyIds'] && this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.options = getLast200Years().filter(data => this.includeOnlyIds.includes(data.id));
    }

    // Only react to changes if selectedId actually changes and is not the first change
    if (changes['selectedId'] && this.selectedId) {
      const found = this.options.find(item => item.id === this.selectedId);
      if (found && found !== this.selectedOption) { 
        this.selectedOption = found;
      }
    }

  }

  protected optionDisplayFunction(option: YearModel): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedOption: YearModel | null) {
    //console.log('period selection',' this.selectedOption: ', this.selectedOption, ' selectedOption', selectedOption);
    if (selectedOption) {
      this.selectedId = selectedOption.id;
      this.selectedIdChange.emit(selectedOption.id);
    }

  }
}
