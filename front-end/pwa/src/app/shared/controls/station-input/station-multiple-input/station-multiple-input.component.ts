import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { take } from 'rxjs';
import { CreateStationModel } from 'src/app/core/models/stations/create-station.model'; 
import { StationsService } from 'src/app/core/services/stations/stations.service';

@Component({
  selector: 'app-station-multiple-input',
  templateUrl: './station-multiple-input.component.html',
  styleUrls: ['./station-multiple-input.component.scss']
})
export class StationMultipleInputComponent implements OnInit, OnChanges {
  @Input() public label: string = 'Station';
  @Input() public placeholder!: string ;
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds: string[] = [];
  @Input() public selectedIds: string[] = [];
  @Output() public selectedIdsChange = new EventEmitter<string[]>();

  protected options!: CreateStationModel[];
  protected selectedOptions: CreateStationModel[] = [];

  constructor(private stationsSevice: StationsService) {

  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.includeOnlyIds && !this.selectedIds) {
      return;
    }

    //load the elements once
    if (!this.options || this.includeOnlyIds.length > 0) {
      this.stationsSevice.find().pipe(take(1)).subscribe(data => {

        if(this.includeOnlyIds.length > 0){
          this.options = data.filter(item => (this.includeOnlyIds.includes(item.id))) ;
        }else{
          this.options = data;
        }
       
        this.setInputSelectedOptions();
      });
    }

    this.setInputSelectedOptions();

  }

  private setInputSelectedOptions(): void {
    if (this.options && this.selectedIds.length > 0) {
      this.selectedOptions = this.options.filter(data => this.selectedIds.includes(data.id));
    }
  }

  protected optionDisplayFunction(option: CreateStationModel): string {
    return option.name;
  }

  protected onSelectedOptionsChange(selectedOptions: CreateStationModel[]) {

    this.selectedIds.length = 0;
    for (const option of selectedOptions) {
      this.selectedIds.push(option.id)
    }

    this.selectedIds = selectedOptions.map(data => data.id);
    this.selectedIdsChange.emit(this.selectedIds);
  }
}
