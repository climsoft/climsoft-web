import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';  
import { ViewStationObsFocusModel } from 'src/app/core/models/view-station-obs-focus.model';
import { StationObsEnvironmentsService } from 'src/app/core/services/station-obs-environments.service';
import { StationObsFocusesService } from 'src/app/core/services/station-obs-focuses.service';

@Component({
  selector: 'app-station-obs-focus-single-input',
  templateUrl: './station-obs-focus-single-input.component.html',
  styleUrls: ['./station-obs-focus-single-input.component.scss']
})
export class StationObservationFocusSingleInputComponent  implements OnInit, OnChanges{
  @Input() public label: string = 'Observation Focus';
  @Input() errorMessage: string = '';
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();

  protected options!: ViewStationObsFocusModel[] ;
  protected selectedOption!: ViewStationObsFocusModel | null;

  constructor(private stationObsSevice: StationObsFocusesService) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //load the elements once
    if (!this.options || (this.includeOnlyIds && this.includeOnlyIds.length>0)) { 
      this.stationObsSevice.getStationObsFocuses(this.includeOnlyIds).subscribe(data => {
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

  protected optionDisplayFunction(option: ViewStationObsFocusModel): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedOption: ViewStationObsFocusModel | null) {
    if (selectedOption) {
      this.selectedIdChange.emit(selectedOption.id);
    } else {
      this.selectedIdChange.emit(null);
    }

  }
}
