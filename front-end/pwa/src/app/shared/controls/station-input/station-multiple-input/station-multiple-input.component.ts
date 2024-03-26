import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { ViewElementModel } from 'src/app/core/models/view-element.model';
import { CreateUpdateStationModel } from 'src/app/core/models/create-update-station.model';
import { ElementsService } from 'src/app/core/services/elements.service';
import { StationsService } from 'src/app/core/services/stations.service';

@Component({
  selector: 'app-station-multiple-input',
  templateUrl: './station-multiple-input.component.html',
  styleUrls: ['./station-multiple-input.component.scss']
})
export class StationMultipleInputComponent implements OnInit, OnChanges {
  @Input() public label: string = 'Station';
  @Input() public placeholder: string | null = null;
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds: string[] = [];
  @Input() public selectedIds: string[] = [];
  @Output() public selectedIdsChange = new EventEmitter<string[]>();

  protected options!: CreateUpdateStationModel[];
  protected selectedOptions: CreateUpdateStationModel[] = [];

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
      this.stationsSevice.getStations(this.includeOnlyIds).subscribe(data => {
        this.options = data;
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

  protected optionDisplayFunction(option: CreateUpdateStationModel): string {
    return option.name;
  }

  protected onSelectedOptionsChange(selectedOptions: CreateUpdateStationModel[]) {

    this.selectedIds.length = 0;
    for (const option of selectedOptions) {
      this.selectedIds.push(option.id)
    }

    this.selectedIds = selectedOptions.map(data => data.id);
    this.selectedIdsChange.emit(this.selectedIds);
  }
}
