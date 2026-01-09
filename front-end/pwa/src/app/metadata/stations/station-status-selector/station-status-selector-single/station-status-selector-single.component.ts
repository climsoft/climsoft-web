import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { StationStatusEnum } from 'src/app/metadata/stations/models/station-status.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-station-status-selector-single',
  templateUrl: './station-status-selector-single.component.html',
  styleUrls: ['./station-status-selector-single.component.scss']
})
export class StationStatusSelectorSingleComponent implements OnChanges {
  @Input() public label: string = 'Status';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: StationStatusEnum[];
  @Input() public selectedId!: StationStatusEnum | null| undefined;
  @Output() public selectedIdChange = new EventEmitter<StationStatusEnum | null>();

  protected options!: StationStatusEnum[];
  protected selectedOption!: StationStatusEnum | null;

  constructor() {

  }

  ngOnChanges(changes: SimpleChanges): void {

    //load options once
    if (!this.options) {
      this.options = Object.values(StationStatusEnum);
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

  protected optionDisplayFunction(option: StationStatusEnum): string {
    return StringUtils.formatEnumForDisplay(option);
  }

  protected onSelectedOptionChange(selectedOption: StationStatusEnum | null) {
    if (selectedOption) {
      this.selectedIdChange.emit(selectedOption);
    } else {
      this.selectedIdChange.emit(null);
    }

  }
}
