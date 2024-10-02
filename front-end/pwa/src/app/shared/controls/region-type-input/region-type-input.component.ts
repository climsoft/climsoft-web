import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ServerTypeEnum } from 'src/app/core/models/sources/create-import-source.model';
import { StringUtils } from '../../utils/string.utils';
import { RegionTypeEnum } from 'src/app/core/models/Regions/region-types.enum';

@Component({
  selector: 'app-region-type-input',
  templateUrl: './region-type-input.component.html',
  styleUrls: ['./region-type-input.component.scss']
})
export class RegionTypeInputComponent implements OnChanges {
  @Input() public label: string = 'Region Type';
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: RegionTypeEnum[];
  @Input() public selectedId!: RegionTypeEnum | null;
  @Output() public selectedIdChange = new EventEmitter<RegionTypeEnum | null>();

  protected options!: RegionTypeEnum[];
  protected selectedOption!: RegionTypeEnum | null;

  constructor() { }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(RegionTypeEnum);
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

  protected optionDisplayFunction(option: RegionTypeEnum): string {
    return StringUtils.formatEnumForDisplay (option);
  }

  protected onSelectedOptionChange(selectedOption: RegionTypeEnum | null) {
    this.selectedOption = selectedOption;
    this.selectedIdChange.emit(selectedOption ? selectedOption : null);
  }
}
