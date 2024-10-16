import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core'; 
import { CreateStationModel } from 'src/app/core/models/stations/create-station.model'; 
import { StationsService } from 'src/app/core/services/stations/stations.service';

@Component({
  selector: 'app-station-single-input',
  templateUrl: './station-single-input.component.html',
  styleUrls: ['./station-single-input.component.scss']
})
export class StationSingleInputComponent implements OnInit, OnChanges {

  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public placeholder!: string;
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: string | null;
  @Output() public selectedIdChange = new EventEmitter<string>();

  protected options!: CreateStationModel[];
  protected selectedOption!: CreateStationModel | null;

  constructor(private stationsService: StationsService) {

  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //load the stations once. TODO. later do filter based on different conditions 
    if (!this.options || (this.includeOnlyIds && this.includeOnlyIds.length > 0)) {
      this.stationsService.find().subscribe(data => {
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

  protected optionDisplayFunction(option: CreateStationModel): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedOption: CreateStationModel | null) {
    if (selectedOption) {
      //this.selectedId = selectedOption.id;
      this.selectedIdChange.emit(selectedOption.id);
    } else {
      //this.selectedId = null;
      this.selectedIdChange.emit('');
    }

  }

}
