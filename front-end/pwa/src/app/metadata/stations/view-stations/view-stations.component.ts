import { Component, OnDestroy } from '@angular/core';
import { CreateStationModel } from '../../../core/models/stations/create-station.model';
import { ActivatedRoute, Router } from '@angular/router';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-view-stations',
  templateUrl: './view-stations.component.html',
  styleUrls: ['./view-stations.component.scss']
})
export class ViewStationsComponent implements OnDestroy{
  protected activeTab: 'table' | 'map' = 'table';
  private allStations!: StationCacheModel[]; 
  protected stations!: StationCacheModel[]; 
  private searchedIds!: string[];
  private destroy$ = new Subject<void>();

  protected optionClicked: 'Add'|'Import' |'Download' | undefined;
 
  constructor(
    private pagesDataService: PagesDataService,
    private stationsCacheService: StationsCacheService, 
    private router: Router,
    private route: ActivatedRoute) {

    this.pagesDataService.setPageHeader('Stations Metadata');

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(stations => {
      this.allStations = stations;
      this.filterBasedOnSearchedIds();
    });
  }


  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onTabClick(selectedTab: 'table' | 'map'): void {
    this.activeTab = selectedTab;
  }

  protected onSearchInput(searchedIds: string[]): void {
    this.searchedIds = searchedIds;
    this.filterBasedOnSearchedIds();
  }

  protected onOptionsClick(option: 'Add'|'Import' |'Download'): void{
    this.optionClicked = option;
  }

  protected onOptionsDialogClosed(){
    this.optionClicked =  undefined;
  }

  private filterBasedOnSearchedIds(): void{
    this.stations = this.searchedIds && this.searchedIds.length > 0? this.allStations.filter( item => this.searchedIds.includes(item.id)): this.allStations;
  }

  protected onEditStation(station: CreateStationModel) {
    this.router.navigate(['station-detail', station.id], { relativeTo: this.route.parent });
  }

  protected get downloadLink(): string {
    return this.stationsCacheService.downloadLink;
  }

}
