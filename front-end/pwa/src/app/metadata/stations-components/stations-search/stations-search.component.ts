import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { ViewStationQueryModel } from 'src/app/core/models/stations/view-station-query.model';
import { LocalStorageService } from '../../local-storage.service';

export type ComponentIdType = 'search_by' | 'id_name' | 'obs_method' | 'obs_environment' | 'obs_focus' | 'obs_status' | 'history';
export type SelectionModeType = 'single' | 'multiple';

@Component({
  selector: 'app-stations-search',
  templateUrl: './stations-search.component.html',
  styleUrls: ['./stations-search.component.scss']
})
export class StationsSearchComponent implements OnInit {

  @Input()
  public selectionMode!: SelectionModeType;

  @Output()
  public stationQueryChange = new EventEmitter<ViewStationQueryModel>();

  protected search: string = '';
  protected stationQuery: ViewStationQueryModel;
  protected visibleComponentId: ComponentIdType = "search_by";

  constructor(private localStorageSevice: LocalStorageService) {

    console.log('stations search created');

    this.stationQuery = {};
    // TODO. Load query histories.

  }

  ngOnInit(): void {

  }

  protected onSearchOptionSelection(option: string): void {
    switch (option) {
      case 'New':
        this.onShowComponent("search_by");
        break;
      case 'History':
        this.onShowComponent("history");
        break;
    }
  }

  protected onBack() {
    this.onShowComponent("search_by");
  }

  protected onShowComponent(visibleComponentId: ComponentIdType): void {
    this.visibleComponentId = visibleComponentId;

    // Reset the station query
    this.stationQuery = {};
  }

  protected onSearchByIdName(stationIds: string[]): void {
    this.stationQuery.stationIds = stationIds;
    this.stationQueryChange.emit(this.stationQuery);
  }


}
