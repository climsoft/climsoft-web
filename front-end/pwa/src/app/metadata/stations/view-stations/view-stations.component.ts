import { Component } from '@angular/core';
import { CreateStationModel } from '../../../core/models/stations/create-station.model';
import { ActivatedRoute, Router } from '@angular/router';
import { StationsService } from 'src/app/core/services/stations/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache-service';

@Component({
  selector: 'app-view-stations',
  templateUrl: './view-stations.component.html',
  styleUrls: ['./view-stations.component.scss']
})
export class ViewStationsComponent {
  protected activeTab: 'table' | 'map' = 'table';
  private allStations!: StationCacheModel[]; 
  protected stations!: StationCacheModel[]; 
  private searchedIds!: string[];

  constructor(
    private pagesDataService: PagesDataService,
    private stationsCacheService: StationsCacheService,
    private stationsService: StationsService,
    private router: Router,
    private route: ActivatedRoute) {

    this.pagesDataService.setPageHeader('Stations Metadata');

    this.stationsCacheService.cachedStations.subscribe(stations => {
      this.allStations = stations;
      this.filterBasedOnSearchedIds();
    });
  }


 
  protected onTabClick(selectedTab: 'table' | 'map'): void {
    this.activeTab = selectedTab;
  }

  protected onNewStation(): void {
    //this.checkForUpdates();
    //this.stationsDef.resetDefinitionAndEntries();
  }

  protected onImportStations(): void {
    //this.checkForUpdates();
    //this.stationsDef.resetDefinitionAndEntries();
  }

  protected onEditStation(station: CreateStationModel) {
    this.router.navigate(['station-detail', station.id], { relativeTo: this.route.parent });
  }

  protected onSearchInput(searchedIds: string[]): void {
    this.searchedIds = searchedIds;
    this.filterBasedOnSearchedIds();
  }

  private filterBasedOnSearchedIds(): void{
    this.stations = this.searchedIds && this.searchedIds.length > 0? this.allStations.filter( item => this.searchedIds.includes(item.id)): this.allStations;
  }

  protected get downloadLink(): string {
    return this.stationsService.downloadLink;
  }

}
