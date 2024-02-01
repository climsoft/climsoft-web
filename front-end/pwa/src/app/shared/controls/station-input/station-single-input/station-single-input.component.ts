import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { SourceModel } from 'src/app/core/models/source.model';
import { StationModel } from 'src/app/core/models/station.model';
import { SourcesService } from 'src/app/core/services/sources.service';
import { StationsService } from 'src/app/core/services/stations.service';

@Component({
  selector: 'app-station-single-input',
  templateUrl: './station-single-input.component.html',
  styleUrls: ['./station-single-input.component.scss']
})
export class StationSingleInputComponent implements OnInit, OnChanges {

  @Input() public label: string = 'Station';
  @Input() public errorMessage: string = '';
  @Input() public placeholder: string | null = null;
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: string | null;
  @Output() public selectedIdChange = new EventEmitter<string | null>();

  protected options!: StationModel[];
  protected selectedOption!: StationModel | null;

  constructor(private stationsService: StationsService) {

  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //load the stations once. TODO. later do filter based on different conditions 
    if (!this.options || (this.includeOnlyIds && this.includeOnlyIds.length > 0)) {
      this.stationsService.getStations().subscribe(data => {
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

  protected optionDisplayFunction(option: StationModel): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedOption: StationModel | null) {
    if (selectedOption) {
      //this.selectedId = selectedOption.id;
      this.selectedIdChange.emit(selectedOption.id);
    } else {
      //this.selectedId = null;
      this.selectedIdChange.emit(null);
    }

  }

}
