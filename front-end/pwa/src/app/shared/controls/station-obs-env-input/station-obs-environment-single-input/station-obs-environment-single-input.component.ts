import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core'; 
import { ViewStationObsEnvironmentModel } from 'src/app/core/models/view-station-obs-environment.model'; 
import { StationObsEnvironmentsService } from 'src/app/core/services/station-obs-environments.service';

@Component({
  selector: 'app-station-obs-environment-single-input',
  templateUrl: './station-obs-environment-single-input.component.html',
  styleUrls: ['./station-obs-environment-single-input.component.scss']
})
export class StationObsEnvironmentSingleInputComponent  implements OnInit, OnChanges {
  @Input() public label: string = 'Observation Environment';
  @Input() errorMessage: string = '';
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();

  protected options!: ViewStationObsEnvironmentModel[] ;
  protected selectedOption!: ViewStationObsEnvironmentModel | null;

  constructor(private stationObsSevice: StationObsEnvironmentsService) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //load the elements once
    if (!this.options || (this.includeOnlyIds && this.includeOnlyIds.length>0)) { 
      this.stationObsSevice.getStationObsEnvironments(this.includeOnlyIds).subscribe(data => {
        this.options = data;
        this.setInputSelectedOption();
      });
    }else{
      this.setInputSelectedOption();
    }
 
  }

  private setInputSelectedOption(): void {
    if (this.options && this.selectedId) {
      const found = this.options.find(data => data.id === this.selectedId);
      this.selectedOption = found ? found : null;
    }
  }

  protected optionDisplayFunction(option: ViewStationObsEnvironmentModel): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedOption: ViewStationObsEnvironmentModel | null) {
    if (selectedOption) {
      this.selectedIdChange.emit(selectedOption.id);
    } else {
      this.selectedIdChange.emit(null);
    }

  }
}
