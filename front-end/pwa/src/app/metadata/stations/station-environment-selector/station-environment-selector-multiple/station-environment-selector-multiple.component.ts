import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { StationsCacheService } from '../../services/stations-cache.service';
import { ViewStationObsEnvModel } from '../../models/view-station-obs-env.model';

@Component({
  selector: 'app-station-environment-selector-multiple',
  templateUrl: './station-environment-selector-multiple.component.html',
  styleUrls: ['./station-environment-selector-multiple.component.scss']
})
export class StationEnvironmentSelectorMultipleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public placeholder!: string;
  @Input() public errorMessage!: string;
  @Input() public selectedIds: number[] = [];
  @Output() public selectedIdsChange = new EventEmitter<number[]>();

  protected stationEnvironments: ViewStationObsEnvModel[] = [];
  protected selectedStationEnvironments: ViewStationObsEnvModel[] = [];

  constructor(private stationsCacheService: StationsCacheService) {
    this.setStationEnvironments();
  }

  private async setStationEnvironments() {
    this.stationEnvironments = await this.stationsCacheService.getStationObsEnv();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedIds']) {
      this.filterBasedOnSelectedIds();
    }
  }

  private filterBasedOnSelectedIds(): void {
    this.selectedStationEnvironments = this.selectedIds.length > 0 ? this.stationEnvironments.filter(item => this.selectedIds.includes(item.id)) : [];
  }

  protected optionDisplayFunction(option: ViewStationObsEnvModel): string {
    return `${option.name}`;
  }

  /**
   * Called by the generic multiple selector.
   * @param selectedOptions 
   */
  protected onSelectedOptionsChange(selectedOptions: ViewStationObsEnvModel[]) {
    this.selectedIds.length = 0; // clear the array
    this.selectedIds.push(...selectedOptions.map(data => data.id));

    // emit the id changes
    this.selectedIdsChange.emit(this.selectedIds);
  }


}
