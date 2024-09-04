import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { Observable, take } from 'rxjs';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { CreateStationModel } from 'src/app/core/models/stations/create-station.model';
import { ViewStationModel } from 'src/app/core/models/stations/view-station.model';
import { ElementsService } from 'src/app/core/services/elements/elements.service';
import { StationsService } from 'src/app/core/services/stations/stations.service';

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

  protected options!: ViewStationModel[];
  protected selectedOptions: ViewStationModel[] = [];

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
      const subscription: Observable<ViewStationModel[]> = this.includeOnlyIds.length > 0 ? this.stationsSevice.findSome(this.includeOnlyIds) : this.stationsSevice.findAll();

      subscription.pipe(take(1)).subscribe(data => {
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
