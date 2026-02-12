import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { StringUtils } from '../../utils/string.utils';
import { DataStructureTypeEnum } from 'src/app/metadata/source-specifications/models/import-source.model';

@Component({
  selector: 'app-data-structure-input',
  templateUrl: './data-structure-input.component.html',
  styleUrls: ['./data-structure-input.component.scss']
})
export class DataStructureInputComponent implements OnChanges {
  @Input() public label: string = 'Server Type';
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: DataStructureTypeEnum[];
  @Input() public selectedId!: DataStructureTypeEnum | null;
  @Output() public selectedIdChange = new EventEmitter<DataStructureTypeEnum | null>();

  protected options!: DataStructureTypeEnum[];
  protected selectedOption!: DataStructureTypeEnum | null;

  constructor() { }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(DataStructureTypeEnum);
    }

    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.options = this.options.filter(
        data => this.includeOnlyIds.includes(data));
    }

    // Only react to changes if selectedId actually changes and is not the first change
    if (this.selectedId) {
      const found = this.options.find(period => period === this.selectedId);
      if (found && found !== this.selectedOption) {
        this.selectedOption = found;
      }
    }

  }

  protected optionDisplayFunction(option: DataStructureTypeEnum): string {
    return StringUtils.formatEnumForDisplay (option);
  }

  protected onSelectedOptionChange(selectedOption: DataStructureTypeEnum | null) {
    this.selectedOption = selectedOption;
    this.selectedIdChange.emit(selectedOption ? selectedOption : null);
  }
}
