import { Component } from '@angular/core';
import { CreateStationModel } from '../../../core/models/stations/create-station.model';
import { ActivatedRoute, Router } from '@angular/router';
import { StationsService } from 'src/app/core/services/stations/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ViewStationModel } from 'src/app/core/models/stations/view-station.model';
import { take } from 'rxjs';
import { ViewStationsDefinition } from './view-stations.definition';
import { ViewStationQueryModel } from 'src/app/core/models/stations/view-station-query.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-view-stations',
  templateUrl: './view-stations.component.html',
  styleUrls: ['./view-stations.component.scss']
})
export class ViewStationsComponent {
  protected stationsDef: ViewStationsDefinition;
  protected activeTab: 'table' | 'map' = 'table';

  constructor(
    private pagesDataService: PagesDataService,
    private stationsService: StationsService,
    private router: Router,
    private route: ActivatedRoute) {

    this.pagesDataService.setPageHeader('Stations Metadata');
    this.stationsDef = new ViewStationsDefinition(this.stationsService);
    this.stationsDef.resetDefinitionAndEntries();
  }

  protected onTabClick(selectedTab: 'table' | 'map'): void {
    this.activeTab = selectedTab;
  }

  protected loadStations(): void {
    this.stationsDef.resetDefinitionAndEntries();
  }

  protected onImportStations(): void {
    //this.router.navigate(['import-stations'], { relativeTo: this.route.parent });
  }

  protected onEditStation(station: CreateStationModel) {
    this.router.navigate(['station-detail', station.id], { relativeTo: this.route.parent });
  }

  protected onSearch(): void {
    // TODO.
  }

  protected onSearchInput(stationQuery: ViewStationQueryModel): void {
    console.log("station query: ", stationQuery)

    this.stationsDef.resetDefinitionAndEntries(stationQuery)
  }

  protected get downloadLink(): string {
    return this.stationsService.downloadLink;
  }

}
