import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { ViewStationObsEnvModel } from 'src/app/metadata/stations/models/view-station-obs-env.model';
import { StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';

@Component({
  selector: 'app-station-environment-selector-single',
  templateUrl: './station-environment-selector-single.component.html',
  styleUrls: ['./station-environment-selector-single.component.scss']
})
export class StationEnvironmentSelectorSingleComponent implements OnInit, OnChanges {
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();

  protected options!: ViewStationObsEnvModel[];
  protected selectedOption!: ViewStationObsEnvModel | null;

  constructor(private stationsCacheService: StationsCacheService) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //load the elements once
    if (!this.options || (this.includeOnlyIds && this.includeOnlyIds.length > 0)) {
      this.setOptions();
    } else {
      this.setInputSelectedOption();
    }

  }

  // TODO. Temporary. Later convert to an observable
  private async setOptions() {
    this.options = await this.stationsCacheService.getStationObsEnv();
    this.setInputSelectedOption();
  }

  private setInputSelectedOption(): void {
    if (this.options && this.selectedId) {
      const found = this.options.find(data => data.id === this.selectedId);
      this.selectedOption = found ? found : null;
    }
  }

  protected optionDisplayFunction(option: ViewStationObsEnvModel): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedOption: ViewStationObsEnvModel | null) {
    this.selectedOption = selectedOption;
    if (selectedOption) {
      this.selectedId = selectedOption.id;
      this.selectedIdChange.emit(selectedOption.id);
    } else {
      this.selectedIdChange.emit(null);
    }
  }
}
