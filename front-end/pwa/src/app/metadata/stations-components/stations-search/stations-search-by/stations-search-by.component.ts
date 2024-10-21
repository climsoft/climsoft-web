import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { Observable, take } from 'rxjs';
import { CreateStationModel } from 'src/app/core/models/stations/create-station.model';
import { ViewStationModel } from 'src/app/core/models/stations/view-station.model';
import { StationsCacheService } from 'src/app/core/services/stations/station-cache/stations-cache-service';
import { StationsService } from 'src/app/core/services/stations/stations.service';
import { ComponentIdType } from '../stations-search.component';

@Component({
  selector: 'app-stations-search-by',
  templateUrl: './stations-search-by.component.html',
  styleUrls: ['./stations-search-by.component.scss']
})
export class StationsSearchByComponent {

  @Output()
  public componentIdSelectionChange = new EventEmitter<ComponentIdType>();

  constructor() {

  }


  protected onShowComponent(componentId: ComponentIdType): void {
    this.componentIdSelectionChange.emit(componentId); 
  }






}
