import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationFormsService } from 'src/app/metadata/stations/services/station-forms.service';
import { ViewSourceModel } from 'src/app/metadata/sources/models/view-source.model';
import { StationObsProcessingMethodEnum } from 'src/app/core/models/stations/station-obs-Processing-method.enum';
import { Subject, takeUntil } from 'rxjs';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';

export interface StationView {
  station: StationCacheModel;
  forms?: ViewSourceModel[];
}

@Component({
  selector: 'app-station-form-selection',
  templateUrl: './station-form-selection.component.html',
  styleUrls: ['./station-form-selection.component.scss']
})
export class StationFormSelectionComponent implements OnDestroy {
  protected stationViews!: StationView[];
  protected allStationViews!: StationView[];
  protected stationIdSelected: string | undefined;
  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private stationsCacheService: StationsCacheService,
    private stationFormsService: StationFormsService,
    private router: Router,
    private route: ActivatedRoute) {

    this.pagesDataService.setPageHeader('Select Station');

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.allStationViews = data.filter(
        item => item.stationObsProcessingMethod === StationObsProcessingMethodEnum.MANUAL || item.stationObsProcessingMethod === StationObsProcessingMethodEnum.HYBRID
      ).map(data => {
        return { station: data }
      });

      this.stationViews = this.allStationViews;
    });

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearchInput(searchedIds: string[]): void {
    // TODO. Later change this
    this.stationViews = this.allStationViews;

    if (searchedIds.length > 0) {
      this.stationViews = this.allStationViews.filter(item => searchedIds.includes(item.station.id));
    }
  }

  protected onStationSelected(stationView: StationView): void {
    if (stationView.station.id === this.stationIdSelected) {
      this.stationIdSelected = undefined;
      return;
    }

    this.stationIdSelected = stationView.station.id;

    // No need to reload the station forms if already loaded if they have
    if (!stationView.forms) {
      this.stationFormsService.find(stationView.station.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe(data => {
        if (data) {
          stationView.forms = data;
        }
      });
    }

  }

  protected onFormClick(stationId: string, sourceId: number): void {
    this.router.navigate(['form-entry', stationId, sourceId], { relativeTo: this.route.parent });
  }

}
