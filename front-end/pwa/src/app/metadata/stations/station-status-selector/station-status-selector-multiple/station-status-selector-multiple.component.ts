import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { StationStatusEnum } from '../../models/station-status.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-station-status-selector-multiple',
  templateUrl: './station-status-selector-multiple.component.html',
  styleUrls: ['./station-status-selector-multiple.component.scss']
})
export class StationStatusSelectorMultipleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public placeholder!: string;
  @Input() public errorMessage!: string;
  @Input() public selectedIds: StationStatusEnum[] = [];
  @Output() public selectedIdsChange = new EventEmitter<StationStatusEnum[]>();

  protected stationStatuses: StationStatusEnum[] = [];
  protected selectedStationStatuses: StationStatusEnum[] = []; 

  constructor() {
   this.stationStatuses = Object.values(StationStatusEnum);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedIds']) {
      this.filterBasedOnSelectedIds();
    }
  }

  private filterBasedOnSelectedIds(): void {
    this.selectedStationStatuses = this.selectedIds.length > 0 ? this.stationStatuses.filter(item => this.selectedIds.includes(item)) : [];
  }

  protected optionDisplayFunction(option: StationStatusEnum): string {
    return StringUtils.formatEnumForDisplay(option);
  }

  /**
   * Called by the generic multiple selector.
   * @param selectedOptions 
   */
  protected onSelectedOptionsChange(selectedOptions: StationStatusEnum[]) {
    this.selectedIds.length = 0; // clear the array
    this.selectedIds.push(...selectedOptions);

    // emit the id changes
    this.selectedIdsChange.emit(this.selectedIds);
  }


}
