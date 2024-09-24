import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FlagEnum } from 'src/app/core/models/observations/flag.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-flag-single-input',
  templateUrl: './flag-single-input.component.html',
  styleUrls: ['./flag-single-input.component.scss']
})
export class FlagSingleInputComponent implements OnChanges {
  @Input() public label: string = '';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: FlagEnum[];
  @Input() public selectedId!: FlagEnum | null;
  @Output() public selectedIdChange = new EventEmitter<FlagEnum | null>();

  protected options!: FlagEnum[];
  protected selectedOption!: FlagEnum | null;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(FlagEnum);;
    }

    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.options = this.options.filter(
        data => this.includeOnlyIds.includes(data));
    }

    // Only react to changes if selectedId actually changes and is not the first change
    if (this.selectedId) {
      const found = this.options.find(period => period === this.selectedId);
      if (found && found !== this.selectedOption) {
        //console.log('setting found: ', found)
        this.selectedOption = found;
      }

    }

  }

  protected optionDisplayFunction(option: FlagEnum): string {
    return StringUtils.capitalizeFirstLetter(option);
  }

  protected onSelectedOptionChange(selectedOption: FlagEnum | null) {
    this.selectedIdChange.emit(selectedOption === null ? null : selectedOption);
  }
}
