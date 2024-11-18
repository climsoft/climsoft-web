import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { Observable, take } from 'rxjs';
import { CreateStationModel } from 'src/app/core/models/stations/create-station.model';
import { ViewStationModel } from 'src/app/core/models/stations/view-station.model';
import { StationsCacheService } from 'src/app/core/services/stations/station-cache/stations-cache-service';
import { StationsService } from 'src/app/core/services/stations/stations.service';

interface SearchSelection {
  station: ViewStationModel;
  selected: boolean;
}

@Component({
  selector: 'app-stations-id-name-search',
  templateUrl: './stations-id-name-search.component.html',
  styleUrls: ['./stations-id-name-search.component.scss']
})
export class StationsIdNameSearchComponent implements OnChanges {

  @Input()
  public search!: string;

  @Input()
  public stationIdsSelected!: string[];

  @Output()
  public stationIdsSelectedChange = new EventEmitter<string[]>();

  protected allSelections!: SearchSelection[];

  constructor(private stationsCacheSevice: StationsCacheService) {
    this.stationsCacheSevice.fetchLatest().subscribe(data => {
      this.setup(data);
    });
  }

  private setup(stations: ViewStationModel[]): void {
    this.allSelections = stations.map(item => {
      return {
        station: item,
        selected: false
      };
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stationIdsSelection'] && this.stationIdsSelected) {
      for (const item of this.allSelections) {
        item.selected = this.stationIdsSelected.includes(item.station.id);
      }
      this.sortSelectionBySelected();
    }

    if (changes['search'] && this.search) {
      this.sortSlectionBySearchedIdName();
    }
  }


  protected onSelected(stationSelection: SearchSelection, selected: boolean): void {

    stationSelection.selected = selected;

    this.stationIdsSelected = this.allSelections.filter(item => item.selected).map(item => item.station.id);

    this.stationIdsSelectedChange.emit(this.stationIdsSelected);

    this.sortSelectionBySelected();

  }

  protected sortSelectionBySelected(): void {
    // Sort the array so that items with `selected: true` come first
    this.allSelections.sort((a, b) => {
      if (a.selected === b.selected) {
        return 0; // If both are the same (either true or false), leave their order unchanged
      }
      return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
    });
  }

  private sortSlectionBySearchedIdName(): void {
    this.allSelections.sort((a, b) => {
      // If search is found, move it before `b`, otherwise after
      if (a.station.id.toLowerCase().includes(this.search) || a.station.name.toLowerCase().includes(this.search)) {
        return -1;
      }
      return 1;
    });
  }




}
