import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core'; 
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { StationProcessingMethodEnum } from '../../models/station-processing-method.enum';

@Component({
  selector: 'app-station-obs-processing-selector-multiple',
  templateUrl: './station-obs-processing-selector-multiple.component.html',
  styleUrls: ['./station-obs-processing-selector-multiple.component.scss']
})
export class StationObsProcessingSelectorMultipleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public placeholder!: string;
  @Input() public errorMessage!: string;
  @Input() public selectedIds: StationProcessingMethodEnum[] = [];
  @Output() public selectedIdsChange = new EventEmitter<StationProcessingMethodEnum[]>();

  protected stationObsProcessing: StationProcessingMethodEnum[] = [];
  protected selectedStationObsProcessing: StationProcessingMethodEnum[] = []; 

  constructor() {
   this.stationObsProcessing = Object.values(StationProcessingMethodEnum);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedIds']) {
      this.filterBasedOnSelectedIds();
    }
  }

  private filterBasedOnSelectedIds(): void {
    this.selectedStationObsProcessing = this.selectedIds.length > 0 ? this.stationObsProcessing.filter(item => this.selectedIds.includes(item)) : [];
  }

  protected optionDisplayFunction(option: StationProcessingMethodEnum): string {
    return StringUtils.formatEnumForDisplay(option);
  }

  /**
   * Called by the generic multiple selector.
   * @param selectedOptions 
   */
  protected onSelectedOptionsChange(selectedOptions: StationProcessingMethodEnum[]) {
    this.selectedIds.length = 0; // clear the array
    this.selectedIds.push(...selectedOptions);

    // emit the id changes
    this.selectedIdsChange.emit(this.selectedIds);
  }


}
