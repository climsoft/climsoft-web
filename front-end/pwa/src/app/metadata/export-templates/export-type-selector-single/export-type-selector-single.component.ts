import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { ExportTypeEnum } from '../models/export-type.enum';

@Component({
  selector: 'app-export-type-selector-single',
  templateUrl: './export-type-selector-single.component.html',
  styleUrls: ['./export-type-selector-single.component.scss']
})
export class ExportTypeSelectorSingleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: ExportTypeEnum[];
  @Input() public selectedId!: ExportTypeEnum | undefined;
  @Output() public selectedIdChange = new EventEmitter<ExportTypeEnum>();

  protected options!: ExportTypeEnum[];
  protected selectedOption!: ExportTypeEnum | null;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(ExportTypeEnum);;
    }

    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.options = this.options.filter(
        data => this.includeOnlyIds.includes(data));
    }

    // Only react to changes if selectedId actually changes and is not the first change
    if (this.selectedId) {
      const found = this.options.find(item => item === this.selectedId);
      if (found && found !== this.selectedOption) {
        //console.log('setting found: ', found)
        this.selectedOption = found;
      }

    }

  }

  protected optionDisplayFunction(option: ExportTypeEnum): string {
    return StringUtils.capitalizeFirstLetter(option);
  }

  protected onSelectedOptionChange(selectedOption: ExportTypeEnum | null) {
    if(selectedOption)  this.selectedIdChange.emit(selectedOption );
  }
}
