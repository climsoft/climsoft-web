import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, } from '@angular/core';
import { StationsCacheService } from '../../services/stations-cache.service'; 
import { ViewStationObsFocusModel } from '../../models/view-station-obs-focus.model';

@Component({
  selector: 'app-station-focus-selector-multiple',
  templateUrl: './station-focus-selector-multiple.component.html',
  styleUrls: ['./station-focus-selector-multiple.component.scss']
})
export class StationFocusSelectorMultipleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public placeholder!: string;
  @Input() public errorMessage!: string;
  @Input() public selectedIds: number[] = [];
  @Output() public selectedIdsChange = new EventEmitter<number[]>();

  protected stationFocus: ViewStationObsFocusModel[] = [];
  protected selectedStationFocus: ViewStationObsFocusModel[] = []; 

  constructor(private stationsCacheService: StationsCacheService) {
    this.setStationFocus();
  }

   private async setStationFocus() {
    this.stationFocus = await this.stationsCacheService.getStationObsFocus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedIds']) {
      this.filterBasedOnSelectedIds();
    }
  }

  private filterBasedOnSelectedIds(): void {
    this.selectedStationFocus = this.selectedIds.length > 0 ? this.stationFocus.filter(item => this.selectedIds.includes(item.id)) : [];
  }

  protected optionDisplayFunction(option: ViewStationObsFocusModel): string {
    return `${option.name}`;
  }

  /**
   * Called by the generic multiple selector.
   * @param selectedOptions 
   */
  protected onSelectedOptionsChange(selectedOptions: ViewStationObsFocusModel[]) {
    this.selectedIds.length = 0; // clear the array
    this.selectedIds.push(...selectedOptions.map(data => data.id));

    // emit the id changes
    this.selectedIdsChange.emit(this.selectedIds);
  }


}
