import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { ViewStationObsEnvModel } from 'src/app/core/models/view-station-obs-env.model';
import { StationObsEnvironmentsService } from 'src/app/core/services/station-obs-environments.service';

@Component({
  selector: 'app-station-obs-env-single-input',
  templateUrl: './station-obs-env-single-input.component.html',
  styleUrls: ['./station-obs-env-single-input.component.scss']
})
export class StationObsEnvSingleInputComponent implements OnInit, OnChanges {
  @Input() public label: string = 'Observation Environment';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();

  protected options!: ViewStationObsEnvModel[];
  protected selectedOption!: ViewStationObsEnvModel | null;

  constructor(private stationObsSevice: StationObsEnvironmentsService) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //load the elements once
    if (!this.options || (this.includeOnlyIds && this.includeOnlyIds.length > 0)) {
      this.stationObsSevice.getStationObsEnvironments(this.includeOnlyIds).subscribe(data => {
        this.options = data;
        this.setInputSelectedOption();
      });
    } else {
      this.setInputSelectedOption();
    }

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
    this.selectedIdChange.emit(selectedOption ? selectedOption.id : null);
  }
}
