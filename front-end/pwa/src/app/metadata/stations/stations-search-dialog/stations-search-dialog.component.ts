import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ViewStationQueryModel } from 'src/app/core/models/stations/view-station-query.model';

@Component({
  selector: 'app-stations-search-dialog',
  templateUrl: './stations-search-dialog.component.html',
  styleUrls: ['./stations-search-dialog.component.scss']
})
export class StationsSearchDialogComponent {

  @Output()
  protected stationQueryChange = new EventEmitter<ViewStationQueryModel>();

  protected stationQuery!: ViewStationQueryModel;

  protected open: boolean = false;

  public openDialog(): void {
    this.stationQuery = {};
    this.open = true;
  }

  protected onStationQueryChange(stationQuery: ViewStationQueryModel): void {
    this.stationQuery = stationQuery;
  }

  protected onOkClick(): void {
    if (this.stationQuery) {
      this.stationQueryChange.emit(this.stationQuery);
    }
  }

}
